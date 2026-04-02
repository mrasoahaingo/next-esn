import { enrichHotProspects, insertRunLog } from '@/lib/radar/queries';

async function runLinkedInEnrichment(orgId: string, scoreThreshold: number) {
  'use step';
  return enrichHotProspects(orgId, scoreThreshold);
}

async function logEnrichmentRun(orgId: string, result: { enriched: number }) {
  'use step';
  await insertRunLog(orgId, 'enrichment', result);
}

export async function enrichLinkedInWorkflow(orgId: string, scoreThreshold = 60) {
  'use workflow';
  const enriched = await runLinkedInEnrichment(orgId, scoreThreshold);
  const result = { enriched };
  await logEnrichmentRun(orgId, result);
  return result;
}
