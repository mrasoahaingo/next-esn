import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModel } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { createGatewayLanguageModel } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import {
  mergePositioningOutputPartial,
  type PositioningGenerateAccumulator,
} from '@/lib/services/positioning-generate-merge';
import {
  positioningOutputSchema,
  jobPostingAnalysisSchema,
  type ExtractedCV,
  type JobPostingAnalysis,
  type PositioningAnalysis,
  type PositioningOutput,
  positioningTailoredCvPartSchema,
  positioningEmailPartSchema,
  positioningEmailFirstContactPartSchema,
  positioningEmailBulletPointsPartSchema,
  positioningCandidateEmailPartSchema,
  positioningExpertiseConfirmationsPartSchema,
} from '@/lib/schema';
import {
  buildGenerateUserContent,
  buildMissionPositionHeadline,
  normalizeStoredExpertisePrompts,
  parsePositioningAnswers,
} from '@/lib/services/positioning.service';
import { withMandatoryJobPostingLists } from '@/lib/services/job-posting-analysis.service';
import { mergeMatchingWeights } from '@/lib/config/matching-weights';
import { getOrganizationSettings, toPositioningPromptBranding } from '@/lib/utils/org-settings';
import type {
  PositioningGenerateBranch,
  PositioningGenerateStreamMeta,
} from '@/lib/types/positioning-generate-stream';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY, type TaskKey } from '@/lib/llm/task-keys';

async function fetchAndGenerate(positioningId: string, answers: Record<string, unknown>) {
  'use step';

  const supabase = getSupabase();

  const { data: positioning, error: fetchError } = await supabase
    .from('positionings')
    .select('*, candidates(*), missions(job_analysis, title, company)')
    .eq('id', positioningId)
    .single();

  if (fetchError || !positioning) throw new Error('Positioning not found');

  const candidate = positioning.candidates;
  if (!candidate?.extracted_data) throw new Error('CV not extracted yet');
  if (!positioning.analysis) throw new Error('Analysis not done yet');

  const cv = candidate.extracted_data as ExtractedCV;
  const jobDescription = positioning.job_description as string;
  const analysis = positioning.analysis as PositioningAnalysis;

  const missionRow = positioning.missions as
    | { job_analysis: unknown; title?: string | null; company?: string | null }
    | null
    | undefined;
  let jobAnalysis: JobPostingAnalysis | null = null;
  if (missionRow?.job_analysis != null && typeof missionRow.job_analysis === 'object') {
    const parsed = jobPostingAnalysisSchema.safeParse(missionRow.job_analysis);
    jobAnalysis = withMandatoryJobPostingLists(
      parsed.success ? parsed.data : (missionRow.job_analysis as JobPostingAnalysis),
    );
  }

  const orgId = positioning.org_id as string | null | undefined;
  const orgSettings = orgId ? await getOrganizationSettings(orgId) : null;
  const matchingWeights = mergeMatchingWeights(orgSettings?.matching_weights);
  const branding = toPositioningPromptBranding(orgSettings);
  const brandCtx = {
    displayName: branding.displayName,
    brandContextBlock: branding.brandContextBlock,
  };

  const expertisePromptsForGenerate = normalizeStoredExpertisePrompts(
    positioning.generation_expertise_prompts,
  );

  const userContent = buildGenerateUserContent(
    cv,
    jobDescription,
    analysis,
    parsePositioningAnswers(answers ?? {}),
    jobAnalysis,
    matchingWeights,
    { positionHeadline: buildMissionPositionHeadline(missionRow) },
    expertisePromptsForGenerate.length > 0 ? expertisePromptsForGenerate : null,
  );

  const workflowRunId = (positioning.workflow_run_id as string | null) ?? null;
  const positioningRowId = positioning.id as string;
  const candidateRowId = positioning.candidate_id as string;

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
    taskKey: TaskKey,
    gatewayModelId: string,
  ): Promise<void> {
    const branchStart = Date.now();
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

    const usage = await result.usage;
    const output = await result.output;

    await logAiUsage(supabase, {
      operation: 'generation',
      positioningId: positioningRowId,
      candidateId: candidateRowId,
      orgId: orgId ?? undefined,
      aiModel: gatewayModelId,
      taskKey,
      durationMs: Date.now() - branchStart,
      usage,
      inputPayload: { system, messages: [{ role: 'user', content: userContent }] },
      outputPayload: output,
      workflowRunId,
    });
  }

  try {
    const [rEc, rTc, rEm, rFc, rBp, rCe] = await Promise.all([
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_GENERATE_EXPERTISE_CONFIRMATIONS,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
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

    await Promise.all([
      consumeBranch(
        createGatewayLanguageModel(rEc.gatewayModelId, rEc.useExtractJson),
        rEc.systemPrompt,
        positioningExpertiseConfirmationsPartSchema,
        'positioning_expertise_confirmations',
        'expertiseConfirmations',
        TASK_KEY.POSITIONING_GENERATE_EXPERTISE_CONFIRMATIONS,
        rEc.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rTc.gatewayModelId, rTc.useExtractJson),
        rTc.systemPrompt,
        positioningTailoredCvPartSchema,
        'positioning_tailored_cv',
        'tailoredCv',
        TASK_KEY.POSITIONING_GENERATE_TAILORED_CV,
        rTc.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rEm.gatewayModelId, rEm.useExtractJson),
        rEm.systemPrompt,
        positioningEmailPartSchema,
        'positioning_email',
        'email',
        TASK_KEY.POSITIONING_GENERATE_EMAIL,
        rEm.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rFc.gatewayModelId, rFc.useExtractJson),
        rFc.systemPrompt,
        positioningEmailFirstContactPartSchema,
        'positioning_email_first_contact',
        'emailFirstContact',
        TASK_KEY.POSITIONING_GENERATE_EMAIL_FIRST_CONTACT,
        rFc.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rBp.gatewayModelId, rBp.useExtractJson),
        rBp.systemPrompt,
        positioningEmailBulletPointsPartSchema,
        'positioning_email_bullet_points',
        'emailBulletPoints',
        TASK_KEY.POSITIONING_GENERATE_EMAIL_BULLETS,
        rBp.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rCe.gatewayModelId, rCe.useExtractJson),
        rCe.systemPrompt,
        positioningCandidateEmailPartSchema,
        'positioning_candidate_email',
        'candidateEmail',
        TASK_KEY.POSITIONING_GENERATE_CANDIDATE_EMAIL,
        rCe.gatewayModelId,
      ),
    ]);

    const parsed = positioningOutputSchema.safeParse(acc);
    const object = parsed.success ? parsed.data : acc;

    if (!parsed.success) {
      console.warn('Positioning output schema validation warning:', parsed.error.flatten());
    }

    const durationMs = Date.now() - startTime;

    return {
      object,
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
      expertiseConfirmations?: unknown;
    };
    durationMs: number;
    candidateId: string;
    orgId: string | null;
  },
) {
  'use step';

  const supabase = getSupabase();

  if (result.object) {
    const rawEc = result.object.expertiseConfirmations;
    const expertiseStored = Array.isArray(rawEc)
      ? rawEc.map((x: { question?: string; context?: string; suggestedAnswers?: string[] }, i: number) => ({
          id: `ec-${i}`,
          question: String(x.question ?? ''),
          context: String(x.context ?? ''),
          suggestedAnswers: Array.isArray(x.suggestedAnswers)
            ? x.suggestedAnswers.map((s) => String(s)).filter(Boolean)
            : [],
        }))
      : null;

    await supabase
      .from('positionings')
      .update({
        tailored_cv: result.object.tailoredCv,
        email: result.object.email,
        email_first_contact: result.object.emailFirstContact,
        email_bullet_points: result.object.emailBulletPoints,
        candidate_email: result.object.candidateEmail,
        generation_expertise_prompts: expertiseStored,
        status: 'generated',
        ai_generation_duration_ms: result.durationMs,
        workflow_run_id: null,
      })
      .eq('id', positioningId);
  }

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

export async function positioningGenerateWorkflow(
  positioningId: string,
  answers: Record<string, unknown>,
) {
  'use workflow';

  const result = await fetchAndGenerate(positioningId, answers);
  await saveGeneration(positioningId, result);
  return result.object;
}
