import { collectPressSignals } from '@/lib/radar/collectors/press';
import { upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';

async function fetchPressSignals(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.press) return [];
  return collectPressSignals(settings.pressRssUrls);
}

async function persistPressSignals(orgId: string, signals: Awaited<ReturnType<typeof collectPressSignals>>) {
  'use step';

  return upsertSignals(orgId, signals);
}

export async function collectPressWorkflow(orgId: string) {
  'use workflow';

  const signals = await fetchPressSignals(orgId);
  const persisted = await persistPressSignals(orgId, signals);
  return { collected: signals.length, persisted };
}
