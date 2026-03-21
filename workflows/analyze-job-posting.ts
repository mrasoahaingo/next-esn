import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { extractionModel, modelName } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { aggregateLanguageModelUsage } from '@/lib/services/extraction-merge';
import { mergeJobPostingPartial } from '@/lib/services/job-posting-analysis-merge';
import {
  jobPostingAnalysisSchema,
  type JobPostingAnalysis,
  jobPostingExecutiveSchema,
  jobPostingKeyPointsBlockSchema,
} from '@/lib/schema';
import {
  buildJobPostingAnalysisExecutivePrompt,
  buildJobPostingAnalysisKeyPointsPrompt,
  buildJobPostingAnalysisUserContent,
} from '@/lib/services/job-posting-analysis.service';
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
    .select('id, org_id, job_description')
    .eq('id', missionId)
    .single();

  if (fetchError || !mission) throw new Error('Mission introuvable');

  const jobDescription = mission.job_description as string;
  if (!jobDescription?.trim()) throw new Error('Fiche de poste vide');

  const userContent = buildJobPostingAnalysisUserContent(jobDescription);

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
    system: string,
    schema: FlexibleSchema<T>,
    outputName: string,
    branch: JobPostingAnalysisBranch,
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
        mergeJobPostingPartial(acc, partial as Partial<JobPostingAnalysis>);
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
        buildJobPostingAnalysisExecutivePrompt(),
        jobPostingExecutiveSchema,
        'job_posting_executive',
        'executive',
      ),
      consumeBranch(
        buildJobPostingAnalysisKeyPointsPrompt(),
        jobPostingKeyPointsBlockSchema,
        'job_posting_key_points',
        'keyPoints',
      ),
    ]);
    usages.push(...parallelUsages);

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
      usage: aggregateLanguageModelUsage(usages),
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
    usage: LanguageModelUsage;
    durationMs: number;
    orgId: string | null;
    inputHash: string;
  },
) {
  'use step';

  const supabase = getSupabase();

  await logAiUsage(supabase, {
    operation: 'analysis',
    missionId,
    orgId: result.orgId ?? undefined,
    aiModel: modelName,
    durationMs: result.durationMs,
    usage: result.usage,
  });

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
