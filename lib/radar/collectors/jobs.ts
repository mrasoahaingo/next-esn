import { Stagehand } from '@browserbasehq/stagehand';
import { JobOfferExtractionSchema, RawSignalSchema, type ApiCall, type RawSignal } from '@/lib/radar/schemas';

function extractTechnologies(offers: Array<{ technologies: string[] }>) {
  return [...new Set(offers.flatMap((offer) => offer.technologies).filter(Boolean))];
}

function logJobCall(event: string, payload: Record<string, unknown>) {
  console.info('[radar][jobs]', event, payload);
}

function createStagehand() {
  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    // Stagehand model — requires OPENAI_API_KEY in env
    modelName: 'gpt-4o-mini',
    modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
    verbose: 0,
  });
}

export async function collectJobOffers(searchQueries: string[]): Promise<{ signals: RawSignal[]; calls: ApiCall[] }> {
  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    return { signals: [], calls: [] };
  }

  const signals: RawSignal[] = [];
  const calls: ApiCall[] = [];
  const stagehand = createStagehand();

  try {
    await stagehand.init();

    for (const query of searchQueries) {
      const url = `https://www.indeed.fr/jobs?q=${encodeURIComponent(query)}&l=France`;

      try {
        await stagehand.page.goto(url, { waitUntil: 'domcontentloaded' });

        const extracted = await stagehand.extract({
          instruction: `Extrais toutes les offres d'emploi visibles sur cette page Indeed. Pour chaque offre : titre du poste, entreprise, lieu, type de contrat, technologies mentionnées, niveau d'expérience, fourchette de salaire si visible, date de publication, URL.`,
          schema: JobOfferExtractionSchema,
        });

        const offerCount = extracted.offers?.length ?? 0;
        calls.push({ endpoint: url, status: 200, ok: true, responseData: { query, offerCount } });
        logJobCall('extracted', { query, offerCount });

        const grouped = Object.groupBy(extracted.offers ?? [], (offer) => offer.company.trim());
        let signalsForQuery = 0;

        for (const [company, offers] of Object.entries(grouped)) {
          if (!company || !offers || offers.length === 0) continue;

          const signal = RawSignalSchema.safeParse({
            source: 'job_offer',
            title: `${offers.length} offres ${extractTechnologies(offers).slice(0, 3).join('/') || 'IT'}`,
            rawContent: JSON.stringify(offers),
            weight: offers.length >= 5 ? 25 : offers.length >= 3 ? 20 : offers.length >= 2 ? 15 : 10,
            metadata: {
              query,
              offerCount: offers.length,
              technologies: extractTechnologies(offers),
              contractTypes: [...new Set(offers.map((o) => o.contractType).filter(Boolean))],
              urls: offers.map((o) => o.url).filter(Boolean),
            },
            companyName: company,
          });

          if (signal.success) {
            signals.push(signal.data);
            signalsForQuery += 1;
          }
        }

        logJobCall('query_completed', { query, signalCount: signalsForQuery });
      } catch (error) {
        calls.push({ endpoint: url, status: 0, ok: false, responseData: { error: String(error).slice(0, 200) } });
        console.error('collectJobOffers query:', query, error);
      }
    }
  } finally {
    await stagehand.close();
  }

  return { signals, calls };
}
