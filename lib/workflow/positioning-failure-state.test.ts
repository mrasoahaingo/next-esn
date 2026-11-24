import { describe, expect, it } from 'vitest';
import { resolvePositioningAnalysisFailure } from '@/lib/workflow/positioning-failure-state';
import { WORKFLOW_TECHNICAL_FAILURE_MESSAGE } from '@/lib/workflow/workflow-error-message';

describe('resolvePositioningAnalysisFailure', () => {
  it('scénario prod : relance échouée (status error, analyse vidée, stepKey unknown) -> état d’échec visible', () => {
    const failure = resolvePositioningAnalysisFailure({
      status: 'error',
      busy: false,
      hasCompleteAnalysis: false,
      lastError: {
        stepKey: 'unknown',
        message:
          'Step "step//./workflows/positioning-analyze//fetchAndAnalyze" failed after 1 retry: No output generated. Check the stream for errors.',
      },
    });
    expect(failure).not.toBeNull();
    expect(failure!.stepKey).toBeNull();
    expect(failure!.message).toMatch(/^Le modèle d’IA/);
  });

  it('retrouve l’étape via le marqueur du message', () => {
    expect(
      resolvePositioningAnalysisFailure({
        status: 'error',
        busy: false,
        hasCompleteAnalysis: false,
        lastError: { stepKey: 'unknown', message: 'Step "x" failed after 1 retry: [stepKey=gaps] boom' },
      }),
    ).toEqual({ stepKey: 'gaps', message: WORKFLOW_TECHNICAL_FAILURE_MESSAGE });
  });

  it('message de repli quand workflow_last_error est absent', () => {
    expect(
      resolvePositioningAnalysisFailure({
        status: 'error',
        busy: false,
        hasCompleteAnalysis: false,
        lastError: null,
      }),
    ).toEqual({ stepKey: null, message: WORKFLOW_TECHNICAL_FAILURE_MESSAGE });
  });

  it('rien à afficher pendant l’analyse, hors erreur, ou si une analyse complète est affichée', () => {
    const base = { lastError: null, hasCompleteAnalysis: false, busy: false };
    expect(resolvePositioningAnalysisFailure({ ...base, status: 'analyzed' })).toBeNull();
    expect(resolvePositioningAnalysisFailure({ ...base, status: 'draft' })).toBeNull();
    expect(resolvePositioningAnalysisFailure({ ...base, status: 'error', busy: true })).toBeNull();
    expect(
      resolvePositioningAnalysisFailure({ ...base, status: 'error', hasCompleteAnalysis: true }),
    ).toBeNull();
  });
});
