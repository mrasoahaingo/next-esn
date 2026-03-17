import { useEffect, useRef, useCallback } from 'react';

/**
 * Tracks active user time on a page and periodically flushes it to the server.
 * Pauses when the tab is hidden. Uses sendBeacon on unload for reliability.
 */
export function useSessionTimer(options: {
  endpoint: string;
  enabled: boolean;
  flushIntervalMs?: number;
}) {
  const { endpoint, enabled, flushIntervalMs = 30_000 } = options;
  const accumulatedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const endpointRef = useRef(endpoint);

  useEffect(() => {
    endpointRef.current = endpoint;
  }, [endpoint]);

  const flush = useCallback(() => {
    const seconds = accumulatedRef.current;
    if (seconds <= 0) return;
    accumulatedRef.current = 0;

    // Fire-and-forget POST
    const body = JSON.stringify({ seconds });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        endpointRef.current,
        new Blob([body], { type: 'application/json' }),
      );
    } else {
      fetch(endpointRef.current, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      lastTickRef.current = null;
      return;
    }

    lastTickRef.current = Date.now();

    // Tick every second to accumulate active time
    const tickInterval = setInterval(() => {
      if (document.visibilityState === 'hidden' || lastTickRef.current === null) return;
      const now = Date.now();
      const elapsed = Math.round((now - lastTickRef.current) / 1000);
      if (elapsed > 0 && elapsed < 5) {
        // Cap at 5s to avoid counting time when laptop was sleeping
        accumulatedRef.current += elapsed;
      }
      lastTickRef.current = now;
    }, 1000);

    // Flush periodically
    const flushInterval = setInterval(flush, flushIntervalMs);

    // Pause/resume on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        lastTickRef.current = null;
        flush();
      } else {
        lastTickRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Flush on page unload
    const handleUnload = () => flush();
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(tickInterval);
      clearInterval(flushInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      flush();
    };
  }, [enabled, flush, flushIntervalMs]);
}
