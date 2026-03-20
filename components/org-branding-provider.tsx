'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth, useOrganization } from '@clerk/nextjs';
import type { OrganizationSettingsRow } from '@/lib/types/organization-settings';

export type OrgBrandingContextValue = {
  displayName: string;
  appLogoUrl: string | null;
  settings: OrganizationSettingsRow | null;
  settingsLoaded: boolean;
  refetch: () => Promise<void>;
};

const OrgBrandingContext = createContext<OrgBrandingContextValue | null>(null);

export function OrgBrandingProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, orgId } = useAuth();
  const { organization } = useOrganization();
  const [settings, setSettings] = useState<OrganizationSettingsRow | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const refetch = useCallback(async () => {
    if (!orgId) {
      setSettings(null);
      setSettingsLoaded(true);
      return;
    }
    setSettingsLoaded(false);
    try {
      const res = await fetch('/api/org/settings');
      if (res.ok) {
        const data = (await res.json()) as OrganizationSettingsRow & { created_at: string | null };
        setSettings(data.created_at === null ? null : data);
      } else {
        setSettings(null);
      }
    } catch {
      setSettings(null);
    } finally {
      setSettingsLoaded(true);
    }
  }, [orgId]);

  useEffect(() => {
    if (!isSignedIn || !orgId) {
      setSettings(null);
      setSettingsLoaded(true);
      return;
    }
    void refetch();
  }, [isSignedIn, orgId, refetch]);

  const displayName =
    settings?.display_name?.trim() ||
    organization?.name ||
    'Organisation';

  const appLogoUrl = settings?.app_logo_url?.trim() || null;

  const value: OrgBrandingContextValue = {
    displayName,
    appLogoUrl,
    settings,
    settingsLoaded,
    refetch,
  };

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
