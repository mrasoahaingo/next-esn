import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_ZOMBIE_TIMEOUT_MS,
  decideWorkflowReconciliation,
} from '@/lib/services/workflow-reconcile';

const NOW = Date.UTC(2026, 8, 21, 12, 0, 0);
const iso = (offsetMs: number): string => new Date(NOW - offsetMs).toISOString();

describe('decideWorkflowReconciliation', () => {
  it('règle un run completed avec analyse présente vers analyzed', () => {
    expect(
      decideWorkflowReconciliation({
        table: 'positionings',
        currentStatus: 'analyzing',
        startedAt: iso(60_000),
        now: NOW,
        run: { exists: true, status: 'completed' },
        hasResultData: true,
      }),
    ).toEqual({ action: 'settle', status: 'analyzed' });
  });

  it('règle un run completed avec livrables de génération vers generated', () => {
    expect(
      decideWorkflowReconciliation({
        table: 'positionings',
        currentStatus: 'generating',
        startedAt: iso(60_000),
        now: NOW,
        run: { exists: true, status: 'completed' },
        hasResultData: true,
      }),
    ).toEqual({ action: 'settle', status: 'generated' });
  });

  it('marque error un run completed sans données sauvegardées', () => {
    const decision = decideWorkflowReconciliation({
      table: 'positionings',
      currentStatus: 'analyzing',
      startedAt: iso(60_000),
      now: NOW,
      run: { exists: true, status: 'completed' },
      hasResultData: false,
    });
    expect(decision.action).toBe('fail');
    if (decision.action !== 'fail') throw new Error('unreachable');
    expect(decision.workflowLastError.stepKey).toBe('unknown');
    expect(decision.workflowLastError.message).toMatch(/interrompu/i);
  });

  it('marque error un run failed', () => {
    const decision = decideWorkflowReconciliation({
      table: 'positionings',
      currentStatus: 'analyzing',
      startedAt: iso(60_000),
      now: NOW,
      run: { exists: true, status: 'failed' },
      hasResultData: true,
    });
    expect(decision.action).toBe('fail');
    if (decision.action !== 'fail') throw new Error('unreachable');
    expect(decision.workflowLastError.message).toMatch(/interrompu/i);
  });

  it('marque error un run cancelled', () => {
    expect(
      decideWorkflowReconciliation({
        table: 'positionings',
        currentStatus: 'generating',
        startedAt: iso(60_000),
        now: NOW,
        run: { exists: true, status: 'cancelled' },
        hasResultData: false,
      }).action,
    ).toBe('fail');
  });

  it('marque error un run inexistant (run perdu)', () => {
    const decision = decideWorkflowReconciliation({
      table: 'candidates',
      currentStatus: 'extracting',
      startedAt: iso(60_000),
      now: NOW,
      run: { exists: false, status: null },
      hasResultData: false,
    });
    expect(decision.action).toBe('fail');
    if (decision.action !== 'fail') throw new Error('unreachable');
    expect(decision.workflowLastError.stepKey).toBe('unknown');
  });

  it('laisse tourner un run non terminal récent', () => {
    expect(
      decideWorkflowReconciliation({
        table: 'positionings',
        currentStatus: 'analyzing',
        startedAt: iso(WORKFLOW_ZOMBIE_TIMEOUT_MS - 1_000),
        now: NOW,
        run: { exists: true, status: 'running' },
        hasResultData: false,
      }),
    ).toEqual({ action: 'none' });
  });

  it('marque error un run non terminal au-delà du timeout zombie', () => {
    const decision = decideWorkflowReconciliation({
      table: 'positionings',
      currentStatus: 'analyzing',
      startedAt: iso(WORKFLOW_ZOMBIE_TIMEOUT_MS + 1_000),
      now: NOW,
      run: { exists: true, status: 'running' },
      hasResultData: false,
    });
    expect(decision.action).toBe('fail');
    if (decision.action !== 'fail') throw new Error('unreachable');
    expect(decision.workflowLastError.message).toMatch(/temps imparti/i);
  });

  it('ne marque jamais error sans preuve d’ancienneté (startedAt null)', () => {
    expect(
      decideWorkflowReconciliation({
        table: 'positionings',
        currentStatus: 'analyzing',
        startedAt: null,
        now: NOW,
        run: { exists: true, status: 'running' },
        hasResultData: false,
      }),
    ).toEqual({ action: 'none' });
  });

  it('est idempotent sur une ligne déjà dans un statut terminal', () => {
    for (const currentStatus of ['analyzed', 'generated', 'ready', 'error', 'draft', null]) {
      expect(
        decideWorkflowReconciliation({
          table: 'positionings',
          currentStatus,
          startedAt: iso(WORKFLOW_ZOMBIE_TIMEOUT_MS * 10),
          now: NOW,
          run: { exists: false, status: null },
          hasResultData: false,
        }),
      ).toEqual({ action: 'none' });
    }
  });

  it('gère les candidats : extracting/uploaded -> reviewing', () => {
    for (const currentStatus of ['extracting', 'uploaded']) {
      expect(
        decideWorkflowReconciliation({
          table: 'candidates',
          currentStatus,
          startedAt: iso(60_000),
          now: NOW,
          run: { exists: true, status: 'completed' },
          hasResultData: true,
        }),
      ).toEqual({ action: 'settle', status: 'reviewing' });
    }
  });

  it('marque error un candidat dont le run est mort', () => {
    const decision = decideWorkflowReconciliation({
      table: 'candidates',
      currentStatus: 'extracting',
      startedAt: iso(WORKFLOW_ZOMBIE_TIMEOUT_MS + 1),
      now: NOW,
      run: { exists: true, status: 'running' },
      hasResultData: false,
    });
    expect(decision.action).toBe('fail');
  });

  it('expose un timeout zombie de 15 minutes', () => {
    expect(WORKFLOW_ZOMBIE_TIMEOUT_MS).toBe(15 * 60 * 1000);
  });
});
