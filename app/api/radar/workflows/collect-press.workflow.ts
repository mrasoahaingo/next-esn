import { collectPressSignals } from '@/lib/radar/collectors/press';
import { insertRunLog, upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';
import type { ApiCall, RawSignal } from '@/lib/radar/schemas';

async function fetchPressSignals(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.press) return { signals: [] as RawSignal[], calls: [] as ApiCall[] };
  return collectPressSignals(settings.pressRssUrls);
}

async function persistPressSignals(orgId: string, signals: RawSignal[]) {
  'use step';

  return upsertSignals(orgId, signals);
}

async function logPressRun(orgId: string, result: { collected: number; persisted: number; calls: ApiCall[] }) {
  'use step';
  await insertRunLog(orgId, 'press', result);
}

export async function collectPressWorkflow(orgId: string) {
  'use workflow';

  const { signals, calls } = await fetchPressSignals(orgId);
  const persisted = await persistPressSignals(orgId, signals);
  const result = { collected: signals.length, persisted, calls };
  await logPressRun(orgId, result);
  return { collected: signals.length, persisted };
}
