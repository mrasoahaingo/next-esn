import { start, getRun } from 'workflow/api';
import { getWorld } from 'workflow/runtime';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { LanguageModelUsage } from 'ai';
import { analyzeJobPostingWorkflow } from '@/workflows/analyze-job-posting';
import { hashJobDescription } from '@/lib/utils/job-description-hash';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { TASK_KEY } from '@/lib/llm/task-keys';

const NO_LLM_MODEL = 'workflow/no-llm';

async function logMissionJobAnalysisRunSuperseded(
  supabase: SupabaseClient,
  params: {
    missionId: string;
    orgId: string | null;
    supersededRunId: string;
    winnerRunId: string | null;
  },
): Promise<void> {
  await logAiUsage(supabase, {
    operation: 'analysis',
    missionId: params.missionId,
    orgId: params.orgId ?? undefined,
    aiModel: NO_LLM_MODEL,
    taskKey: TASK_KEY.MISSION_JOB_POSTING_WORKFLOW_DEDUP,
    durationMs: 0,
    usage: {} as LanguageModelUsage,
    callStatus: 'cancelled',
    branch: null,
    workflowRunId: params.supersededRunId,
    inputPayload: {
      reason: 'duplicate_workflow_run',
      supersededRunId: params.supersededRunId,
      winnerRunId: params.winnerRunId,
    },
  });
}

type MissionAnalyzeRow = {
  id: string;
  org_id: string | null;
  job_description: string | null;
  job_analysis: unknown | null;
  job_analysis_input_hash: string | null;
  job_analysis_workflow_run_id: string | null;
};

async function emitMissionJobAnalysisWorkflowCancel(workflowRunId: string): Promise<void> {
  try {
    const world = getWorld();
    const run = await world.runs.get(workflowRunId, { resolveData: 'none' });
    await world.events.create(workflowRunId, {
      eventType: 'run_cancelled',
      specVersion: run.specVersion ?? 1,
    });
  } catch {
    // run déjà terminé ou introuvable
  }
}

async function cancelMissionJobAnalysisWorkflow(
  supabase: SupabaseClient,
  missionId: string,
  workflowRunId: string,
): Promise<void> {
  await emitMissionJobAnalysisWorkflowCancel(workflowRunId);
  await supabase
    .from('missions')
    .update({ job_analysis_workflow_run_id: null })
    .eq('id', missionId);
}

/**
 * Attribue ce run à la mission uniquement si aucun n’est déjà enregistré (évite deux workflows
 * concurrents pour la même mission, ex. création auto + POST analyze).
 */
async function claimMissionJobAnalysisWorkflowRun(
  supabase: SupabaseClient,
  missionId: string,
  workflowRunId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('missions')
    .update({ job_analysis_workflow_run_id: workflowRunId })
    .eq('id', missionId)
    .is('job_analysis_workflow_run_id', null)
    .select('id');

  if (error) {
    console.error('claimMissionJobAnalysisWorkflowRun:', error);
    throw error;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * Lance l’analyse IA de la fiche après création ou mise à jour du texte.
 * Annule une analyse en cours si le contenu a changé (nouvelle analyse sur le texte à jour).
 */
export async function launchMissionJobPostingAnalysisAfterContentChange(
  supabase: SupabaseClient,
  missionId: string,
  options?: { skipIfAlreadyCurrent?: boolean },
): Promise<{ started: boolean; runId?: string }> {
  const { data: mission, error } = await supabase
    .from('missions')
    .select(
      'id, org_id, job_description, job_analysis, job_analysis_input_hash, job_analysis_workflow_run_id',
    )
    .eq('id', missionId)
    .single();

  if (error || !mission) {
    return { started: false };
  }

  const row = mission as unknown as MissionAnalyzeRow;
  const jd = row.job_description?.trim() ?? '';
  if (!jd) {
    return { started: false };
  }

  const currentHash = hashJobDescription(jd);
  if (options?.skipIfAlreadyCurrent !== false) {
    if (row.job_analysis != null && row.job_analysis_input_hash === currentHash) {
      return { started: false };
    }
  }

  if (row.job_analysis_workflow_run_id) {
    await cancelMissionJobAnalysisWorkflow(supabase, missionId, row.job_analysis_workflow_run_id);
  }

  const run = await start(analyzeJobPostingWorkflow, [missionId]);

  let claimed: boolean;
  try {
    claimed = await claimMissionJobAnalysisWorkflowRun(supabase, missionId, run.runId);
  } catch {
    await emitMissionJobAnalysisWorkflowCancel(run.runId);
    throw new Error('Impossible d’enregistrer le run d’analyse');
  }

  if (!claimed) {
    await emitMissionJobAnalysisWorkflowCancel(run.runId);
    const { data: fresh } = await supabase
      .from('missions')
      .select('job_analysis_workflow_run_id')
      .eq('id', missionId)
      .single();
    const winnerRunId = (fresh?.job_analysis_workflow_run_id as string | null) ?? null;
    try {
      await logMissionJobAnalysisRunSuperseded(supabase, {
        missionId,
        orgId: row.org_id,
        supersededRunId: run.runId,
        winnerRunId,
      });
    } catch (e) {
      console.error('logMissionJobAnalysisRunSuperseded:', e);
    }
    return {
      started: false,
      runId: winnerRunId ?? undefined,
    };
  }

  return { started: true, runId: run.runId };
}

/** POST /api/missions/[id]/analyze-job — stream NDJSON ou reprise du run. */
export async function respondMissionJobAnalyzePost(
  supabase: SupabaseClient,
  missionId: string,
): Promise<Response> {
  const { data: mission, error } = await supabase
    .from('missions')
    .select('id, org_id, job_description, job_analysis_workflow_run_id')
    .eq('id', missionId)
    .single();

  if (error || !mission) {
    return Response.json({ error: 'Mission introuvable' }, { status: 404 });
  }

  const row = mission as unknown as MissionAnalyzeRow;
  if (!row.job_description?.trim()) {
    return Response.json({ error: 'Fiche de poste vide' }, { status: 400 });
  }

  const seenRunId = row.job_analysis_workflow_run_id;

  if (seenRunId) {
    const run = getRun(seenRunId);
    if (await run.exists) {
      const st = await run.status;
      if (st !== 'completed' && st !== 'failed' && st !== 'cancelled') {
        return new Response(run.getReadable({ startIndex: 0 }), {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'x-workflow-run-id': seenRunId,
          },
        });
      }
    }
    await supabase
      .from('missions')
      .update({ job_analysis_workflow_run_id: null })
      .eq('id', missionId)
      .eq('job_analysis_workflow_run_id', seenRunId);
  }

  const { data: missionAfterClear } = await supabase
    .from('missions')
    .select('job_analysis_workflow_run_id')
    .eq('id', missionId)
    .single();

  const concurrentRunId = missionAfterClear?.job_analysis_workflow_run_id as string | null | undefined;
  if (concurrentRunId) {
    const run = getRun(concurrentRunId);
    if (await run.exists) {
      const st = await run.status;
      if (st !== 'completed' && st !== 'failed' && st !== 'cancelled') {
        return new Response(run.getReadable({ startIndex: 0 }), {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'x-workflow-run-id': concurrentRunId,
          },
        });
      }
    }
  }

  const run = await start(analyzeJobPostingWorkflow, [missionId]);

  let claimed: boolean;
  try {
    claimed = await claimMissionJobAnalysisWorkflowRun(supabase, missionId, run.runId);
  } catch {
    await emitMissionJobAnalysisWorkflowCancel(run.runId);
    throw new Error('Impossible d’enregistrer le run d’analyse');
  }

  if (!claimed) {
    await emitMissionJobAnalysisWorkflowCancel(run.runId);
    const { data: fresh } = await supabase
      .from('missions')
      .select('job_analysis_workflow_run_id')
      .eq('id', missionId)
      .single();
    const winnerId = (fresh?.job_analysis_workflow_run_id as string | null) ?? null;
    try {
      await logMissionJobAnalysisRunSuperseded(supabase, {
        missionId,
        orgId: row.org_id,
        supersededRunId: run.runId,
        winnerRunId: winnerId,
      });
    } catch (e) {
      console.error('logMissionJobAnalysisRunSuperseded:', e);
    }
    if (winnerId) {
      const winnerRun = getRun(winnerId);
      return new Response(winnerRun.getReadable({ startIndex: 0 }), {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'x-workflow-run-id': winnerId,
        },
      });
    }
    return Response.json({ error: 'Impossible d’attribuer l’analyse (conflit)' }, { status: 503 });
  }

  return new Response(run.readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'x-workflow-run-id': run.runId,
    },
  });
}
