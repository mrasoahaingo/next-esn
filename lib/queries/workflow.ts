import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

interface CancelWorkflowParams {
  runId: string;
  table: 'candidates' | 'positionings';
  recordId: string;
  resetStatus: string;
}

export function useCancelWorkflow() {
  const queryClient = useQueryClient();

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
      if (variables.table === 'candidates') {
        queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(variables.recordId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list() });
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(variables.recordId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list() });
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}
