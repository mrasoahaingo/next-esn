'use client';

import { useAuth } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef } from 'react';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { useTemplateStore } from '@/lib/stores/template.store';

/**
 * Vide le cache React Query et l'état local de tous les stores quand l'utilisateur,
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

    // Clear the entire React Query cache so no org-A data leaks into org-B.
    queryClient.clear();

    // Reset cv-builder store
    const cvBuilder = useCvBuilderStore.getState();
    cvBuilder.setCvData(null);
    cvBuilder.setPdfBlobUrl(null);
    cvBuilder.setIsPdfLoading(false);
    cvBuilder.setDirty(false);

    // Reset positioning store
    usePositioningStore.getState().reset();

    // Reset template store
    useTemplateStore.getState().setTemplateConfig(null);
  }, [isLoaded, userId, orgId, queryClient]);

  return null;
}
