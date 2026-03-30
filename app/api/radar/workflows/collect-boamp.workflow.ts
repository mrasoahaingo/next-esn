import { collectPublicMarkets } from '@/lib/radar/collectors/boamp';
import { insertRunLog, upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';
import type { ApiCall, RawSignal } from '@/lib/radar/schemas';

async function fetchBoampSignals(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.boamp) return { signals: [] as RawSignal[], calls: [] as ApiCall[] };
  return collectPublicMarkets();
}

async function persistBoampSignals(orgId: string, signals: RawSignal[]) {
  'use step';

  return upsertSignals(orgId, signals);
}

async function logBoampRun(orgId: string, result: { collected: number; persisted: number; calls: ApiCall[] }) {
  'use step';
  await insertRunLog(orgId, 'boamp', result);
}

export async function collectBoampWorkflow(orgId: string) {
  'use workflow';

  const { signals, calls } = await fetchBoampSignals(orgId);
  const persisted = await persistBoampSignals(orgId, signals);
  const result = { collected: signals.length, persisted, calls };
  await logBoampRun(orgId, result);
  return { collected: signals.length, persisted };
}
