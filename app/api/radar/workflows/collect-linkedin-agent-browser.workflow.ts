import { collectFreelanceParisAgentBrowser } from '@/lib/radar/collectors/linkedin-agent-browser';
import { insertRunLog, upsertSignals } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';
import type { ApiCall, RawSignal } from '@/lib/radar/schemas';

async function fetchLinkedInContextId(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  return settings.linkedinContextId ?? null;
}

async function collectAgentBrowserSignals(orgId: string, linkedinContextId: string | null) {
  'use step';

  return collectFreelanceParisAgentBrowser({ orgId, linkedinContextId });
}

async function persistAgentBrowserSignals(orgId: string, signals: RawSignal[]) {
  'use step';

  return upsertSignals(orgId, signals);
}

async function logAgentBrowserRun(
  orgId: string,
  result: { collected: number; persisted: number; calls: ApiCall[] },
) {
  'use step';

  await insertRunLog(orgId, 'linkedin-agent-browser', result);
}

export async function collectLinkedInAgentBrowserWorkflow(orgId: string) {
  'use workflow';

  const linkedinContextId = await fetchLinkedInContextId(orgId);
  const { signals, calls } = await collectAgentBrowserSignals(orgId, linkedinContextId);
  const persisted = await persistAgentBrowserSignals(orgId, signals);
  await logAgentBrowserRun(orgId, { collected: signals.length, persisted, calls });

  return { collected: signals.length, persisted };
}
