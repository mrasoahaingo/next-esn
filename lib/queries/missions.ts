import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

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
