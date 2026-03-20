import { getSupabase } from '@/lib/utils/supabase';
import type { OrganizationSettingsRow } from '@/lib/types/organization-settings';

export async function getOrganizationSettings(
  orgId: string,
): Promise<OrganizationSettingsRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('organization_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle();

  if (error) throw error;
  return data as OrganizationSettingsRow | null;
}

export type PositioningPromptBranding = {
  displayName: string;
  brandContextBlock: string;
};

export function toPositioningPromptBranding(
  settings: OrganizationSettingsRow | null,
): PositioningPromptBranding {
  const displayName = settings?.display_name?.trim() || 'votre organisation';
  const ctx = settings?.positioning_brand_context?.trim();
  const brandContextBlock = ctx
    ? `## Contexte entreprise\n${ctx}\n\n`
    : '';
  return { displayName, brandContextBlock };
}
