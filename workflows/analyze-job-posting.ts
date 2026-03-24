import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModel } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { createGatewayLanguageModel } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { mergeJobPostingPartial } from '@/lib/services/job-posting-analysis-merge';
import {
  jobPostingAnalysisSchema,
  type JobPostingAnalysis,
  jobPostingExecutiveSchema,
  jobPostingKeyPointsBlockSchema,
} from '@/lib/schema';
import { buildJobPostingAnalysisUserContent } from '@/lib/services/job-posting-analysis.service';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY, type TaskKey } from '@/lib/llm/task-keys';
import type {
  JobPostingAnalysisBranch,
  JobPostingAnalysisStreamMeta,
} from '@/lib/types/job-posting-analysis-stream';
import { hashJobDescription } from '@/lib/utils/job-description-hash';
import { normalizeSkillKey } from '@/lib/utils/skill-key';

function sortKeyPoints(analysis: JobPostingAnalysis): JobPostingAnalysis {
  const sorted = [...analysis.keyPoints].sort((a, b) => a.importanceRank - b.importanceRank);
  return {
    ...analysis,
    keyPoints: sorted.map((kp) => ({
      ...kp,
      canonicalSkillKey:
        kp.aspect === 'technical' && kp.canonicalSkillKey
          ? normalizeSkillKey(kp.canonicalSkillKey)
          : undefined,
    })),
  };
}

async function fetchAndAnalyze(missionId: string) {
  'use step';

  const supabase = getSupabase();

  const { data: mission, error: fetchError } = await supabase
    .from('missions')
    .select('id, org_id, job_description, job_analysis_workflow_run_id')
    .eq('id', missionId)
    .single();

  if (fetchError || !mission) throw new Error('Mission introuvable');

  const jobDescription = mission.job_description as string;
  if (!jobDescription?.trim()) throw new Error('Fiche de poste vide');

  const userContent = buildJobPostingAnalysisUserContent(jobDescription);

  const workflowRunId = (mission.job_analysis_workflow_run_id as string | null) ?? null;
  const missionRowId = mission.id as string;

  const startTime = Date.now();
  const encoder = new TextEncoder();
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  let chunkIndex = 0;

  const acc: Partial<JobPostingAnalysis> = {};
  const activeBranches = new Set<JobPostingAnalysisBranch>();

  let lock = Promise.resolve();
  const runLocked = (fn: () => Promise<void>) => {
    const next = lock.then(fn, fn);
    lock = next.catch(() => {});
    return next;
  };

  const emit = async () => {
    const snapshot = { ...acc };
    const meta: JobPostingAnalysisStreamMeta = {
      phase: 'extracting',
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
    branch: JobPostingAnalysisBranch,
    taskKey: TaskKey,
    gatewayModelId: string,
    orgId: string | null,
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
        mergeJobPostingPartial(acc, partial as Partial<JobPostingAnalysis>);
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
      missionId: missionRowId,
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
    const orgId = mission.org_id as string | null;
    const [rEx, rKp] = await Promise.all([
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.MISSION_JOB_POSTING_EXECUTIVE,
        orgId,
        context: {},
      }),
      resolveLlmTask(supabase, {
        taskKey: TASK_KEY.MISSION_JOB_POSTING_KEY_POINTS,
        orgId,
        context: {},
      }),
    ]);

    await Promise.all([
      consumeBranch(
        createGatewayLanguageModel(rEx.gatewayModelId, rEx.useExtractJson),
        rEx.systemPrompt,
        jobPostingExecutiveSchema,
        'job_posting_executive',
        'executive',
        TASK_KEY.MISSION_JOB_POSTING_EXECUTIVE,
        rEx.gatewayModelId,
        orgId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rKp.gatewayModelId, rKp.useExtractJson),
        rKp.systemPrompt,
        jobPostingKeyPointsBlockSchema,
        'job_posting_key_points',
        'keyPoints',
        TASK_KEY.MISSION_JOB_POSTING_KEY_POINTS,
        rKp.gatewayModelId,
        orgId,
      ),
    ]);

    await runLocked(async () => {
      const meta: JobPostingAnalysisStreamMeta = { phase: 'finalizing', activeBranches: [] };
      await writer.write(
        encoder.encode(JSON.stringify({ index: chunkIndex++, data: { ...acc }, meta }) + '\n'),
      );
    });

    const parsed = jobPostingAnalysisSchema.safeParse(acc);
    const object: JobPostingAnalysis | Partial<JobPostingAnalysis> = parsed.success
      ? sortKeyPoints(parsed.data)
      : acc;
    if (!parsed.success) {
      console.warn('Job posting analysis schema warning:', parsed.error.flatten());
    }

    const durationMs = Date.now() - startTime;

    return {
      object,
      durationMs,
      orgId: mission.org_id as string | null,
      inputHash: hashJobDescription(jobDescription),
    };
  } finally {
    writer.releaseLock();
  }
}

async function saveJobPostingAnalysis(
  missionId: string,
  result: {
    object: unknown;
    durationMs: number;
    orgId: string | null;
    inputHash: string;
  },
) {
  'use step';

  const supabase = getSupabase();

  if (result.object != null && typeof result.object === 'object') {
    await supabase
      .from('missions')
      .update({
        job_analysis: result.object,
        job_analysis_input_hash: result.inputHash,
        job_analysis_workflow_run_id: null,
      })
      .eq('id', missionId);
  }

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

export async function analyzeJobPostingWorkflow(missionId: string) {
  'use workflow';

  const result = await fetchAndAnalyze(missionId);
  await saveJobPostingAnalysis(missionId, result);
  return result.object;
}
