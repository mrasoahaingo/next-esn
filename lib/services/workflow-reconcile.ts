import { getRun } from 'workflow/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';

/**
 * Au-delà de ce délai sans état terminal, un run est considéré mort (« zombie ») et la ligne
 * associée est basculée en `error`. Les analyses/générations réelles durent 1 à 3 minutes :
 * 15 minutes laissent une marge x5 avant de déclarer l’abandon.
 */
export const WORKFLOW_ZOMBIE_TIMEOUT_MS = 15 * 60 * 1000;

export type WorkflowReconcileTable = 'positionings' | 'candidates';

export type WorkflowRunSnapshot = {
  exists: boolean;
  status: string | null;
};

export type WorkflowReconcileDecision =
  | { action: 'none' }
  | { action: 'settle'; status: string }
  | { action: 'fail'; workflowLastError: WorkflowLastError };

/** Ligne minimale nécessaire à la réconciliation (colonnes lues selon la table). */
export type WorkflowReconcileRow = {
  id: string;
  status: string | null;
  workflow_run_id: string | null;
  workflow_started_at: string | null;
  analysis?: unknown;
  tailored_cv?: unknown;
  email?: unknown;
  extracted_data?: unknown;
};

const DEAD_RUN_MESSAGE =
  'Le traitement a été interrompu côté serveur. Relancez l’opération.';
const ZOMBIE_RUN_MESSAGE =
  'Le traitement n’a pas abouti dans le temps imparti. Relancez l’opération.';

/** Statut « en cours » -> statut de succès attendu, par table. */
const ACTIVE_STATUS_SUCCESS: Record<WorkflowReconcileTable, Record<string, string>> = {
  positionings: {
    analyzing: 'analyzed',
    generating: 'generated',
  },
  candidates: {
    extracting: 'reviewing',
    uploaded: 'reviewing',
  },
};

function failWith(message: string): WorkflowReconcileDecision {
  return { action: 'fail', workflowLastError: { stepKey: 'unknown', message } };
}

/**
 * Cœur de décision (PURE, aucun IO) : à partir de l’état d’une ligne et d’un instantané du run,
 * déterminer s’il faut ne rien faire, régler la ligne sur son statut terminal, ou la marquer en erreur.
 */
export function decideWorkflowReconciliation(input: {
  table: WorkflowReconcileTable;
  currentStatus: string | null;
  startedAt: string | null;
  now: number;
  run: WorkflowRunSnapshot;
  hasResultData: boolean;
}): WorkflowReconcileDecision {
  const { table, currentStatus, startedAt, now, run, hasResultData } = input;

  if (!currentStatus) return { action: 'none' };
  const successStatus = ACTIVE_STATUS_SUCCESS[table][currentStatus];
  // Statut non actif (déjà terminal) -> idempotence, on ne touche à rien.
  if (!successStatus) return { action: 'none' };

  if (!run.exists) return failWith(DEAD_RUN_MESSAGE);

  if (run.status === 'completed') {
    return hasResultData
      ? { action: 'settle', status: successStatus }
      : failWith(DEAD_RUN_MESSAGE);
  }

  if (run.status === 'failed' || run.status === 'cancelled') {
    return failWith(DEAD_RUN_MESSAGE);
  }

  // Run non terminal : on ne peut conclure qu’avec une preuve d’ancienneté.
  if (!startedAt) return { action: 'none' };
  const startedAtMs = Date.parse(startedAt);
  if (Number.isNaN(startedAtMs)) return { action: 'none' };
  if (now - startedAtMs > WORKFLOW_ZOMBIE_TIMEOUT_MS) {
    return failWith(ZOMBIE_RUN_MESSAGE);
  }

  return { action: 'none' };
}

function hasNonEmptyObject(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function computeHasResultData(
  table: WorkflowReconcileTable,
  row: WorkflowReconcileRow,
): boolean {
  if (table === 'candidates') return hasNonEmptyObject(row.extracted_data);
  if (row.status === 'generating') {
    return hasNonEmptyObject(row.tailored_cv) || hasNonEmptyObject(row.email);
  }
  return hasNonEmptyObject(row.analysis);
}

async function snapshotRun(runId: string): Promise<WorkflowRunSnapshot> {
  try {
    const run = getRun(runId);
    if (!(await run.exists)) return { exists: false, status: null };
    const status = await run.status;
    return { exists: true, status: status ?? null };
  } catch (error) {
    console.error('Workflow reconcile run lookup error:', error);
    return { exists: false, status: null };
  }
}

/**
 * Réconcilie une ligne bloquée en statut actif. Best effort : n’échoue jamais la requête appelante.
 */
export async function reconcileWorkflowRecord(input: {
  supabase: SupabaseClient;
  table: WorkflowReconcileTable;
  row: WorkflowReconcileRow;
}): Promise<WorkflowReconcileDecision> {
  const { supabase, table, row } = input;

  if (!row.workflow_run_id) return { action: 'none' };

  try {
    const run = await snapshotRun(row.workflow_run_id);

    const decision = decideWorkflowReconciliation({
      table,
      currentStatus: row.status,
      startedAt: row.workflow_started_at,
      now: Date.now(),
      run,
      hasResultData: computeHasResultData(table, row),
    });

    if (decision.action === 'none') return decision;

    const payload =
      decision.action === 'settle'
        ? { status: decision.status, workflow_run_id: null, workflow_last_error: null }
        : {
            status: 'error',
            workflow_run_id: null,
            workflow_last_error: decision.workflowLastError,
          };

    const { error } = await supabase.from(table).update(payload).eq('id', row.id);
    if (error) {
      console.error('Workflow reconcile error:', error);
      return { action: 'none' };
    }

    return decision;
  } catch (error) {
    console.error('Workflow reconcile error:', error);
    return { action: 'none' };
  }
}

/** Retrouve la ligne portant ce `workflow_run_id` (positionings puis candidates) et la réconcilie. */
export async function reconcileWorkflowRunById(
  supabase: SupabaseClient,
  runId: string,
): Promise<WorkflowReconcileDecision> {
  if (!runId) return { action: 'none' };

  try {
    const { data: positioning } = await supabase
      .from('positionings')
      .select('id, status, workflow_run_id, workflow_started_at, analysis, tailored_cv, email')
      .eq('workflow_run_id', runId)
      .maybeSingle();

    if (positioning) {
      return reconcileWorkflowRecord({
        supabase,
        table: 'positionings',
        row: positioning as WorkflowReconcileRow,
      });
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, status, workflow_run_id, workflow_started_at, extracted_data')
      .eq('workflow_run_id', runId)
      .maybeSingle();

    if (candidate) {
      return reconcileWorkflowRecord({
        supabase,
        table: 'candidates',
        row: candidate as WorkflowReconcileRow,
      });
    }

    return { action: 'none' };
  } catch (error) {
    console.error('Workflow reconcile error:', error);
    return { action: 'none' };
  }
}
