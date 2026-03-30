import { collectJobOffers } from '@/lib/radar/collectors/jobs';
import { insertRunLog, upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';
import type { ApiCall, RawSignal } from '@/lib/radar/schemas';

async function fetchJobSignals(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.jobs) return { signals: [] as RawSignal[], calls: [] as ApiCall[] };
  return collectJobOffers(settings.jobSearchQueries);
}

async function persistJobSignals(orgId: string, signals: RawSignal[]) {
  'use step';

  return upsertSignals(orgId, signals);
}

async function logJobRun(orgId: string, result: { collected: number; persisted: number; calls: ApiCall[] }) {
  'use step';
  await insertRunLog(orgId, 'jobs', result);
}

export async function collectJobsWorkflow(orgId: string) {
  'use workflow';

  const { signals, calls } = await fetchJobSignals(orgId);
  const persisted = await persistJobSignals(orgId, signals);
  const result = { collected: signals.length, persisted, calls };
  await logJobRun(orgId, result);
  return { collected: signals.length, persisted };
}
