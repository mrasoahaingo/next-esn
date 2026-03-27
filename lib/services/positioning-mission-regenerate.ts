import type { SupabaseClient } from '@supabase/supabase-js';
import { getRun } from 'workflow/api';
import { logPositioningAnalysisSnapshot } from '@/lib/services/positioning-analysis-snapshot-log';

/** True si le run workflow existe encore et n’est pas terminé (échec inclus = terminé). */
export async function isPositioningWorkflowRunActive(
  runId: string | null | undefined,
): Promise<boolean> {
  if (!runId) return false;
  const run = getRun(runId);
  if (!(await run.exists)) return false;
  const st = await run.status;
  return st !== 'completed' && st !== 'failed' && st !== 'cancelled';
}

/** Même règle que PATCH avec `archiveAnalysisBeforeClear` : snapshot dans l’historique si une analyse existe. */
export async function archivePositioningAnalysisToHistoryIfPresent(
  supabase: SupabaseClient,
  positioningId: string,
  orgId: string,
): Promise<void> {
  const { data: current, error } = await supabase
    .from('positionings')
    .select('analysis, answers, org_id, ai_analysis_models, candidate_id')
    .eq('id', positioningId)
    .eq('org_id', orgId)
    .single();

  if (error) throw error;

  const prevAnalysis = current?.analysis;
  const candidateId = current?.candidate_id as string | undefined;
  if (prevAnalysis != null && typeof prevAnalysis === 'object' && candidateId) {
    const rowOrg = (current?.org_id as string | null | undefined) ?? orgId;
    await logPositioningAnalysisSnapshot(supabase, {
      positioningId,
      candidateId,
      orgId: rowOrg,
      reason: 'archive_before_clear',
      analysis: prevAnalysis,
      answers: current?.answers ?? null,
      aiAnalysisModels: current?.ai_analysis_models ?? null,
    });
  }
}

/** Réinitialise un positionnement mission pour une nouvelle analyse (après archivage éventuel). */
export async function resetMissionPositioningForRegeneration(
  supabase: SupabaseClient,
  positioningId: string,
  orgId: string,
  jobDescription: string,
): Promise<void> {
  await archivePositioningAnalysisToHistoryIfPresent(supabase, positioningId, orgId);

  const { error } = await supabase
    .from('positionings')
    .update({
      job_description: jobDescription,
      analysis: null,
      answers: null,
      tailored_cv: null,
      email: null,
      email_first_contact: null,
      email_bullet_points: null,
      candidate_email: null,
      tailored_file_url: null,
      analysis_recruiter_answers: null,
      ai_analysis_models: null,
      status: 'draft',
      workflow_run_id: null,
      workflow_last_error: null,
      ai_analysis_duration_ms: null,
      ai_generation_duration_ms: null,
      user_time_seconds: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', positioningId)
    .eq('org_id', orgId);

  if (error) throw error;
}
