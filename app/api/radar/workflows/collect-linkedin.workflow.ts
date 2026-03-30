import { getSupabase } from '@/lib/utils/supabase';
import { collectLinkedInSignals } from '@/lib/radar/collectors/linkedin';
import { collectLinkedInBrowserSignals } from '@/lib/radar/collectors/linkedin-browser';
import { insertRunLog, upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';
import type { ApiCall, RawSignal } from '@/lib/radar/schemas';

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

async function fetchAllLinkedInSignals(urls: string[]) {
  'use step';

  const [proxycurl, browser] = await Promise.all([
    collectLinkedInSignals(urls),
    collectLinkedInBrowserSignals(urls),
  ]);

  return {
    signals: [...proxycurl.signals, ...browser.signals],
    calls: [...proxycurl.calls, ...browser.calls],
  };
}

async function persistLinkedInSignals(orgId: string, signals: RawSignal[]) {
  'use step';

  return upsertSignals(orgId, signals);
}

async function logLinkedInRun(orgId: string, result: { collected: number; persisted: number; urlCount: number; calls: ApiCall[] }) {
  'use step';
  await insertRunLog(orgId, 'linkedin', result);
}

export async function collectLinkedInWorkflow(orgId: string) {
  'use workflow';

  const urls = await fetchCompanyUrls(orgId);
  if (urls.length === 0) {
    await logLinkedInRun(orgId, { collected: 0, persisted: 0, urlCount: 0, calls: [] });
    return { collected: 0, persisted: 0 };
  }

  const { signals, calls } = await fetchAllLinkedInSignals(urls);
  const persisted = await persistLinkedInSignals(orgId, signals);
  const result = { collected: signals.length, persisted, urlCount: urls.length, calls };
  await logLinkedInRun(orgId, result);
  return { collected: signals.length, persisted };
}
