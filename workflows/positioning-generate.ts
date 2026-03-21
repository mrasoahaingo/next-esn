import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModel, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { createGatewayLanguageModel } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { aggregateLanguageModelUsage } from '@/lib/services/extraction-merge';
import {
  mergePositioningOutputPartial,
  type PositioningGenerateAccumulator,
} from '@/lib/services/positioning-generate-merge';
import {
  positioningOutputSchema,
  type ExtractedCV,
  type PositioningAnalysis,
  type PositioningOutput,
  positioningTailoredCvPartSchema,
  positioningEmailPartSchema,
  positioningEmailFirstContactPartSchema,
  positioningEmailBulletPointsPartSchema,
  positioningCandidateEmailPartSchema,
} from '@/lib/schema';
import { buildGenerateUserContent } from '@/lib/services/positioning.service';
import { getOrganizationSettings, toPositioningPromptBranding } from '@/lib/utils/org-settings';
import type {
  PositioningGenerateBranch,
  PositioningGenerateStreamMeta,
} from '@/lib/types/positioning-generate-stream';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY } from '@/lib/llm/task-keys';

async function fetchAndGenerate(positioningId: string, answers: Record<string, string>) {
  'use step';

  const supabase = getSupabase();

  const { data: positioning, error: fetchError } = await supabase
    .from('positionings')
    .select('*, candidates(*)')
    .eq('id', positioningId)
    .single();

  if (fetchError || !positioning) throw new Error('Positioning not found');

  const candidate = positioning.candidates;
  if (!candidate?.extracted_data) throw new Error('CV not extracted yet');
  if (!positioning.analysis) throw new Error('Analysis not done yet');

  const cv = candidate.extracted_data as ExtractedCV;
  const jobDescription = positioning.job_description as string;
  const analysis = positioning.analysis as PositioningAnalysis;

  const orgId = positioning.org_id as string | null | undefined;
  const orgSettings = orgId ? await getOrganizationSettings(orgId) : null;
  const branding = toPositioningPromptBranding(orgSettings);
  const brandCtx = {
    displayName: branding.displayName,
    brandContextBlock: branding.brandContextBlock,
  };

  const userContent = buildGenerateUserContent(cv, jobDescription, analysis, answers ?? {});

  const startTime = Date.now();
  const encoder = new TextEncoder();
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  let chunkIndex = 0;

  const acc: PositioningGenerateAccumulator = {};
  const activeBranches = new Set<PositioningGenerateBranch>();

  let lock = Promise.resolve();
  const runLocked = (fn: () => Promise<void>) => {
    const next = lock.then(fn, fn);
    lock = next.catch(() => {});
    return next;
  };

  const emit = async () => {
    const snapshot = { ...acc };
    const meta: PositioningGenerateStreamMeta = {
      phase: 'generating',
      activeBranches: [...activeBranches],
    };
    await writer.write(
      encoder.encode(JSON.stringify({ index: chunkIndex++, data: snapshot, meta }) + '\n'),
    );
  };

  async function consumeBranch<T>(
    languageModel: LanguageModel,
    system: string,
    schema: FlexibleSchema<T>,
    outputName: string,
    branch: PositioningGenerateBranch,
  ): Promise<LanguageModelUsage> {
    const result = streamText({
      model: languageModel,
      system,
      messages: [{ role: 'user', content: userContent }],
      output: Output.object({ schema, name: outputName }),
    });

    let branchStarted = false;

    for await (const partial of result.partialOutputStream) {
      await runLocked(async () => {
        if (!branchStarted) {
          branchStarted = true;
          activeBranches.add(branch);
        }
        mergePositioningOutputPartial(acc, partial as Partial<PositioningOutput>);
        await emit();
      });
    }

    await runLocked(async () => {
      activeBranches.delete(branch);
      await emit();
    });

    return await result.usage;
  }

  const usages: LanguageModelUsage[] = [];

  try {
    const [rTc, rEm, rFc, rBp, rCe] = await Promise.all([
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_GENERATE_TAILORED_CV,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_GENERATE_EMAIL,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_GENERATE_EMAIL_FIRST_CONTACT,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_GENERATE_EMAIL_BULLETS,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_GENERATE_CANDIDATE_EMAIL,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
    ]);

    const parallelUsages = await Promise.all([
      consumeBranch(
        createGatewayLanguageModel(rTc.gatewayModelId, rTc.useExtractJson),
        rTc.systemPrompt,
        positioningTailoredCvPartSchema,
        'positioning_tailored_cv',
        'tailoredCv',
      ),
      consumeBranch(
        createGatewayLanguageModel(rEm.gatewayModelId, rEm.useExtractJson),
        rEm.systemPrompt,
        positioningEmailPartSchema,
        'positioning_email',
        'email',
      ),
      consumeBranch(
        createGatewayLanguageModel(rFc.gatewayModelId, rFc.useExtractJson),
        rFc.systemPrompt,
        positioningEmailFirstContactPartSchema,
        'positioning_email_first_contact',
        'emailFirstContact',
      ),
      consumeBranch(
        createGatewayLanguageModel(rBp.gatewayModelId, rBp.useExtractJson),
        rBp.systemPrompt,
        positioningEmailBulletPointsPartSchema,
        'positioning_email_bullet_points',
        'emailBulletPoints',
      ),
      consumeBranch(
        createGatewayLanguageModel(rCe.gatewayModelId, rCe.useExtractJson),
        rCe.systemPrompt,
        positioningCandidateEmailPartSchema,
        'positioning_candidate_email',
        'candidateEmail',
      ),
    ]);
    usages.push(...parallelUsages);

    const parsed = positioningOutputSchema.safeParse(acc);
    const object = parsed.success ? parsed.data : acc;

    if (!parsed.success) {
      console.warn('Positioning output schema validation warning:', parsed.error.flatten());
    }

    const durationMs = Date.now() - startTime;

    return {
      object,
      usage: aggregateLanguageModelUsage(usages),
      durationMs,
      candidateId: positioning.candidate_id,
      orgId: positioning.org_id as string | null,
    };
  } finally {
    writer.releaseLock();
  }
}

async function saveGeneration(
  positioningId: string,
  result: {
    object: {
      tailoredCv?: unknown;
      email?: unknown;
      emailFirstContact?: unknown;
      emailBulletPoints?: unknown;
      candidateEmail?: unknown;
    };
    usage: LanguageModelUsage;
    durationMs: number;
    candidateId: string;
    orgId: string | null;
  },
) {
  'use step';

  const supabase = getSupabase();
  const resolvedLog = await resolveLlmTask(supabase, {
    taskKey: TASK_KEY.POSITIONING_GENERATE_TAILORED_CV,
    orgId: result.orgId,
    context: { displayName: '', brandContextBlock: '' },
  });

  await logAiUsage(supabase, {
    operation: 'generation',
    positioningId,
    candidateId: result.candidateId,
    orgId: result.orgId ?? undefined,
    aiModel: resolvedLog.gatewayModelId,
    taskKey: TASK_KEY.POSITIONING_GENERATE_TAILORED_CV,
    durationMs: result.durationMs,
    usage: result.usage,
  });

  if (result.object) {
    await supabase
      .from('positionings')
      .update({
        tailored_cv: result.object.tailoredCv,
        email: result.object.email,
        email_first_contact: result.object.emailFirstContact,
        email_bullet_points: result.object.emailBulletPoints,
        candidate_email: result.object.candidateEmail,
        status: 'generated',
        ai_generation_duration_ms: result.durationMs,
        workflow_run_id: null,
      })
      .eq('id', positioningId);
  }

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

export async function positioningGenerateWorkflow(positioningId: string, answers: Record<string, string>) {
  'use workflow';

  const result = await fetchAndGenerate(positioningId, answers);
  await saveGeneration(positioningId, result);
  return result.object;
}
