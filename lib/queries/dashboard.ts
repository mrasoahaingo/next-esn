import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { queryKeys } from './keys';

export function useDashboard() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.dashboard.all(orgId ?? ''),
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    enabled: !!orgId,
  });
}
