import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { queryKeys } from './keys';

interface CancelWorkflowParams {
  runId: string;
  table: 'candidates' | 'positionings' | 'missions';
  recordId: string;
  /** Ignoré pour table missions */
  resetStatus?: string;
  /** Invalider le détail mission après annulation (page position) */
  missionId?: string;
}

export function useCancelWorkflow() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async ({ runId, table, recordId, resetStatus }: CancelWorkflowParams) => {
      const res = await fetch(`/api/workflow/${runId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, recordId, resetStatus }),
      });
      if (!res.ok) throw new Error('Failed to cancel workflow');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      const oid = orgId ?? '';
      if (variables.table === 'candidates') {
        queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(oid, variables.recordId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list(oid) });
      } else if (variables.table === 'positionings') {
        queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(oid, variables.recordId) });
        queryClient.invalidateQueries({
          queryKey: queryKeys.positionings.analysisHistory(oid, variables.recordId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list(oid) });
      } else if (variables.table === 'missions') {
        queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, variables.recordId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
      }
      if (variables.missionId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, variables.missionId) });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    },
  });
}
