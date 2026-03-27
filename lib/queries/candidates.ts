import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';
import { queryKeys } from './keys';

/** Champs diagnostic workflow renvoyés par l'API candidat (phase 2 / ERR-03). */
export type CandidateWorkflowDiagnostics = {
  workflow_last_error: WorkflowLastError | null;
};

const ACTIVE_CV_STATUSES = ['extracting'];

export function useCandidates() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.candidates.list(orgId ?? ''),
    queryFn: async () => {
      const res = await fetch('/api/candidates');
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
    enabled: !!orgId,
    refetchInterval: (query) => {
      const data = query.state.data as { status: string }[] | undefined;
      if (data?.some((c) => ACTIVE_CV_STATUSES.includes(c.status))) return 3000;
      return 60_000;
    },
  });
}

export function useCandidate(id: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.candidates.detail(orgId ?? '', id),
    queryFn: async () => {
      const res = await fetch(`/api/candidates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch candidate');
      return res.json();
    },
    enabled: !!id && !!orgId,
    refetchInterval: (query) => {
      const data = query.state.data as { status: string } | undefined;
      if (data?.status && ACTIVE_CV_STATUSES.includes(data.status)) return 3000;
      return false;
    },
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

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
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(oid, variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete candidate');
      return res.json();
    },
    onSuccess: () => {
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}

export function useUploadCv() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: () => {
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}
