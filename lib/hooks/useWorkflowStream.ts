'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseWorkflowStreamOptions {
  api: string;
  runId?: string | null;
  runStatus?: string | null;
  activeStatuses: string[];
  onFinish?: () => void;
}

interface UseWorkflowStreamReturn<T> {
  object: Partial<T> | null;
  isLoading: boolean;
  error: Error | null;
  submit: (body: Record<string, unknown>) => void;
  stop: () => void;
}

async function consumeNdjsonStream<T>(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (data: Partial<T>) => void,
  chunkIndexRef: { current: number },
  abortSignal: AbortSignal,
) {
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!abortSignal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const chunk = JSON.parse(trimmed);
          if (chunk.index !== undefined) {
            chunkIndexRef.current = chunk.index;
          }
          if (chunk.data !== undefined) {
            onChunk(chunk.data as Partial<T>);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function useWorkflowStream<T>(options: UseWorkflowStreamOptions): UseWorkflowStreamReturn<T> {
  const { api, runId, runStatus, activeStatuses, onFinish } = options;

  const [object, setObject] = useState<Partial<T> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const chunkIndexRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Track whether we already attempted reconnection for this runId
  const reconnectedRunIdRef = useRef<string | null>(null);

  const startConsuming = useCallback(async (
    response: Response,
    signal: AbortSignal,
  ) => {
    const body = response.body;
    if (!body) return;

    const reader = body.getReader();
    await consumeNdjsonStream<T>(
      reader,
      (data) => setObject(data),
      chunkIndexRef,
      signal,
    );
  }, []);

  // Submit: start a new workflow
  const submit = useCallback(async (body: Record<string, unknown>) => {
    // Abort any previous stream
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setObject(null);
    chunkIndexRef.current = 0;

    try {
      const response = await fetch(api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      await startConsuming(response, controller.signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        onFinishRef.current?.();
      }
    }
  }, [api, startConsuming]);

  // Reconnect to an existing workflow run on mount
  useEffect(() => {
    if (!runId) return;
    if (!runStatus || !activeStatuses.includes(runStatus)) return;
    if (reconnectedRunIdRef.current === runId) return;

    reconnectedRunIdRef.current = runId;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

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
            setIsLoading(false);
            onFinishRef.current?.();
            return;
          }
          throw new Error(data.error ?? `HTTP ${response.status}`);
        }

        // Check if it's a JSON status response (workflow finished)
        const contentType = response.headers.get('Content-Type') ?? '';
        if (contentType.includes('application/json')) {
          setIsLoading(false);
          onFinishRef.current?.();
          return;
        }

        await startConsuming(response, controller.signal);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          onFinishRef.current?.();
        }
      }
    })();

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, runStatus]);

  // Stop: abort the client-side stream (used before calling cancel API)
  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { object, isLoading, error, submit, stop };
}
