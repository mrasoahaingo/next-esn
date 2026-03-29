import { enrichHotProspects } from '@/lib/radar/queries';

async function runLinkedInEnrichment(orgId: string, scoreThreshold: number) {
  'use step';
  return enrichHotProspects(orgId, scoreThreshold);
}

export async function enrichLinkedInWorkflow(orgId: string, scoreThreshold = 60) {
  'use workflow';
  const enriched = await runLinkedInEnrichment(orgId, scoreThreshold);
  return { enriched };
}
