import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

const ACTIVE_POS_STATUSES = ['analyzing', 'generating'];

export function usePositionings() {
  return useQuery({
    queryKey: queryKeys.positionings.list(),
    queryFn: async () => {
      const res = await fetch('/api/positioning');
      if (!res.ok) throw new Error('Failed to fetch positionings');
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data as { status: string }[] | undefined;
      if (data?.some((p) => ACTIVE_POS_STATUSES.includes(p.status))) return 3000;
      return false;
    },
  });
}

export function usePositioning(id: string) {
  return useQuery({
    queryKey: queryKeys.positionings.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/positioning/${id}`);
      if (!res.ok) throw new Error('Failed to fetch positioning');
      return res.json();
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as { status: string } | undefined;
      if (data?.status && ACTIVE_POS_STATUSES.includes(data.status)) return 3000;
      return false;
    },
  });
}

export function useCreatePositioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { candidateId: string; missionId: string }) => {
      const res = await fetch('/api/positioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create positioning');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdatePositioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      const res = await fetch(`/api/positioning/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update positioning');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useExportPositioning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; [key: string]: unknown }) => {
      const res = await fetch(`/api/positioning/${id}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to export positioning');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
