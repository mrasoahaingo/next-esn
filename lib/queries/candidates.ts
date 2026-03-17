import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

export function useCandidates() {
  return useQuery({
    queryKey: queryKeys.candidates.list(),
    queryFn: async () => {
      const res = await fetch('/api/candidates');
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
  });
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: queryKeys.candidates.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/candidates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch candidate');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update candidate');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUploadCv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
