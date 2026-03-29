import { recomputeProspectScores } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';

async function recompute(orgId: string) {
  'use step';

  const settings = await getRadarSettings(orgId);
  return recomputeProspectScores(orgId, settings.matchThreshold);
}

export async function scoreProspectsWorkflow(orgId: string) {
  'use workflow';

  const updated = await recompute(orgId);
  return { updated };
}
