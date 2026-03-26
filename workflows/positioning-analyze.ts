import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModel } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { createGatewayLanguageModel } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { mergePositioningPartial } from '@/lib/services/positioning-analysis-merge';
import {
  positioningAnalysisSchema,
  jobPostingAnalysisSchema,
  type PositioningAnalysis,
  type ExtractedCV,
  type JobPostingAnalysis,
  positioningSkillMatchesSchema,
  positioningExperienceRelevanceSchema,
  positioningGapsSchema,
  positioningQuestionsSchema,
  positioningSynthesisSchema,
} from '@/lib/schema';
import {
  analysisPhaseAnswersOnly,
  buildAnalysisUserContent,
  buildMissionPositionHeadline,
  buildPositioningSynthesisUserContent,
  parsePositioningAnswers,
  type PositioningAnswerStoredValue,
} from '@/lib/services/positioning.service';
import { withMandatoryJobPostingLists } from '@/lib/services/job-posting-analysis.service';
import { mergeMatchingWeights } from '@/lib/config/matching-weights';
import { getOrganizationSettings, toPositioningPromptBranding } from '@/lib/utils/org-settings';
import type {
  PositioningAnalysisBranch,
  PositioningAnalysisStreamMeta,
} from '@/lib/types/positioning-analysis-stream';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY, type TaskKey } from '@/lib/llm/task-keys';

async function fetchAndAnalyze(positioningId: string) {
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

  const cv = candidate.extracted_data as ExtractedCV;
  const jobDescription = positioning.job_description as string;

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

  const promptOptions = { positionHeadline: buildMissionPositionHeadline(missionRow) };

  const orgId = positioning.org_id as string | null | undefined;
  const orgSettings = orgId ? await getOrganizationSettings(orgId) : null;
  const matchingWeights = mergeMatchingWeights(orgSettings?.matching_weights);
  const branding = toPositioningPromptBranding(orgSettings);
  const brandCtx = {
    displayName: branding.displayName,
    brandContextBlock: branding.brandContextBlock,
  };

  const priorAnswers = analysisPhaseAnswersOnly(parsePositioningAnswers(positioning.answers));

  const userContent = buildAnalysisUserContent(
    cv,
    jobDescription,
    jobAnalysis,
    matchingWeights,
    promptOptions,
    priorAnswers,
  );

  const workflowRunId = (positioning.workflow_run_id as string | null) ?? null;
  const positioningRowId = positioning.id as string;
  const candidateRowId = positioning.candidate_id as string;

  const startTime = Date.now();
  const encoder = new TextEncoder();
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  let chunkIndex = 0;

  const acc: Partial<PositioningAnalysis> = {};
  const activeBranches = new Set<PositioningAnalysisBranch>();

  let lock = Promise.resolve();
  const runLocked = (fn: () => Promise<void>) => {
    const next = lock.then(fn, fn);
    lock = next.catch(() => {});
    return next;
  };

  const emit = async () => {
    const snapshot = { ...acc };
    const meta: PositioningAnalysisStreamMeta = {
      phase: activeBranches.has('synthesis') ? 'synthesizing' : 'extracting',
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
    branch: PositioningAnalysisBranch,
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
        mergePositioningPartial(acc, partial as Partial<PositioningAnalysis>);
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
      operation: 'analysis',
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
    const [rSk, rEx, rGa, rQu] = await Promise.all([
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_ANALYSIS_SKILLS,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_ANALYSIS_EXPERIENCES,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_ANALYSIS_GAPS,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.POSITIONING_ANALYSIS_QUESTIONS,
        orgId: orgId ?? null,
        context: brandCtx,
      }),
    ]);

    await Promise.all([
      consumeBranch(
        createGatewayLanguageModel(rSk.gatewayModelId, rSk.useExtractJson),
        rSk.systemPrompt,
        positioningSkillMatchesSchema,
        'positioning_skills',
        'skills',
        TASK_KEY.POSITIONING_ANALYSIS_SKILLS,
        rSk.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rEx.gatewayModelId, rEx.useExtractJson),
        rEx.systemPrompt,
        positioningExperienceRelevanceSchema,
        'positioning_experiences',
        'experiences',
        TASK_KEY.POSITIONING_ANALYSIS_EXPERIENCES,
        rEx.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rGa.gatewayModelId, rGa.useExtractJson),
        rGa.systemPrompt,
        positioningGapsSchema,
        'positioning_gaps',
        'gaps',
        TASK_KEY.POSITIONING_ANALYSIS_GAPS,
        rGa.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rQu.gatewayModelId, rQu.useExtractJson),
        rQu.systemPrompt,
        positioningQuestionsSchema,
        'positioning_questions',
        'questions',
        TASK_KEY.POSITIONING_ANALYSIS_QUESTIONS,
        rQu.gatewayModelId,
      ),
    ]);

    const rSyn = await resolveLlmTask(supabase, {
      taskKey: TASK_KEY.POSITIONING_ANALYSIS_SYNTHESIS,
      orgId: orgId ?? null,
      context: brandCtx,
    });

    const synthesisUserText = buildPositioningSynthesisUserContent(
      cv,
      jobDescription,
      acc,
      jobAnalysis,
      matchingWeights,
      promptOptions,
      priorAnswers,
    );
    const synStart = Date.now();
    const synthesisResult = streamText({
      model: createGatewayLanguageModel(rSyn.gatewayModelId, rSyn.useExtractJson),
      system: rSyn.systemPrompt,
      messages: [
        {
          role: 'user',
          content: synthesisUserText,
        },
      ],
      output: Output.object({ schema: positioningSynthesisSchema, name: 'positioning_synthesis' }),
    });

    let synStarted = false;
    for await (const partial of synthesisResult.partialOutputStream) {
      await runLocked(async () => {
        if (!synStarted) {
          synStarted = true;
          activeBranches.add('synthesis');
        }
        mergePositioningPartial(acc, partial as Partial<PositioningAnalysis>);
        await emit();
      });
    }

    await runLocked(async () => {
      activeBranches.delete('synthesis');
      await emit();
    });

    const synUsage = await synthesisResult.usage;
    const synOutput = await synthesisResult.output;
    await logAiUsage(supabase, {
      operation: 'analysis',
      positioningId: positioningRowId,
      candidateId: candidateRowId,
      orgId: orgId ?? undefined,
      aiModel: rSyn.gatewayModelId,
      taskKey: TASK_KEY.POSITIONING_ANALYSIS_SYNTHESIS,
      durationMs: Date.now() - synStart,
      usage: synUsage,
      inputPayload: {
        system: rSyn.systemPrompt,
        messages: [{ role: 'user', content: synthesisUserText }],
      },
      outputPayload: synOutput,
      workflowRunId,
    });

    const parsed = positioningAnalysisSchema.safeParse(acc);
    const object = parsed.success ? parsed.data : acc;

    if (!parsed.success) {
      console.warn('Positioning analysis schema validation warning:', parsed.error.flatten());
    }

    const durationMs = Date.now() - startTime;

    return {
      object,
      durationMs,
      candidateId: positioning.candidate_id,
      orgId: positioning.org_id as string | null,
      analysisRecruiterAnswers: priorAnswers,
    };
  } finally {
    writer.releaseLock();
  }
}

async function saveAnalysis(
  positioningId: string,
  result: {
    object: unknown;
    durationMs: number;
    candidateId: string;
    orgId: string | null;
    analysisRecruiterAnswers: Record<string, PositioningAnswerStoredValue>;
  },
) {
  'use step';

  const supabase = getSupabase();

  if (result.object) {
    await supabase
      .from('positionings')
      .update({
        analysis: result.object,
        status: 'analyzed',
        ai_analysis_duration_ms: result.durationMs,
        workflow_run_id: null,
        analysis_recruiter_answers: result.analysisRecruiterAnswers,
      })
      .eq('id', positioningId);
  }

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

export async function positioningAnalyzeWorkflow(positioningId: string) {
  'use workflow';

  const result = await fetchAndAnalyze(positioningId);
  await saveAnalysis(positioningId, result);
  return result.object;
}
