import type { WorkflowLastError } from '@/lib/types/workflow-last-error';
import {
  resolveWorkflowErrorStepKey,
  toUserFacingWorkflowErrorMessage,
} from '@/lib/workflow/workflow-error-message';

export type PositioningAnalysisFailure = {
  /** Clé d’étape en échec (null si inconnue). */
  stepKey: string | null;
  /** Message présentable à l’utilisateur (jamais le message technique brut). */
  message: string;
};

/**
 * Échec d’analyse à afficher sur l’étape 1. Logique pure.
 *
 * Une relance d’analyse vide `analysis` avant de démarrer : si le run échoue, la ligne finit en
 * `error` SANS analyse. Sans cet état dédié, la page retombait silencieusement sur le formulaire
 * de saisie (aucune trace de l’échec).
 */
export function resolvePositioningAnalysisFailure(input: {
  status: string | null | undefined;
  /** Analyse en cours (flux suivi ou statut serveur `analyzing`). */
  busy: boolean;
  /** Une analyse complète est affichée (l’échec éventuel concerne alors la génération). */
  hasCompleteAnalysis: boolean;
  lastError: WorkflowLastError | null | undefined;
}): PositioningAnalysisFailure | null {
  if (input.status !== 'error' || input.busy || input.hasCompleteAnalysis) return null;
  return {
    stepKey: resolveWorkflowErrorStepKey(input.lastError?.stepKey, input.lastError?.message),
    message: toUserFacingWorkflowErrorMessage(input.lastError?.message),
  };
}
