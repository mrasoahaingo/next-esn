import { describe, expect, it } from 'vitest';
import {
  CV_EXTRACTION_SUCCESS_STATUSES,
  POSITIONING_ANALYSIS_SUCCESS_STATUSES,
  POSITIONING_GENERATE_SUCCESS_STATUSES,
  WORKFLOW_GENERIC_FAILURE_MESSAGE,
  resolveWorkflowOutcome,
} from '@/lib/workflow/workflow-outcome';

describe('resolveWorkflowOutcome', () => {
  it('retourne success sur un statut de succès attendu', () => {
    for (const status of POSITIONING_ANALYSIS_SUCCESS_STATUSES) {
      expect(
        resolveWorkflowOutcome({
          status,
          successStatuses: POSITIONING_ANALYSIS_SUCCESS_STATUSES,
          lastError: null,
        }),
      ).toEqual({ kind: 'success' });
    }
  });

  it('retourne error avec le message de workflow_last_error', () => {
    expect(
      resolveWorkflowOutcome({
        status: 'error',
        successStatuses: POSITIONING_ANALYSIS_SUCCESS_STATUSES,
        lastError: { stepKey: 'skills', message: 'Le modèle a renvoyé une réponse vide.' },
      }),
    ).toEqual({ kind: 'error', message: 'Le modèle a renvoyé une réponse vide.' });
  });

  it('retourne error avec un message de repli quand workflow_last_error est null', () => {
    expect(
      resolveWorkflowOutcome({
        status: 'error',
        successStatuses: POSITIONING_GENERATE_SUCCESS_STATUSES,
        lastError: null,
      }),
    ).toEqual({ kind: 'error', message: WORKFLOW_GENERIC_FAILURE_MESSAGE });
  });

  it('retourne pending sur un statut encore actif — aucun toast', () => {
    const active: Array<[string, readonly string[]]> = [
      ['analyzing', POSITIONING_ANALYSIS_SUCCESS_STATUSES],
      ['generating', POSITIONING_GENERATE_SUCCESS_STATUSES],
      ['extracting', CV_EXTRACTION_SUCCESS_STATUSES],
    ];

    for (const [status, successStatuses] of active) {
      expect(
        resolveWorkflowOutcome({ status, successStatuses, lastError: null }),
      ).toEqual({ kind: 'pending' });
    }
  });

  it('retourne pending sur un statut inconnu ou absent', () => {
    for (const status of ['draft', 'wat', null, undefined]) {
      expect(
        resolveWorkflowOutcome({
          status,
          successStatuses: POSITIONING_ANALYSIS_SUCCESS_STATUSES,
          lastError: null,
        }),
      ).toEqual({ kind: 'pending' });
    }
  });

  it('expose les jeux de statuts de succès attendus', () => {
    expect([...POSITIONING_ANALYSIS_SUCCESS_STATUSES]).toEqual([
      'analyzed',
      'generating',
      'generated',
      'exported',
    ]);
    expect([...POSITIONING_GENERATE_SUCCESS_STATUSES]).toEqual(['generated', 'exported']);
    expect([...CV_EXTRACTION_SUCCESS_STATUSES]).toEqual(['reviewing', 'ready', 'generated']);
  });
});
