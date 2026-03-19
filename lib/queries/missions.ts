import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

const ACTIVE_POSITIONING_STATUSES = ['analyzing', 'generating'];
const ACTIVE_CANDIDATE_STATUSES = ['uploaded', 'extracting'];

export function useMissions() {
  return useQuery({
    queryKey: queryKeys.missions.list(),
    queryFn: async () => {
      const res = await fetch('/api/missions');
      if (!res.ok) throw new Error('Failed to fetch missions');
      return res.json();
    },
  });
}

export function useMission(id: string) {
  return useQuery({
    queryKey: queryKeys.missions.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/missions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch mission');
      return res.json();
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as
        | { positionings?: Array<{ status?: string; candidates?: { status?: string } | null }> }
        | undefined;

      const hasActivePositioning = data?.positionings?.some((p) =>
        ACTIVE_POSITIONING_STATUSES.includes(p.status ?? ''),
      );
      const hasActiveCandidate = data?.positionings?.some((p) =>
        ACTIVE_CANDIDATE_STATUSES.includes(p.candidates?.status ?? ''),
      );

      if (hasActivePositioning || hasActiveCandidate) return 3000;
      return false;
    },
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { title: string; company: string | null; jobDescription: string }) => {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create mission');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list() });
    },
  });
}

export function usePositionExistingCandidates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ missionId, candidateIds }: { missionId: string; candidateIds: string[] }) => {
      const results = await Promise.all(
        candidateIds.map(candidateId =>
          fetch('/api/positioning', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId, missionId }),
          }).then(r => {
            if (!r.ok) throw new Error('Failed to create positioning');
            return r.json();
          })
        )
      );
      return results;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(variables.missionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUploadCvsForMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ missionId, files }: { missionId: string; files: File[] }) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }
      const res = await fetch(`/api/missions/${missionId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const payload = await res.json();
      if (!res.ok) {
        const firstError = payload?.errors?.[0];
        throw new Error(firstError ? `${firstError.fileName}: ${firstError.error}` : payload?.error ?? 'Upload failed');
      }
      return payload;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(variables.missionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
