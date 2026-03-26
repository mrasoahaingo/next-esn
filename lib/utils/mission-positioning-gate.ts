import type { JobPostingAnalysis } from '@/lib/schema';
import type { MissionDetail } from '@/lib/queries/missions';

const HELP_ANALYSIS_RUNNING = 'Analyse de la fiche mission en cours…';
const HELP_WAITING_START = 'En attente du démarrage de l’analyse…';
const HELP_ANALYSIS_READY = 'Analyse terminée — vous pouvez lancer le matching.';
const HELP_ANALYSIS_FAILED =
  "L'analyse de la fiche a échoué. Réessayez ou ouvrez la fiche mission pour plus de détails.";
const HELP_ANALYSIS_STALE =
  'La fiche a changé depuis la dernière analyse. Relancez l’analyse depuis la fiche mission.';

/** Aligné sur `MissionJobAnalysis` — analyse persistée exploitable pour le matching. */
export function hasPersistedJobAnalysis(job_analysis: unknown | null): boolean {
  if (!job_analysis || typeof job_analysis !== 'object') return false;
  const a = job_analysis as Partial<JobPostingAnalysis>;
  return (
    !!a.expectedExpertiseLevel ||
    !!a.executiveSummary?.trim() ||
    (a.keyPoints?.length ?? 0) > 0
  );
}

/**
 * FLOW-03 : CTA « Analyser le matching » — état dérivé uniquement des champs mission (serveur).
 */
export function getPositioningMatchingCtaState(
  mission: MissionDetail | null | undefined,
): { disabled: boolean; helpText: string } {
  if (!mission?.id) {
    return { disabled: true, helpText: HELP_WAITING_START };
  }

  if (mission.workflow_last_error) {
    return { disabled: true, helpText: HELP_ANALYSIS_FAILED };
  }

  if (mission.job_analysis_workflow_run_id) {
    return { disabled: true, helpText: HELP_ANALYSIS_RUNNING };
  }

  if (!hasPersistedJobAnalysis(mission.job_analysis)) {
    return { disabled: true, helpText: HELP_WAITING_START };
  }

  if (mission.job_analysis_stale) {
    return { disabled: true, helpText: HELP_ANALYSIS_STALE };
  }

  return { disabled: false, helpText: HELP_ANALYSIS_READY };
}
