import { z } from 'zod';
import { Stagehand } from '@browserbasehq/stagehand';
import type { LinkedInDiscovery } from '@/lib/radar/settings';
import type { ApiCall } from '@/lib/radar/schemas';

// ─── Schémas locaux ───────────────────────────────────────────────────────────

const DiscoveredCompanySchema = z.object({
  name: z.string(),
  linkedinUrl: z.string().optional(),
  sector: z.string().optional(),
  headcount: z.number().optional(),
  city: z.string().optional(),
});

const CompanySearchResultSchema = z.object({
  companies: z.array(DiscoveredCompanySchema).default([]),
});

export type DiscoveredCompany = z.infer<typeof DiscoveredCompanySchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createStagehand() {
  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    // @ts-expect-error — modelName exists at runtime (Stagehand V3 types incomplete)
    modelName: 'gpt-4o-mini',
    modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
    verbose: 0,
  });
}

function dedupeByLinkedinUrl(companies: DiscoveredCompany[]): DiscoveredCompany[] {
  const seen = new Set<string>();
  return companies.filter((c) => {
    if (!c.linkedinUrl) return false;
    if (seen.has(c.linkedinUrl)) return false;
    seen.add(c.linkedinUrl);
    return true;
  });
}

// ─── Collecteur principal ────────────────────────────────────────────────────

export async function collectLinkedInDiscovery(
  config: LinkedInDiscovery,
): Promise<{ companies: DiscoveredCompany[]; calls: ApiCall[] }> {
  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    return { companies: [], calls: [] };
  }

  const allCompanies: DiscoveredCompany[] = [];
  const calls: ApiCall[] = [];

  // Termes de recherche : keywords + sectors, dédupliqués, max 5
  const terms = [...new Set([...config.keywords, ...config.sectors])].slice(0, 5);

  const stagehand = createStagehand();
  await stagehand.init();

  try {
    for (const term of terms) {
      const url = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(term)}&origin=SWITCH_SEARCH_VERTICAL`;

      try {
        // @ts-expect-error — Stagehand V3 types incomplete, page exists at runtime
        await stagehand.page.goto(url, { waitUntil: 'domcontentloaded' });
        await new Promise((r) => setTimeout(r, 2000));

        // @ts-expect-error — Stagehand V3 types incomplete, extract() exists at runtime
        const raw = await stagehand.extract({
          instruction:
            "Extrais la liste des entreprises visibles dans les résultats de recherche LinkedIn. " +
            "Pour chaque entreprise : nom exact, URL LinkedIn (/company/...), secteur d'activité, " +
            "nombre d'employés (headcount comme nombre entier), ville principale.",
          schema: CompanySearchResultSchema,
        });

        const extracted = raw as unknown as z.infer<typeof CompanySearchResultSchema>;
        const count = extracted.companies?.length ?? 0;

        calls.push({ endpoint: url, status: 200, ok: true, responseData: { term, count } });
        console.info('[radar][linkedin-discovery]', 'term_extracted', { term, count });

        const filtered = (extracted.companies ?? []).filter((company) => {
          if (!company.linkedinUrl?.includes('/company/')) return false;
          if (company.headcount !== undefined) {
            if (company.headcount < config.minHeadcount) return false;
            if (company.headcount > config.maxHeadcount) return false;
          }
          return true;
        });

        allCompanies.push(...filtered);
      } catch (error) {
        calls.push({
          endpoint: url,
          status: 0,
          ok: false,
          responseData: { term, error: String(error).slice(0, 200) },
        });
        console.error('[radar][linkedin-discovery] term error:', term, error);
      }
    }
  } finally {
    await stagehand.close();
  }

  const deduped = dedupeByLinkedinUrl(allCompanies).slice(0, config.maxCompaniesPerRun);
  console.info('[radar][linkedin-discovery]', 'collection_done', {
    raw: allCompanies.length,
    deduped: deduped.length,
    maxAllowed: config.maxCompaniesPerRun,
  });

  return { companies: deduped, calls };
}
