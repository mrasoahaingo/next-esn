'use client';

import { useState, useLayoutEffect, useEffect, useRef, useCallback } from 'react';
import { followWorkflowRun, type FollowWorkflowRunOutcome } from '@/lib/workflow/follow-workflow-run';
import { readNdjsonStream, type NdjsonChunk } from '@/lib/workflow/ndjson-stream';

interface UseWorkflowStreamOptions {
  api: string;
  runId?: string | null;
  runStatus?: string | null;
  activeStatuses: string[];
  /**
   * Appelé quand le run est terminé côté serveur (ou suivi abandonné), AVANT que `isLoading`
   * repasse à false : s’il renvoie une promesse (relecture de l’état persisté), elle est attendue,
   * pour que l’UI ne retombe jamais sur un cache périmé (« terminé » avec l’ancien contenu).
   */
  onFinish?: () => void | Promise<void>;
  /**
   * Après POST avec `submit({ startOnly: true })` : réponse JSON `{ runId }` sans NDJSON.
   * Rafraîchir le cache pour que la reconnexion GET soit le seul lecteur du flux.
   */
  onStartOnly?: () => void | Promise<void>;
}

interface UseWorkflowStreamReturn<T, M = unknown> {
  object: Partial<T> | null;
  /** Métadonnées optionnelles par ligne NDJSON (ex. phase d’extraction CV) */
  streamMeta: M | null;
  isLoading: boolean;
  error: Error | null;
  /** Dernière clé d’étape reçue sur une ligne NDJSON `{ error, stepKey? }` — pour attribution ERR-03 */
  errorStepKey: string | null;
  submit: (body: Record<string, unknown>) => void;
  stop: () => void;
  /**
   * Run workflow courant : `runId` serveur (props) ou id lu sur la réponse POST tant que la ligne
   * n’est pas encore rafraîchie — permet d’afficher « Annuler » pendant tout le flux.
   */
  activeRunId: string | null;
  /**
   * True quand la reconnexion a constaté que le run était déjà terminé côté serveur
   * (réponse JSON au lieu du flux NDJSON) — permet de distinguer « flux reconnecté »
   * de « run déjà fini », au lieu de rester bloqué sur des étapes figées.
   */
  runTerminated: boolean;
}

/**
 * Délai laissé au flux pour livrer ses dernières lignes après que le statut persisté est devenu
 * terminal, avant de régler l’UI sur l’état persisté.
 */
const PERSISTED_TERMINAL_GRACE_MS = 10_000;

export function useWorkflowStream<T, M = unknown>(
  options: UseWorkflowStreamOptions,
): UseWorkflowStreamReturn<T, M> {
  const { api, runId, runStatus, activeStatuses } = options;

  const onStartOnlyRef = useRef(options.onStartOnly);
  onStartOnlyRef.current = options.onStartOnly;
  const onFinishRef = useRef(options.onFinish);
  onFinishRef.current = options.onFinish;

  const [object, setObject] = useState<Partial<T> | null>(null);
  const [streamMeta, setStreamMeta] = useState<M | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorStepKey, setErrorStepKey] = useState<string | null>(null);
  /** Run id issu du POST tant que React Query n’a pas encore le `workflow_run_id` en base */
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  /** Run déjà terminé côté serveur au moment de la reconnexion */
  const [runTerminated, setRunTerminated] = useState(false);

  /** Suiveur propriétaire de l’état : un suiveur remplacé ou arrêté ne touche plus à rien. */
  const abortControllerRef = useRef<AbortController | null>(null);
  /** Run suivi par le suiveur courant (POST ou reconnexion). */
  const followedRunIdRef = useRef<string | null>(null);
  /** Interrompt la lecture courante pour revérifier l’état du run (voir effet « nudge »). */
  const nudgeRef = useRef<(() => void) | null>(null);
  /** Termine le suivi courant sur l’état persisté (run zombie : flux jamais terminal). */
  const forceSettleRef = useRef<(() => void) | null>(null);

  const reconnectedRunIdRef = useRef<string | null>(null);
  /** Incrémenté après POST { startOnly: true } pour relancer la reconnexion même si runId inchangé (reprise du même run). */
  const [reconnectNonce, setReconnectNonce] = useState(0);

  /** En priorité le run issu du POST en cours : le cache React Query peut encore avoir un ancien `workflow_run_id`. */
  const activeRunId = pendingRunId ?? runId ?? null;

  const activeKey = activeStatuses.join('|');

  /**
   * Suit un run jusqu’à son état terminal confirmé par le serveur (reprise automatique si le flux
   * est coupé ou muet), puis relit l’état persisté (`onFinish`) avant de quitter le chargement.
   */
  const followAndSettle = useCallback(
    async (params: {
      controller: AbortController;
      runId: string | null;
      initialBody: ReadableStream<Uint8Array> | null;
    }) => {
      const { controller, initialBody } = params;
      const isCurrent = () => abortControllerRef.current === controller;
      /** Lecture interrompue par l’arrêt du suiveur OU par un règlement forcé. */
      const reading = new AbortController();
      const onControllerAbort = () => reading.abort();
      controller.signal.addEventListener('abort', onControllerAbort, { once: true });

      let settled = false;
      const settle = async (outcome: FollowWorkflowRunOutcome | { kind: 'persisted-terminal' }) => {
        if (settled || !isCurrent()) return;
        settled = true;
        if (forceSettleRef.current === forceSettle) forceSettleRef.current = null;

        if (outcome.kind === 'failed') {
          setError(new Error(outcome.message));
          setErrorStepKey(outcome.stepKey ?? null);
        } else if (outcome.kind === 'lost') {
          // Pas un échec du run : le statut persisté (polling React Query) prend le relais.
          console.warn('Suivi du flux workflow abandonné', {
            runId: params.runId,
            message: outcome.error.message,
          });
        } else if (outcome.kind === 'finished' && outcome.linesConsumed === 0 && !initialBody) {
          setRunTerminated(true);
        }

        try {
          await onFinishRef.current?.();
        } catch (finishError) {
          console.error('Workflow stream onFinish error:', finishError);
        }

        if (!isCurrent()) return;
        followedRunIdRef.current = null;
        setIsLoading(false);
        setPendingRunId(null);
      };
      const forceSettle = () => {
        reading.abort();
        void settle({ kind: 'persisted-terminal' });
      };
      forceSettleRef.current = forceSettle;

      const onChunk = (chunk: NdjsonChunk<T, M>) => {
        if (!isCurrent() || reading.signal.aborted) return;
        if (chunk.data !== undefined) setObject(chunk.data as Partial<T>);
        if (chunk.meta !== undefined) setStreamMeta(chunk.meta);
      };

      followedRunIdRef.current = params.runId;
      let outcome: FollowWorkflowRunOutcome;
      if (params.runId) {
        outcome = await followWorkflowRun<T, M>({
          runId: params.runId,
          initialBody,
          signal: reading.signal,
          onChunk,
          nudge: nudgeRef,
        });
      } else if (initialBody) {
        // Sans id de run (en-tête absent) : pas de reprise possible, lecture simple.
        const { end, lines } = await readNdjsonStream<T, M>(initialBody, {
          onChunk,
          signal: reading.signal,
        });
        outcome =
          end.kind === 'error-line'
            ? { kind: 'failed', message: end.message, stepKey: end.stepKey, linesConsumed: lines }
            : end.kind === 'aborted'
              ? { kind: 'aborted', linesConsumed: lines }
              : { kind: 'finished', linesConsumed: lines, confirmedByServer: true };
      } else {
        outcome = { kind: 'finished', linesConsumed: 0, confirmedByServer: true };
      }
      controller.signal.removeEventListener('abort', onControllerAbort);

      // Arrêt (stop, démontage, nouveau suiveur) : rien à régler. Règlement forcé : déjà en cours.
      if (outcome.kind === 'aborted') return;
      await settle(outcome);
    },
    [],
  );

  const submit = useCallback(async (payload: Record<string, unknown>) => {
    const startOnly = payload.startOnly === true;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setErrorStepKey(null);
    setObject(null);
    setStreamMeta(null);
    setRunTerminated(false);

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('Content-Type') ?? '';
      if (startOnly && contentType.includes('application/json')) {
        reconnectedRunIdRef.current = null;
        await onStartOnlyRef.current?.();
        if (reconnectedRunIdRef.current !== runId) {
          setReconnectNonce((n) => n + 1);
        }
        // La reconnexion (effet ci-dessous) devient le seul lecteur et gère la fin du chargement.
        return;
      }

      const headerRunId = response.headers.get('x-workflow-run-id')?.trim() || null;
      if (headerRunId) {
        setPendingRunId(headerRunId);
        // Ce run est déjà suivi ici : l’effet de reconnexion ne doit pas ouvrir un second lecteur.
        reconnectedRunIdRef.current = headerRunId;
      }

      await followAndSettle({ controller, runId: headerRunId, initialBody: response.body });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (abortControllerRef.current !== controller || controller.signal.aborted) return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setErrorStepKey(null);
      try {
        await onFinishRef.current?.();
      } catch (finishError) {
        console.error('Workflow stream onFinish error:', finishError);
      }
      if (abortControllerRef.current !== controller) return;
      setIsLoading(false);
      setPendingRunId(null);
    }
  }, [api, followAndSettle, runId]);

  // Reconnexion à un run actif (rechargement de page, démarrage côté serveur, startOnly).
  // Pas de cleanup qui abandonne le suivi sur un changement de statut : la fin est décidée par le
  // serveur (réponse terminale), le changement de statut ne fait que « pousser » une revérification.
  useLayoutEffect(() => {
    if (!runId) {
      reconnectedRunIdRef.current = null;
      return;
    }
    if (!runStatus || !activeStatuses.includes(runStatus)) return;
    if (pendingRunId && pendingRunId === runId) {
      reconnectedRunIdRef.current = runId;
      return;
    }
    if (reconnectedRunIdRef.current === runId) return;

    reconnectedRunIdRef.current = runId;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setErrorStepKey(null);
    setStreamMeta(null);
    setRunTerminated(false);

    void followAndSettle({ controller, runId, initialBody: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeStatuses suivi via activeKey
  }, [runId, runStatus, pendingRunId, reconnectNonce, activeKey, followAndSettle]);

  // « Nudge » : le statut persisté (polling) vient de passer d’actif à terminal pour le run suivi.
  // Si le flux est muet ou mort sans fermeture, on revérifie tout de suite au lieu d’attendre
  // le délai d’inactivité.
  // Si le serveur continue malgré tout d’annoncer le run « en cours » (run zombie réglé en `error`
  // par la réconciliation), on règle sur l’état persisté après un délai de grâce.
  const prevRunStateRef = useRef<{ runId: string | null; active: boolean } | null>(null);
  useEffect(() => {
    const active = !!runStatus && activeKey.split('|').includes(runStatus);
    const prev = prevRunStateRef.current;
    prevRunStateRef.current = { runId: runId ?? null, active };
    if (!prev || !prev.active || active) return;
    const followed = followedRunIdRef.current;
    if (!followed || prev.runId !== followed) return;
    nudgeRef.current?.();
    const forceSettle = forceSettleRef.current;
    const timer = setTimeout(() => {
      if (forceSettleRef.current === forceSettle) forceSettle?.();
    }, PERSISTED_TERMINAL_GRACE_MS);
    return () => clearTimeout(timer);
  }, [runId, runStatus, activeKey]);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    followedRunIdRef.current = null;
    forceSettleRef.current = null;
    setIsLoading(false);
    setPendingRunId(null);
    setErrorStepKey(null);
  }, []);

  useLayoutEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      // StrictMode (dev) rejoue montage → démontage → montage : sans ceci, la reconnexion
      // considérerait le run déjà suivi alors que son suiveur vient d’être interrompu.
      reconnectedRunIdRef.current = null;
    };
  }, []);

  return {
    object,
    streamMeta,
    isLoading,
    error,
    errorStepKey,
    submit,
    stop,
    activeRunId,
    runTerminated,
  };
}
