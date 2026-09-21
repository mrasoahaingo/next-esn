import type { WorkflowLastError } from '@/lib/types/workflow-last-error';

/**
 * Décision de notification adossée à l'état RÉELLEMENT persisté en base.
 * Logique pure : aucun IO, aucun import React.
 *
 * `onFinish` du hook de stream est appelé dans un `finally` : la fermeture du flux ne prouve
 * rien sur l'issue du traitement. Seul le statut relu en base fait foi.
 */
export type WorkflowOutcomeKind = 'success' | 'error' | 'pending';

export type WorkflowOutcome = { kind: WorkflowOutcomeKind; message?: string };

/** Message affiché quand la ligne est en erreur sans `workflow_last_error` exploitable. */
export const WORKFLOW_GENERIC_FAILURE_MESSAGE =
  "Le traitement n'a pas abouti. Relancez l'opération.";

/** Statuts prouvant qu'une analyse de positionnement a bien été persistée. */
export const POSITIONING_ANALYSIS_SUCCESS_STATUSES = [
  'analyzed',
  'generating',
  'generated',
  'exported',
] as const;

/** Statuts prouvant qu'une génération de positionnement a bien été persistée. */
export const POSITIONING_GENERATE_SUCCESS_STATUSES = ['generated', 'exported'] as const;

/** Statuts prouvant qu'une extraction de CV a bien été persistée. */
export const CV_EXTRACTION_SUCCESS_STATUSES = ['reviewing', 'ready', 'generated'] as const;

export function resolveWorkflowOutcome(input: {
  status: string | null | undefined;
  successStatuses: readonly string[];
  lastError: WorkflowLastError | null | undefined;
}): WorkflowOutcome {
  const { status, successStatuses, lastError } = input;

  if (!status) return { kind: 'pending' };

  if (successStatuses.includes(status)) return { kind: 'success' };

  if (status === 'error') {
    const message = lastError?.message?.trim();
    return { kind: 'error', message: message || WORKFLOW_GENERIC_FAILURE_MESSAGE };
  }

  // Statut encore actif, ou statut inconnu : on ne conclut rien, donc aucun toast.
  return { kind: 'pending' };
}
