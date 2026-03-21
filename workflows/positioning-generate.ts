import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { extractionModel, modelName } from '@/lib/ai';
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
import {
  buildPositioningGenerateTailoredCvSystemPrompt,
  buildPositioningGenerateEmailSystemPrompt,
  buildPositioningGenerateEmailFirstContactSystemPrompt,
  buildPositioningGenerateEmailBulletPointsSystemPrompt,
  buildPositioningGenerateCandidateEmailSystemPrompt,
  buildGenerateUserContent,
} from '@/lib/services/positioning.service';
import { getOrganizationSettings, toPositioningPromptBranding } from '@/lib/utils/org-settings';
import type {
  PositioningGenerateBranch,
  PositioningGenerateStreamMeta,
} from '@/lib/types/positioning-generate-stream';

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
    system: string,
    schema: FlexibleSchema<T>,
    outputName: string,
    branch: PositioningGenerateBranch,
  ): Promise<LanguageModelUsage> {
    const result = streamText({
      model: extractionModel,
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
    const parallelUsages = await Promise.all([
      consumeBranch(
        buildPositioningGenerateTailoredCvSystemPrompt(branding),
        positioningTailoredCvPartSchema,
        'positioning_tailored_cv',
        'tailoredCv',
      ),
      consumeBranch(
        buildPositioningGenerateEmailSystemPrompt(branding),
        positioningEmailPartSchema,
        'positioning_email',
        'email',
      ),
      consumeBranch(
        buildPositioningGenerateEmailFirstContactSystemPrompt(branding),
        positioningEmailFirstContactPartSchema,
        'positioning_email_first_contact',
        'emailFirstContact',
      ),
      consumeBranch(
        buildPositioningGenerateEmailBulletPointsSystemPrompt(branding),
        positioningEmailBulletPointsPartSchema,
        'positioning_email_bullet_points',
        'emailBulletPoints',
      ),
      consumeBranch(
        buildPositioningGenerateCandidateEmailSystemPrompt(branding),
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

  await logAiUsage(supabase, {
    operation: 'generation',
    positioningId,
    candidateId: result.candidateId,
    orgId: result.orgId ?? undefined,
    aiModel: modelName,
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
