'use client';

import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef } from 'react';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';

/**
 * Vide le cache React Query et l'état local du builder CV quand l'utilisateur,
 * l'organisation ou la session change (logout, switch de compte, switch d'org).
 */
export function AuthQuerySync() {
  const { isLoaded, userId, orgId } = useAuth();
  const queryClient = useQueryClient();
  const prevKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!isLoaded) return;
    const key = `${userId ?? ''}:${orgId ?? ''}`;
    if (prevKeyRef.current === null) {
      prevKeyRef.current = key;
      return;
    }
    if (prevKeyRef.current === key) return;

    prevKeyRef.current = key;
    queryClient.clear();
    const s = useCvBuilderStore.getState();
    s.setCvData(null);
    s.setPdfBlobUrl(null);
    s.setIsPdfLoading(false);
    s.setDirty(false);
  }, [isLoaded, userId, orgId, queryClient]);

  return null;
}
