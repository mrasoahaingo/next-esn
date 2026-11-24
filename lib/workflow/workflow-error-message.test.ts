import { describe, expect, it } from 'vitest';
import {
  attachWorkflowStepKey,
  readWorkflowStepKey,
} from '@/lib/utils/workflow-step-error';
import {
  WORKFLOW_TECHNICAL_FAILURE_MESSAGE,
  resolveWorkflowErrorStepKey,
  toUserFacingWorkflowErrorMessage,
} from '@/lib/workflow/workflow-error-message';
import {
  computePositioningAnalysisStepStates,
  formatStepSummaryLine,
} from '@/lib/workflow/compute-step-status';
import {
  POSITIONING_ANALYSIS_SUCCESS_STATUSES,
  resolveWorkflowOutcome,
} from '@/lib/workflow/workflow-outcome';

/** Reproduit le passage step → workflow : le runtime ne garde que le message (FatalError). */
function crossStepBoundary(err: Error): Error {
  return new Error(
    `Step "step//./workflows/positioning-analyze//fetchAndAnalyze" failed after 1 retry: ${err.message}`,
  );
}

describe('attribution de l’étape en échec malgré FatalError(message)', () => {
  it('la clé d’étape survit au passage step → workflow via le message', () => {
    const inStep = attachWorkflowStepKey(new Error('No output generated. Check the stream for errors.'), 'skills');
    expect(readWorkflowStepKey(inStep)).toBe('skills');

    const inWorkflow = crossStepBoundary(inStep);
    expect((inWorkflow as Error & { stepKey?: string }).stepKey).toBeUndefined();
    expect(readWorkflowStepKey(inWorkflow)).toBe('skills');
  });

  it('ne double pas le marqueur si l’erreur est ré-étiquetée', () => {
    const e = attachWorkflowStepKey(attachWorkflowStepKey(new Error('x'), 'gaps'), 'synthesis');
    expect(e.message).toBe('[stepKey=gaps] x');
  });

  it('resolveWorkflowErrorStepKey relit le marqueur quand la clé persistée vaut unknown', () => {
    expect(resolveWorkflowErrorStepKey('unknown', 'Step "a" failed after 1 retry: [stepKey=questions] boom')).toBe('questions');
    expect(resolveWorkflowErrorStepKey('skills', '[stepKey=gaps] boom')).toBe('skills');
    expect(resolveWorkflowErrorStepKey('unknown', 'boom')).toBeNull();
  });
});

describe('toUserFacingWorkflowErrorMessage', () => {
  it('traduit l’échec observé en prod (AI_NoOutputGeneratedError après retries)', () => {
    const msg = toUserFacingWorkflowErrorMessage(
      'Step "step//./workflows/positioning-analyze//fetchAndAnalyze" failed after 1 retry: No output generated. Check the stream for errors.',
    );
    expect(msg).toMatch(/^Le modèle d’IA n’a pas renvoyé de réponse exploitable/);
  });

  it('masque un message technique inconnu', () => {
    expect(toUserFacingWorkflowErrorMessage('TypeError: Cannot read properties of undefined')).toBe(
      WORKFLOW_TECHNICAL_FAILURE_MESSAGE,
    );
    expect(toUserFacingWorkflowErrorMessage('Step "x" failed after 1 retry: [stepKey=gaps] kaboom')).toBe(
      WORKFLOW_TECHNICAL_FAILURE_MESSAGE,
    );
    expect(toUserFacingWorkflowErrorMessage('')).toBe(WORKFLOW_TECHNICAL_FAILURE_MESSAGE);
  });

  it('laisse passer les messages rédigés par l’application', () => {
    const m = 'Le traitement a été interrompu côté serveur. Relancez l’opération.';
    expect(toUserFacingWorkflowErrorMessage(m)).toBe(m);
  });

  it('reconnaît délai dépassé, quota et échec d’enregistrement', () => {
    expect(toUserFacingWorkflowErrorMessage('Request timed out')).toMatch(/trop de temps/);
    expect(toUserFacingWorkflowErrorMessage('429 Too Many Requests')).toMatch(/saturé/);
    expect(toUserFacingWorkflowErrorMessage('saveAnalysis DB update failed: x')).toMatch(/enregistrement/);
  });
});

describe('état d’erreur affichable (analyse de positionnement)', () => {
  const persisted = {
    stepKey: 'unknown',
    message:
      'Step "step//./workflows/positioning-analyze//fetchAndAnalyze" failed after 1 retry: [stepKey=experiences] No output generated.',
  };

  it('marque l’étape en échec avec un message sûr, même si stepKey persisté vaut unknown', () => {
    const rows = computePositioningAnalysisStepStates({
      streamMeta: null,
      partialData: null,
      isStreaming: false,
      errorStepKey: null,
      persistedError: persisted,
      workflowFailed: true,
    });
    const failed = rows.filter((r) => r.status === 'error');
    expect(failed.map((r) => r.stepKey)).toEqual(['experiences']);
    expect(failed[0]!.errorMessage).toMatch(/^Le modèle d’IA/);
    expect(failed[0]!.errorMessage).not.toMatch(/Step "|stepKey=/);
  });

  it('la ligne de synthèse annonce l’échec plutôt qu’une étape « en attente »', () => {
    const rows = computePositioningAnalysisStepStates({
      streamMeta: null,
      partialData: null,
      isStreaming: false,
      errorStepKey: null,
      persistedError: persisted,
      workflowFailed: true,
    });
    const line = formatStepSummaryLine('positioningAnalysis', rows);
    const idx = rows.findIndex((r) => r.stepKey === 'experiences');
    expect(line).toBe(`Échec à l’étape ${idx + 1}/${rows.length} — ${rows[idx]!.label}`);
  });

  it('le toast de fin n’affiche jamais le message technique brut', () => {
    const outcome = resolveWorkflowOutcome({
      status: 'error',
      successStatuses: POSITIONING_ANALYSIS_SUCCESS_STATUSES,
      lastError: persisted,
    });
    expect(outcome.kind).toBe('error');
    expect(outcome.message).not.toMatch(/Step "|fetchAndAnalyze|stepKey=/);
  });

  it('après échec, une branche encore listée active dans le dernier méta n’est plus « En cours »', () => {
    const rows = computePositioningAnalysisStepStates({
      streamMeta: { phase: 'extracting', activeBranches: ['skills', 'gaps'] },
      partialData: null,
      isStreaming: false,
      errorStepKey: null,
      persistedError: { stepKey: 'unknown', message: 'Step "x" failed after 1 retry: [stepKey=skills] boom' },
      workflowFailed: true,
    });
    expect(rows.find((r) => r.stepKey === 'skills')?.status).toBe('error');
    expect(rows.some((r) => r.status === 'running')).toBe(false);
  });
});
