import { collectJobOffers } from '@/lib/radar/collectors/jobs';
import { upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';

async function fetchJobSignals(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.jobs) return [];
  return collectJobOffers(settings.jobSearchQueries);
}

async function persistJobSignals(orgId: string, signals: Awaited<ReturnType<typeof collectJobOffers>>) {
  'use step';

  return upsertSignals(orgId, signals);
}

export async function collectJobsWorkflow(orgId: string) {
  'use workflow';

  const signals = await fetchJobSignals(orgId);
  const persisted = await persistJobSignals(orgId, signals);
  return { collected: signals.length, persisted };
}
