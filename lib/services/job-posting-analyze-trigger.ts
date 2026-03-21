import { start, getRun } from 'workflow/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzeJobPostingWorkflow } from '@/workflows/analyze-job-posting';

type MissionAnalyzeRow = {
  id: string;
  org_id: string | null;
  job_description: string | null;
  job_analysis_workflow_run_id: string | null;
};

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

  if (row.job_analysis_workflow_run_id) {
    const run = getRun(row.job_analysis_workflow_run_id);
    if (await run.exists) {
      const st = await run.status;
      if (st !== 'completed' && st !== 'failed' && st !== 'cancelled') {
        return new Response(run.getReadable({ startIndex: 0 }), {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'x-workflow-run-id': row.job_analysis_workflow_run_id,
          },
        });
      }
    }
    await supabase
      .from('missions')
      .update({ job_analysis_workflow_run_id: null })
      .eq('id', missionId);
  }

  const run = await start(analyzeJobPostingWorkflow, [missionId]);

  await supabase
    .from('missions')
    .update({ job_analysis_workflow_run_id: run.runId })
    .eq('id', missionId);

  return new Response(run.readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'x-workflow-run-id': run.runId,
    },
  });
}
