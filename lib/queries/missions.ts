import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { JobPostingAnalysis } from '@/lib/schema';
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';
import { queryKeys } from './keys';

/** Champs diagnostic workflow renvoyés par l'API mission (phase 2 / ERR-03). */
export type MissionWorkflowDiagnostics = {
  workflow_last_error: WorkflowLastError | null;
};

/** Réponse `GET /api/missions/[id]` — champs nécessaires au hub positionnement (FLOW-02/03). */
export type MissionDetail = MissionWorkflowDiagnostics & {
  id: string;
  title?: string;
  company?: string | null;
  job_description?: string;
  job_analysis: JobPostingAnalysis | null;
  job_analysis_workflow_run_id: string | null;
  job_analysis_stale: boolean;
  global_skill_keys_understood?: string[];
  positionings?: unknown[];
};

const ACTIVE_POSITIONING_STATUSES = ['analyzing', 'generating'];
const ACTIVE_CANDIDATE_STATUSES = ['uploaded', 'extracting'];

export function useMissions() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.missions.list(orgId ?? ''),
    queryFn: async () => {
      const res = await fetch('/api/missions');
      if (!res.ok) throw new Error('Failed to fetch missions');
      return res.json();
    },
    enabled: !!orgId,
    refetchInterval: 60_000,
  });
}

export function useMission(id: string) {
  const { orgId } = useAuth();

  return useQuery<MissionDetail>({
    queryKey: queryKeys.missions.detail(orgId ?? '', id),
    queryFn: async () => {
      const res = await fetch(`/api/missions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch mission');
      return res.json() as Promise<MissionDetail>;
    },
    enabled: !!id && !!orgId,
    refetchInterval: (query) => {
      const data = query.state.data as
        | {
            job_analysis_workflow_run_id?: string | null;
            positionings?: Array<{ status?: string; candidates?: { status?: string } | null }>;
          }
        | undefined;

      const hasActiveJobAnalysis = !!data?.job_analysis_workflow_run_id;
      const hasActivePositioning = data?.positionings?.some((p) =>
        ACTIVE_POSITIONING_STATUSES.includes(p.status ?? ''),
      );
      const hasActiveCandidate = data?.positionings?.some((p) =>
        ACTIVE_CANDIDATE_STATUSES.includes(p.candidates?.status ?? ''),
      );

      if (hasActiveJobAnalysis || hasActivePositioning || hasActiveCandidate) return 3000;
      return false;
    },
  });
}

export function useCreateMission() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

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
    onSuccess: (data: Record<string, unknown> & { id?: string }) => {
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
      if (data?.id) {
        queryClient.setQueryData(queryKeys.missions.detail(oid, data.id as string), data);
        queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, data.id as string) });
      }
    },
  });
}

export function usePositionExistingCandidates() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

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
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, variables.missionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.all(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}

export function useDeleteMission() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/missions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete mission');
      return res.json();
    },
    onSuccess: (_data, id) => {
      const oid = orgId ?? '';
      queryClient.removeQueries({ queryKey: queryKeys.missions.detail(oid, id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.all(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}

export function useUploadCvsForMission() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

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
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, variables.missionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}
