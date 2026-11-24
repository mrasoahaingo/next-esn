import { readNdjsonStream, type NdjsonChunk } from '@/lib/workflow/ndjson-stream';

/**
 * Suivi d’un run workflow jusqu’à son état terminal, malgré les coupures du flux NDJSON.
 *
 * Le flux navigateur ↔ route Next ne vit que le temps d’une invocation de fonction : une analyse
 * (branches LLM de 100 à 300 s) peut la dépasser. Une fin de corps HTTP ne prouve donc rien : on
 * rouvre `/api/workflow/{runId}/stream?startIndex=<lignes reçues>` jusqu’à ce que le serveur
 * réponde que le run est terminé (réponse JSON) ou introuvable (404).
 */

/** Silence maximal toléré sur une connexion avant de la considérer morte et de la rouvrir. */
export const WORKFLOW_STREAM_IDLE_TIMEOUT_MS = 45_000;
/** Échecs consécutifs (sans aucune ligne reçue) avant d’abandonner le suivi en direct. */
export const WORKFLOW_STREAM_MAX_CONSECUTIVE_FAILURES = 20;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 15_000;

export type FollowWorkflowRunOutcome =
  /** Le serveur confirme que le run est terminé (succès OU échec : relire l’état persisté). */
  | { kind: 'finished'; linesConsumed: number; confirmedByServer: true }
  /** Ligne d’erreur reçue dans le flux : échec réel du run. */
  | { kind: 'failed'; message: string; stepKey?: string; linesConsumed: number }
  | { kind: 'aborted'; linesConsumed: number }
  /** Trop d’échecs consécutifs : le suivi en direct est abandonné (le statut persisté prend le relais). */
  | { kind: 'lost'; error: Error; linesConsumed: number };

export type FollowWorkflowRunOptions<T, M> = {
  runId: string;
  /** Corps déjà ouvert (réponse du POST de démarrage) ; sinon ouverture via l’endpoint de reprise. */
  initialBody?: ReadableStream<Uint8Array> | null;
  /** Index du premier chunk de `initialBody` (0 pour `run.readable`). */
  startIndex?: number;
  signal: AbortSignal;
  onChunk: (chunk: NdjsonChunk<T, M>) => void;
  /**
   * Le hook y dépose une fonction qui interrompt la lecture courante pour revérifier
   * immédiatement l’état du run (ex. statut persisté devenu terminal alors que le flux est muet).
   */
  nudge?: { current: (() => void) | null };
  fetchImpl?: typeof fetch;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  idleTimeoutMs?: number;
  maxConsecutiveFailures?: number;
};

type OpenResult =
  | { kind: 'stream'; body: ReadableStream<Uint8Array> }
  | { kind: 'terminal' }
  | { kind: 'retry'; error: Error }
  | { kind: 'aborted' };

export function workflowStreamResumeUrl(runId: string, startIndex: number): string {
  return `/api/workflow/${encodeURIComponent(runId)}/stream?startIndex=${Math.max(0, startIndex)}`;
}

export function workflowStreamBackoffMs(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return 0;
  return Math.min(BACKOFF_BASE_MS * 2 ** (consecutiveFailures - 1), BACKOFF_MAX_MS);
}

function defaultSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

async function openResume(
  fetchImpl: typeof fetch,
  runId: string,
  startIndex: number,
  signal: AbortSignal,
): Promise<OpenResult> {
  let response: Response;
  try {
    response = await fetchImpl(workflowStreamResumeUrl(runId, startIndex), {
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    if (signal.aborted) return { kind: 'aborted' };
    return { kind: 'retry', error: error instanceof Error ? error : new Error(String(error)) };
  }

  // Run introuvable : la route a déjà réconcilié la ligne ; l’état persisté fait foi.
  if (response.status === 404) return { kind: 'terminal' };

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { status?: string; error?: string };
    if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
      return { kind: 'terminal' };
    }
    return { kind: 'retry', error: new Error(data.error ?? `HTTP ${response.status}`) };
  }

  // La route ne répond en JSON que pour un run terminé (completed / failed / cancelled).
  if (contentType.includes('application/json')) {
    await response.body?.cancel().catch(() => {});
    return { kind: 'terminal' };
  }

  if (!response.body) return { kind: 'retry', error: new Error('Flux workflow sans corps') };
  return { kind: 'stream', body: response.body };
}

export async function followWorkflowRun<T, M>(
  options: FollowWorkflowRunOptions<T, M>,
): Promise<FollowWorkflowRunOutcome> {
  const {
    runId,
    signal,
    onChunk,
    nudge,
    fetchImpl = (input, init) => fetch(input, init),
    sleep = defaultSleep,
    idleTimeoutMs = WORKFLOW_STREAM_IDLE_TIMEOUT_MS,
    maxConsecutiveFailures = WORKFLOW_STREAM_MAX_CONSECUTIVE_FAILURES,
  } = options;

  let body: ReadableStream<Uint8Array> | null = options.initialBody ?? null;
  let offset = Math.max(0, options.startIndex ?? 0);
  let linesConsumed = 0;
  let failures = 0;
  let lastError: Error = new Error('Flux workflow interrompu');

  for (;;) {
    if (signal.aborted) return { kind: 'aborted', linesConsumed };

    if (!body) {
      const opened = await openResume(fetchImpl, runId, offset, signal);
      if (opened.kind === 'aborted' || signal.aborted) return { kind: 'aborted', linesConsumed };
      if (opened.kind === 'terminal') {
        return { kind: 'finished', linesConsumed, confirmedByServer: true };
      }
      if (opened.kind === 'retry') {
        lastError = opened.error;
        failures++;
        if (failures >= maxConsecutiveFailures) {
          return { kind: 'lost', error: lastError, linesConsumed };
        }
        await sleep(workflowStreamBackoffMs(failures), signal);
        continue;
      }
      body = opened.body;
    }

    // Contrôleur par tentative : `nudge` interrompt la lecture sans arrêter le suivi.
    const attempt = new AbortController();
    const forwardAbort = () => attempt.abort();
    signal.addEventListener('abort', forwardAbort, { once: true });
    const nudgeAttempt = () => attempt.abort();
    if (nudge) nudge.current = nudgeAttempt;

    const { end, lines } = await readNdjsonStream<T, M>(body, {
      onChunk,
      signal: attempt.signal,
      idleTimeoutMs,
    });

    signal.removeEventListener('abort', forwardAbort);
    if (nudge && nudge.current === nudgeAttempt) nudge.current = null;
    body = null;
    offset += lines;
    linesConsumed += lines;

    if (signal.aborted) return { kind: 'aborted', linesConsumed };

    switch (end.kind) {
      case 'error-line':
        return {
          kind: 'failed',
          message: end.message,
          ...(end.stepKey ? { stepKey: end.stepKey } : {}),
          linesConsumed,
        };
      case 'aborted':
      case 'idle':
        // Revérification immédiate : relancer (nudge) ou connexion muette mais pas en échec.
        failures = 0;
        continue;
      case 'eof':
      case 'transport-error': {
        if (end.kind === 'transport-error') {
          lastError =
            end.error instanceof Error ? end.error : new Error(String(end.error));
        }
        if (lines > 0) {
          failures = 0;
          continue;
        }
        failures++;
        if (failures >= maxConsecutiveFailures) {
          return { kind: 'lost', error: lastError, linesConsumed };
        }
        await sleep(workflowStreamBackoffMs(failures), signal);
        continue;
      }
    }
  }
}
