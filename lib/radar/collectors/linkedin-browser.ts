import { z } from 'zod';
import { Stagehand } from '@browserbasehq/stagehand';
import { RawSignalSchema, type ApiCall, type RawSignal } from '@/lib/radar/schemas';

// ─── Schémas Zod locaux ───────────────────────────────────────────────────────

const LinkedInCompanyPageSchema = z.object({
  jobCount: z.number().default(0),
  jobTitles: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  hasExternalConsultants: z.boolean().default(false),
  companyName: z.string().optional(),
});

const LinkedInJobsItemSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  contractType: z.string().optional(),
  skills: z.array(z.string()).default([]),
  url: z.string().optional(),
});

const LinkedInJobsExtractionSchema = z.object({
  offers: z.array(LinkedInJobsItemSchema).default([]),
});

type LinkedInCompanyPage = z.infer<typeof LinkedInCompanyPageSchema>;
type LinkedInJobsExtraction = z.infer<typeof LinkedInJobsExtractionSchema>;
type LinkedInJobsItem = z.infer<typeof LinkedInJobsItemSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function logLinkedInBrowserCall(event: string, payload: Record<string, unknown>) {
  console.info('[radar][linkedin-browser]', event, payload);
}

function createStagehand() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    // Stagehand model — requires OPENAI_API_KEY in env
    // @ts-expect-error — modelName exists at runtime (Stagehand V3 types incomplete)
    modelName: 'gpt-4o-mini',
    modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
    verbose: 0,
  });
}

function weightFromCount(count: number): number {
  if (count >= 5) return 25;
  if (count >= 3) return 20;
  if (count >= 2) return 15;
  return 10;
}

function companyNameFromUrl(url: string): string {
  // Extract company slug from https://linkedin.com/company/acme-corp → "acme corp"
  const match = /linkedin\.com\/company\/([^/?#]+)/i.exec(url);
  return match ? match[1].replace(/-/g, ' ') : url;
}

// ─── Collecteur principal ─────────────────────────────────────────────────────

export async function collectLinkedInBrowserSignals(
  companyUrls: string[],
): Promise<{ signals: RawSignal[]; calls: ApiCall[] }> {
  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    return { signals: [], calls: [] };
  }

  const signals: RawSignal[] = [];
  const calls: ApiCall[] = [];
  const stagehand = createStagehand();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { page } = (await stagehand.init()) as any;

    // ─── Bloc A : Pages entreprise LinkedIn ───────────────────────────────────

    for (const companyUrl of companyUrls) {
      try {
        await page.goto(companyUrl, { waitUntil: 'domcontentloaded' });

        // @ts-expect-error — Stagehand V3 types incomplete, extract() exists at runtime
        const rawExtracted = await stagehand.extract({
          instruction:
            "Extrais les offres d'emploi IT visibles sur cette page LinkedIn (poste, type de contrat, technologies). Détecte aussi la mention de prestataires ou consultants externes.",
          schema: LinkedInCompanyPageSchema,
        });
        const extracted = rawExtracted as unknown as LinkedInCompanyPage;

        const jobCount = extracted.jobCount ?? 0;
        calls.push({ endpoint: companyUrl, status: 200, ok: true, responseData: { jobCount } });
        logLinkedInBrowserCall('company_page_extracted', { companyUrl, jobCount });

        if (jobCount === 0) {
          logLinkedInBrowserCall('company_page_skipped_no_jobs', { companyUrl });
          continue;
        }

        const companyName = extracted.companyName ?? companyNameFromUrl(companyUrl);

        const signal = RawSignalSchema.safeParse({
          source: 'linkedin',
          title: `${jobCount} offres IT détectées (browser)`,
          rawContent: JSON.stringify({
            jobTitles: extracted.jobTitles,
            technologies: extracted.technologies,
            hasExternalConsultants: extracted.hasExternalConsultants,
          }),
          weight: weightFromCount(jobCount),
          metadata: {
            signalType: 'company_page_browser',
            jobCount,
            technologies: extracted.technologies,
            jobTitles: extracted.jobTitles,
            hasExternalConsultants: extracted.hasExternalConsultants,
            linkedinUrl: companyUrl,
          },
          companyName,
        });

        if (signal.success) {
          signals.push(signal.data);
          logLinkedInBrowserCall('company_signal_created', { companyUrl, companyName, jobCount });
        }
      } catch (error) {
        calls.push({
          endpoint: companyUrl,
          status: 0,
          ok: false,
          responseData: { error: String(error).slice(0, 200) },
        });
        console.error('collectLinkedInBrowserSignals company page:', companyUrl, error);
      }
    }

    // ─── Bloc B : LinkedIn Jobs search ───────────────────────────────────────

    const jobsSearchUrl =
      'https://www.linkedin.com/jobs/search/?keywords=consultant%20IT%20d%C3%A9veloppeur%20cloud%20data&location=France';

    try {
      await page.goto(jobsSearchUrl, { waitUntil: 'domcontentloaded' });

      // @ts-expect-error — Stagehand V3 types incomplete, extract() exists at runtime
      const rawJobsExtracted = await stagehand.extract({
        instruction:
          "Extrais toutes les offres d'emploi IT visibles : titre, entreprise, lieu, compétences, type de contrat, URL.",
        schema: LinkedInJobsExtractionSchema,
      });
      const jobsExtracted = rawJobsExtracted as unknown as LinkedInJobsExtraction;

      const offerCount = jobsExtracted.offers?.length ?? 0;
      calls.push({ endpoint: jobsSearchUrl, status: 200, ok: true, responseData: { offerCount } });
      logLinkedInBrowserCall('jobs_search_extracted', { offerCount });

      const grouped = Object.groupBy(jobsExtracted.offers ?? [], (offer: LinkedInJobsItem) =>
        offer.company.trim(),
      );

      for (const [company, offers] of Object.entries(grouped)) {
        if (!company || !offers || offers.length === 0) continue;

        const allSkills = [
          ...new Set((offers as LinkedInJobsItem[]).flatMap((o) => o.skills).filter(Boolean)),
        ];

        const signal = RawSignalSchema.safeParse({
          source: 'job_offer',
          title: `${offers.length} offres IT LinkedIn Jobs`,
          rawContent: JSON.stringify(offers),
          weight: weightFromCount(offers.length),
          metadata: {
            signalType: 'linkedin_jobs_search',
            offerCount: offers.length,
            technologies: allSkills.slice(0, 10),
            contractTypes: [
              ...new Set(
                (offers as LinkedInJobsItem[]).map((o) => o.contractType).filter(Boolean),
              ),
            ],
            urls: (offers as LinkedInJobsItem[]).map((o) => o.url).filter(Boolean),
          },
          companyName: company,
        });

        if (signal.success) {
          signals.push(signal.data);
        }
      }

      logLinkedInBrowserCall('jobs_search_completed', {
        offerCount,
        signalCount: signals.length,
      });
    } catch (error) {
      calls.push({
        endpoint: jobsSearchUrl,
        status: 0,
        ok: false,
        responseData: { error: String(error).slice(0, 200) },
      });
      console.error('collectLinkedInBrowserSignals jobs search:', error);
    }
  } finally {
    await stagehand.close();
  }

  return { signals, calls };
}
