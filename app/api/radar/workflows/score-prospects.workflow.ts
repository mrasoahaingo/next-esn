import { insertRunLog, recomputeProspectScores } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';

async function recompute(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  return recomputeProspectScores(orgId, settings.matchThreshold);
}

async function logScoringRun(orgId: string, result: { updated: number }) {
  'use step';
  await insertRunLog(orgId, 'scoring', result);
}

export async function scoreProspectsWorkflow(orgId: string) {
  'use workflow';

  const updated = await recompute(orgId);
  const result = { updated };
  await logScoringRun(orgId, result);
  return result;
}
