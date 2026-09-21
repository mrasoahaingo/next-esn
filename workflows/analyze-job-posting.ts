import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModel, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { createGatewayLanguageModel, llmFactualGenerationSettings } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { mergeJobPostingPartial } from '@/lib/services/job-posting-analysis-merge';
import {
  jobPostingAnalysisSchema,
  type JobPostingAnalysis,
  jobPostingExecutiveSchema,
  jobPostingKeyPointsBlockSchema,
} from '@/lib/schema';
import {
  buildJobPostingAnalysisUserContent,
  withMandatoryJobPostingLists,
} from '@/lib/services/job-posting-analysis.service';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY, type TaskKey } from '@/lib/llm/task-keys';
import type {
  JobPostingAnalysisBranch,
  JobPostingAnalysisStreamMeta,
} from '@/lib/types/job-posting-analysis-stream';
import type { PositioningAnalysisModelsSnapshot } from '@/lib/types/positioning-analysis-models';
import { workflowLastErrorSchema } from '@/lib/types/workflow-last-error';
import { attachWorkflowStepKey, readWorkflowStepKey } from '@/lib/utils/workflow-step-error';
import { hashJobDescription } from '@/lib/utils/job-description-hash';
import { normalizeSkillKey } from '@/lib/utils/skill-key';
import { sanitizeForJsonb, type JsonbSanitizeMeta } from '@/lib/utils/pg-jsonb-safe';

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
    const sharedInput = { system, messages: [{ role: 'user', content: userContent }] };

    try {
      const result = streamText({
        ...llmFactualGenerationSettings,
        temperature: 0.1,
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
          mergeJobPostingPartial(acc, partial as Partial<JobPostingAnalysis>, branch);
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
        inputPayload: sharedInput,
        outputPayload: output,
        workflowRunId,
        callStatus: 'completed',
        branch,
      });
    } catch (err) {
      const tagged = attachWorkflowStepKey(err, branch);
      const message = tagged.message;
      await logAiUsage(supabase, {
        operation: 'analysis',
        missionId: missionRowId,
        orgId: orgId ?? undefined,
        aiModel: gatewayModelId,
        taskKey,
        durationMs: Date.now() - branchStart,
        usage: {} as LanguageModelUsage,
        inputPayload: sharedInput,
        outputPayload: { error: message },
        workflowRunId,
        callStatus: 'failed',
        branch,
      });
      throw tagged;
    }
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

    const finalized = withMandatoryJobPostingLists({ ...acc });

    await runLocked(async () => {
      const meta: JobPostingAnalysisStreamMeta = { phase: 'finalizing', activeBranches: [] };
      await writer.write(
        encoder.encode(JSON.stringify({ index: chunkIndex++, data: finalized, meta }) + '\n'),
      );
    });

    const parsed = jobPostingAnalysisSchema.safeParse(finalized);
    const object: JobPostingAnalysis | Partial<JobPostingAnalysis> = parsed.success
      ? withMandatoryJobPostingLists(sortKeyPoints(parsed.data))
      : finalized;
    if (!parsed.success) {
      console.warn('Job posting analysis schema warning:', parsed.error.flatten());
    }

    const durationMs = Date.now() - startTime;

    const modelsSnapshot: PositioningAnalysisModelsSnapshot = {
      byTask: {
        [TASK_KEY.MISSION_JOB_POSTING_EXECUTIVE]: rEx.gatewayModelId,
        [TASK_KEY.MISSION_JOB_POSTING_KEY_POINTS]: rKp.gatewayModelId,
      },
      uniqueModels: Array.from(
        new Set([rEx.gatewayModelId, rKp.gatewayModelId]),
      ).sort((a, b) => a.localeCompare(b)),
    };

    let persisted = false;

    if (object != null && typeof object === 'object') {
      // Assainissement AVANT écriture : un NUL ou un surrogate isolé produit par le
      // modèle ferait échouer l'update jsonb et perdrait toute l'analyse de fiche.
      const sanitizeMeta: JsonbSanitizeMeta = { removedChars: 0, paths: [] };
      const safeObject = sanitizeForJsonb(object, sanitizeMeta);
      const safeModelsSnapshot = sanitizeForJsonb(modelsSnapshot, sanitizeMeta);

      const { error: updateError } = await supabase
        .from('missions')
        .update({
          job_analysis: safeObject,
          job_analysis_input_hash: hashJobDescription(jobDescription),
          ai_job_analysis_models: safeModelsSnapshot,
          job_analysis_workflow_run_id: null,
          workflow_last_error: null,
        })
        .eq('id', missionId);

      if (updateError) {
        throw new Error('saveJobPostingAnalysis DB update failed: ' + updateError.message);
      }

      persisted = true;

      if (sanitizeMeta.removedChars > 0) {
        // Jamais le contenu du payload : uniquement le volume et les chemins touchés.
        console.warn('Job posting analysis jsonb sanitization', {
          missionId,
          removedChars: sanitizeMeta.removedChars,
          paths: sanitizeMeta.paths,
        });
      }
    }

    return { missionId, durationMs, persisted };
  } finally {
    writer.releaseLock();
  }
}

// Un rejeu de ce step relance TOUS ses appels LLM et produit donc une sortie neuve : il peut
// rattraper un aléa de génération (sortie malformée, caractère interdit) ou une panne
// passagère. Mais chaque tentative est facturée en entier, d'où un plafond à 1 : une
// seconde chance, jamais plus. La
// relance reste possible à la main depuis la page mission.
fetchAndAnalyze.maxRetries = 1;

async function closeJobPostingStream() {
  'use step';

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

async function handleWorkflowError(missionId: string, error: unknown, ctx?: { stepKey?: string }) {
  'use step';

  const supabase = getSupabase();
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const stepKey = ctx?.stepKey ?? readWorkflowStepKey(error) ?? 'unknown';
  const workflowLastError = workflowLastErrorSchema.parse({
    stepKey,
    message: errorMessage,
  });

  // supabase-js ne lève pas : sans ce contrôle, un échec laisserait la mission bloquée avec
  // son `job_analysis_workflow_run_id` alors qu'une erreur a bien eu lieu. On logue sans
  // lever : on est déjà dans le chemin d'erreur, lever masquerait l'erreur initiale et
  // empêcherait l'écriture du frame d'erreur dans le flux.
  const { error: statusUpdateError } = await supabase
    .from('missions')
    .update({
      job_analysis_workflow_run_id: null,
      workflow_last_error: workflowLastError,
    })
    .eq('id', missionId);

  if (statusUpdateError) {
    console.error('handleWorkflowError status update failed', {
      table: 'missions',
      recordId: missionId,
      stepKey,
      supabaseError: statusUpdateError.message,
    });
  }

  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  try {
    await writer.write(
      encoder.encode(
        JSON.stringify({
          error: errorMessage,
          ...(stepKey !== 'unknown' ? { stepKey } : {}),
        }) + '\n',
      ),
    );
  } finally {
    writer.releaseLock();
    await writable.close();
  }
}
handleWorkflowError.maxRetries = 0;

export async function analyzeJobPostingWorkflow(missionId: string) {
  'use workflow';

  try {
    const result = await fetchAndAnalyze(missionId);
    await closeJobPostingStream();
    return { missionId: result.missionId, durationMs: result.durationMs };
  } catch (error) {
    await handleWorkflowError(missionId, error);
    throw error;
  }
}
