import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { queryKeys } from './keys';
import type { OrganizationSettingsRow } from '@/lib/types/organization-settings';

export function useOrgSettings() {
  const { isSignedIn, orgId } = useAuth();

  return useQuery({
    queryKey: queryKeys.org.settings(orgId ?? ''),
    queryFn: async () => {
      const res = await fetch('/api/org/settings');
      if (!res.ok) throw new Error('Failed to fetch org settings');
      const data = (await res.json()) as OrganizationSettingsRow & { created_at: string | null };
      return data.created_at === null ? null : data;
    },
    enabled: !!isSignedIn && !!orgId,
  });
}
