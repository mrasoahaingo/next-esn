import { collectLinkedInDiscovery } from '@/lib/radar/collectors/linkedin-discovery';
import { upsertDiscoveredCompany, insertRunLog } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';

async function fetchDiscoveryConfig(orgId: string) {
  'use step';
  const settings = await getRadarSettings(orgId);
  if (!settings.linkedinDiscovery.enabled) return null;
  return settings.linkedinDiscovery;
}

async function runDiscoveryCollector(config: NonNullable<Awaited<ReturnType<typeof fetchDiscoveryConfig>>>) {
  'use step';
  return collectLinkedInDiscovery(config);
}

async function persistDiscoveredCompanies(
  orgId: string,
  companies: Awaited<ReturnType<typeof collectLinkedInDiscovery>>['companies'],
) {
  'use step';
  let upserted = 0;
  for (const company of companies) {
    if (!company.linkedinUrl) continue;
    try {
      await upsertDiscoveredCompany(orgId, {
        name: company.name,
        linkedinUrl: company.linkedinUrl,
        sector: company.sector,
        headcount: company.headcount,
        city: company.city,
      });
      upserted += 1;
    } catch (error) {
      console.error('persistDiscoveredCompanies:', company.name, error);
    }
  }
  return upserted;
}

async function logDiscoveryRun(
  orgId: string,
  result: { collected: number; upserted: number; calls: Awaited<ReturnType<typeof collectLinkedInDiscovery>>['calls'] },
) {
  'use step';
  await insertRunLog(orgId, 'linkedin-discovery', result as Record<string, unknown>);
}

export async function collectLinkedInDiscoveryWorkflow(orgId: string) {
  'use workflow';

  const config = await fetchDiscoveryConfig(orgId);
  if (!config) {
    await logDiscoveryRun(orgId, { collected: 0, upserted: 0, calls: [] });
    return { collected: 0, upserted: 0 };
  }

  const { companies, calls } = await runDiscoveryCollector(config);
  const upserted = await persistDiscoveredCompanies(orgId, companies);
  await logDiscoveryRun(orgId, { collected: companies.length, upserted, calls });
  return { collected: companies.length, upserted };
}
