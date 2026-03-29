import { getSupabase } from '@/lib/utils/supabase';
import { collectLinkedInSignals } from '@/lib/radar/collectors/linkedin';
import { upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';

async function fetchCompanyUrls(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.linkedin) return [];

  const { data, error } = await getSupabase()
    .from('radar_companies')
    .select('linkedin_url')
    .eq('org_id', orgId)
    .not('linkedin_url', 'is', null);

  if (error) throw error;
  return [
    ...new Set([
      ...settings.linkedinCompanyUrls,
      ...((data ?? []).map((row) => row.linkedin_url).filter(Boolean) as string[]),
    ]),
  ];
}

async function fetchLinkedInSignals(urls: string[]) {
  'use step';

  return collectLinkedInSignals(urls);
}

async function persistLinkedInSignals(orgId: string, signals: Awaited<ReturnType<typeof collectLinkedInSignals>>) {
  'use step';

  return upsertSignals(orgId, signals);
}

export async function collectLinkedInWorkflow(orgId: string) {
  'use workflow';

  const urls = await fetchCompanyUrls(orgId);
  if (urls.length === 0) return { collected: 0, persisted: 0 };

  const signals = await fetchLinkedInSignals(urls);
  const persisted = await persistLinkedInSignals(orgId, signals);
  return { collected: signals.length, persisted };
}
