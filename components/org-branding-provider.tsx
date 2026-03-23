'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import type { OrganizationSettingsRow } from '@/lib/types/organization-settings';
import { useOrgSettings } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/keys';

export type OrgBrandingContextValue = {
  displayName: string;
  appLogoUrl: string | null;
  settings: OrganizationSettingsRow | null;
  settingsLoaded: boolean;
  refetch: () => Promise<void>;
};

const OrgBrandingContext = createContext<OrgBrandingContextValue | null>(null);

export function OrgBrandingProvider({ children }: { children: ReactNode }) {
  const { orgId } = useAuth();
  const { organization } = useOrganization();
  const queryClient = useQueryClient();

  const { data: settings, isFetched } = useOrgSettings();

  const settingsLoaded = !orgId ? true : isFetched;

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.org.settings(orgId ?? '') });
  }, [queryClient, orgId]);

  const displayName = useMemo(
    () =>
      settings?.display_name?.trim() ||
      organization?.name ||
      'Organisation',
    [settings?.display_name, organization?.name],
  );

  const appLogoUrl = settings?.app_logo_url?.trim() || null;

  const value: OrgBrandingContextValue = useMemo(
    () => ({
      displayName,
      appLogoUrl,
      settings: settings ?? null,
      settingsLoaded,
      refetch,
    }),
    [displayName, appLogoUrl, settings, settingsLoaded, refetch],
  );

  return (
    <OrgBrandingContext.Provider value={value}>{children}</OrgBrandingContext.Provider>
  );
}

export function useOrgBranding(): OrgBrandingContextValue {
  const ctx = useContext(OrgBrandingContext);
  if (!ctx) {
    return {
      displayName: 'Organisation',
      appLogoUrl: null,
      settings: null,
      settingsLoaded: true,
      refetch: async () => {},
    };
  }
  return ctx;
}
