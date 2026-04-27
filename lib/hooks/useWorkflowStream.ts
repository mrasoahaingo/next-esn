'use client';

import { useState, useLayoutEffect, useRef, useCallback } from 'react';

interface UseWorkflowStreamOptions {
  api: string;
  runId?: string | null;
  runStatus?: string | null;
  activeStatuses: string[];
  onFinish?: () => void;
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
}

async function consumeNdjsonStream<T, M>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (chunk: { data?: Partial<T>; meta?: M }) => void,
  onError: (error: Error, stepKey?: string) => void,
  chunkIndexRef: { current: number },
  abortSignal: AbortSignal,
) {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!abortSignal.aborted) {
      const { done, value } = await reader.read();
      if (done) {
        // Flush remaining buffer on stream close
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer.trim()) as {
              index?: number;
              data?: Partial<T>;
              meta?: M;
              error?: string;
              stepKey?: string;
            };
            if (chunk.error) {
              onError(new Error(chunk.error), chunk.stepKey);
              return;
            }
            if (chunk.index !== undefined) {
              chunkIndexRef.current = chunk.index;
            }
            onChunk({
              ...(chunk.data !== undefined ? { data: chunk.data } : {}),
              ...(chunk.meta !== undefined ? { meta: chunk.meta } : {}),
            });
          } catch {
            // Skip malformed trailing data
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed) as {
            index?: number;
            data?: Partial<T>;
            meta?: M;
            error?: string;
            stepKey?: string;
          };
          if (chunk.error) {
            onError(new Error(chunk.error), chunk.stepKey);
            return;
          }
          if (chunk.index !== undefined) {
            chunkIndexRef.current = chunk.index;
          }
          onChunk({
            ...(chunk.data !== undefined ? { data: chunk.data } : {}),
            ...(chunk.meta !== undefined ? { meta: chunk.meta } : {}),
          });
        } catch {
          // Skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function useWorkflowStream<T, M = unknown>(
  options: UseWorkflowStreamOptions,
): UseWorkflowStreamReturn<T, M> {
  const { api, runId, runStatus, activeStatuses, onFinish } = options;

  const onStartOnlyRef = useRef(options.onStartOnly);
  onStartOnlyRef.current = options.onStartOnly;

  const [object, setObject] = useState<Partial<T> | null>(null);
  const [streamMeta, setStreamMeta] = useState<M | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [errorStepKey, setErrorStepKey] = useState<string | null>(null);
  /** Run id issu du POST tant que React Query n’a pas encore le `workflow_run_id` en base */
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);

  const chunkIndexRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Track whether we already attempted reconnection for this runId
  const reconnectedRunIdRef = useRef<string | null>(null);
  /** Incrémenté après POST { startOnly: true } pour relancer la reconnexion même si runId inchangé (reprise du même run). */
  const [reconnectNonce, setReconnectNonce] = useState(0);

  /** En priorité le run issu du POST en cours : le cache React Query peut encore avoir un ancien `workflow_run_id`. */
  const activeRunId = pendingRunId ?? runId ?? null;

  const startConsuming = useCallback(async (
    response: Response,
    signal: AbortSignal,
  ) => {
    const body = response.body;
    if (!body) return;

    const reader = body.getReader();
    await consumeNdjsonStream<T, M>(
      reader,
      (chunk) => {
        if (chunk.data !== undefined) {
          setObject(chunk.data as Partial<T>);
        }
        if (chunk.meta !== undefined) {
          setStreamMeta(chunk.meta);
        }
      },
      (err, stepKey) => {
        setError(err);
        setErrorStepKey(stepKey ?? null);
      },
      chunkIndexRef,
      signal,
    );
  }, []);

  // Submit: start a new workflow
  const submit = useCallback(async (payload: Record<string, unknown>) => {
    const startOnly = payload.startOnly === true;

    // Abort any previous stream
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setErrorStepKey(null);
    setObject(null);
    setStreamMeta(null);
    chunkIndexRef.current = 0;

    let delegatedToReconnect = false;

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
        // Ne pas forcer une reconnexion si l'effet s'est déjà reconnecté au même run pendant le refetch
        if (reconnectedRunIdRef.current !== runId) {
          setReconnectNonce((n) => n + 1);
        }
        delegatedToReconnect = true;
        return;
      }

      const headerRunId = response.headers.get('x-workflow-run-id')?.trim();
      if (headerRunId) {
        setPendingRunId(headerRunId);
      }

      await startConsuming(response, controller.signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err : new Error(String(err)));
      setErrorStepKey(null);
    } finally {
      if (delegatedToReconnect) {
        return;
      }
      setIsLoading(false);
      setPendingRunId(null);
      if (!controller.signal.aborted) {
        onFinishRef.current?.();
      }
    }
  }, [api, startConsuming, runId]);

  // Reconnect to an existing workflow run on mount (ex. rechargement de page).
  // Ne pas ouvrir un second flux si submit() consomme déjà le POST pour le même runId :
  // deux lecteurs entrelacent les setObject (UI qui saute, clés / textes dupliqués).
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

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setErrorStepKey(null);
    setStreamMeta(null);

    (async () => {
      try {
        const response = await fetch(
          `/api/workflow/${runId}/stream?startIndex=0`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          // Workflow already finished
          if (data.status === 'completed' || data.status === 'failed') {
            return;
          }
          throw new Error(data.error ?? `HTTP ${response.status}`);
        }

        // Check if it's a JSON status response (workflow finished)
        const contentType = response.headers.get('Content-Type') ?? '';
        if (contentType.includes('application/json')) {
          return;
        }

        await startConsuming(response, controller.signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setErrorStepKey(null);
      } finally {
        setIsLoading(false);
        if (!controller.signal.aborted) {
          onFinishRef.current?.();
        }
      }
    })();

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, runStatus, pendingRunId, reconnectNonce]);

  // Stop: abort the client-side stream (used before calling cancel API)
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setPendingRunId(null);
    setErrorStepKey(null);
  }, []);

  // Cleanup on unmount
  useLayoutEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { object, streamMeta, isLoading, error, errorStepKey, submit, stop, activeRunId };
}
