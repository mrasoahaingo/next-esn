import { beforeEach, describe, expect, it, vi } from 'vitest';

const getRunMock = vi.fn();
vi.mock('workflow/api', () => ({ getRun: (id: string) => getRunMock(id) }));

import {
  WORKFLOW_ZOMBIE_TIMEOUT_MS,
  decideWorkflowReconciliation,
  reconcileWorkflowRecord,
} from '@/lib/services/workflow-reconcile';
import type { SupabaseClient } from '@supabase/supabase-js';

const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);
const iso = (offsetMs: number): string => new Date(NOW - offsetMs).toISOString();

describe('réconciliation : une lecture du run en échec n’est pas un run mort', () => {
  it('decide : lookupFailed sur un run récent -> none (on laisse tourner)', () => {
    expect(
      decideWorkflowReconciliation({
        table: 'positionings',
        currentStatus: 'generating',
        startedAt: iso(120_000),
        now: NOW,
        runId: 'run_1',
        run: { exists: true, status: null, lookupFailed: true },
        hasResultData: true,
      }),
    ).toEqual({ action: 'none' });
  });

  it('decide : lookupFailed au-delà du timeout zombie -> error (filet de sécurité conservé)', () => {
    const d = decideWorkflowReconciliation({
      table: 'positionings',
      currentStatus: 'analyzing',
      startedAt: iso(WORKFLOW_ZOMBIE_TIMEOUT_MS + 1),
      now: NOW,
      runId: 'run_1',
      run: { exists: true, status: null, lookupFailed: true },
      hasResultData: false,
    });
    expect(d.action).toBe('fail');
  });

  describe('reconcileWorkflowRecord (IO)', () => {
    const update = vi.fn();
    const supabase = {
      from: () => ({
        update: (payload: unknown) => {
          update(payload);
          return { eq: async () => ({ error: null }) };
        },
      }),
    } as unknown as SupabaseClient;

    beforeEach(() => {
      update.mockReset();
      getRunMock.mockReset();
    });

    const row = {
      id: 'pos_1',
      status: 'generating',
      workflow_run_id: 'run_1',
      workflow_started_at: new Date(Date.now() - 60_000).toISOString(),
      tailored_cv: { old: true },
    };

    it('erreur réseau du workflow-server pendant le polling : aucune écriture, la génération continue', async () => {
      getRunMock.mockReturnValue({
        get exists() {
          return Promise.reject(new Error('fetch failed'));
        },
        get status() {
          return Promise.reject(new Error('fetch failed'));
        },
      });
      const decision = await reconcileWorkflowRecord({ supabase, table: 'positionings', row });
      expect(decision).toEqual({ action: 'none' });
      expect(update).not.toHaveBeenCalled();
    });

    it('run réellement introuvable : toujours marqué en erreur', async () => {
      getRunMock.mockReturnValue({
        get exists() {
          return Promise.resolve(false);
        },
      });
      const decision = await reconcileWorkflowRecord({ supabase, table: 'positionings', row });
      expect(decision.action).toBe('fail');
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
    });
  });
});
