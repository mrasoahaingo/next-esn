import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';
import type { PositioningAnalysis } from '@/lib/schema';
import type { PositioningAnalysisModelsSnapshot } from '@/lib/types/positioning-analysis-models';
import type { PositioningAnalysisSnapshotReason } from '@/lib/types/positioning-analysis-snapshot-payload';
import { queryKeys } from './keys';

/** Entrée renvoyée par GET /api/positioning/[id]/analysis-history (snapshots `ai_usage_log`) */
export type PositioningAnalysisHistoryRow = {
  id: string;
  created_at: string;
  analysis: PositioningAnalysis | Record<string, unknown> | null;
  answers: Record<string, unknown> | null;
  ai_analysis_models?: PositioningAnalysisModelsSnapshot | null;
  /** Origine du snapshot (voir `positioning_analysis_snapshot` v1 dans `output_payload`). */
  snapshot_reason?: PositioningAnalysisSnapshotReason | null;
};

/** Champs diagnostic workflow renvoyés par l'API positionnement (phase 2 / ERR-03). */
export type PositioningWorkflowDiagnostics = {
  workflow_last_error: WorkflowLastError | null;
};

const ACTIVE_POS_STATUSES = ['analyzing', 'generating'];

export function usePositionings() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.positionings.list(orgId ?? ''),
    queryFn: async () => {
      const res = await fetch('/api/positioning');
      if (!res.ok) throw new Error('Failed to fetch positionings');
      return res.json();
    },
    enabled: !!orgId,
    refetchInterval: (query) => {
      const data = query.state.data as { status: string }[] | undefined;
      if (data?.some((p) => ACTIVE_POS_STATUSES.includes(p.status))) return 3000;
      return 60_000;
    },
  });
}

export function usePositioning(id: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.positionings.detail(orgId ?? '', id),
    queryFn: async () => {
      const res = await fetch(`/api/positioning/${id}`);
      if (!res.ok) throw new Error('Failed to fetch positioning');
      return res.json();
    },
    enabled: !!id && !!orgId,
    refetchInterval: (query) => {
      const data = query.state.data as { status: string } | undefined;
      if (data?.status && ACTIVE_POS_STATUSES.includes(data.status)) return 3000;
      return false;
    },
  });
}

export function usePositioningAnalysisHistory(id: string) {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.positionings.analysisHistory(orgId ?? '', id),
    queryFn: async () => {
      const res = await fetch(`/api/positioning/${id}/analysis-history`);
      if (!res.ok) throw new Error('Failed to fetch analysis history');
      return res.json() as Promise<PositioningAnalysisHistoryRow[]>;
    },
    enabled: !!id && !!orgId,
    staleTime: 30_000,
  });
}

export function useCreatePositioning() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

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
    onSuccess: (data: { id?: string }) => {
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(oid, data.id) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.positionings.analysisHistory(oid, data.id),
        });
      }
    },
  });
}

export function useUpdatePositioning() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

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
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(oid, variables.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.positionings.analysisHistory(oid, variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}

export function useExportPositioning() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

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
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(oid, variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}

export function useDeletePositioning() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async (variables: { id: string; candidateId: string; missionId?: string }) => {
      const res = await fetch(`/api/positioning/${variables.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete positioning');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      const oid = orgId ?? '';
      queryClient.removeQueries({ queryKey: queryKeys.positionings.detail(oid, variables.id) });
      queryClient.removeQueries({
        queryKey: queryKeys.positionings.analysisHistory(oid, variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(oid, variables.candidateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
      if (variables.missionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, variables.missionId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
    },
  });
}
