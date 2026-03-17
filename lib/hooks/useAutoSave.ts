import { useRef, useCallback } from 'react';

/**
 * Debounced auto-save hook that persists data to a PATCH endpoint.
 */
export function useAutoSave(positioningId: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((data: Record<string, unknown>) => {
    if (!positioningId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch(`/api/positioning/${positioningId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }, 1000);
  }, [positioningId]);
}
