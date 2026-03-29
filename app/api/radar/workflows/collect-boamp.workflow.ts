import { collectPublicMarkets } from '@/lib/radar/collectors/boamp';
import { upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';

async function fetchBoampSignals(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.boamp) return [];
  return collectPublicMarkets();
}

async function persistBoampSignals(orgId: string, signals: Awaited<ReturnType<typeof collectPublicMarkets>>) {
  'use step';

  return upsertSignals(orgId, signals);
}

export async function collectBoampWorkflow(orgId: string) {
  'use workflow';

  const signals = await fetchBoampSignals(orgId);
  const persisted = await persistBoampSignals(orgId, signals);
  return { collected: signals.length, persisted };
}
