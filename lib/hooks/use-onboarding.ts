'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'esneo-onboarding-completed';

// Listeners for useSyncExternalStore
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emitChange() {
  listeners.forEach((cb) => cb());
}

function getSnapshot() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function getServerSnapshot() {
  return true;
}

export function useOnboarding() {
  const completed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const markCompleted = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    emitChange();
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    emitChange();
  }, []);

  return { completed, markCompleted, reset };
}
