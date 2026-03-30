import { JobOfferExtractionSchema, RawSignalSchema, type ApiCall, type RawSignal } from '@/lib/radar/schemas';

const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering`;

function extractTechnologies(offers: Array<{ technologies: string[] }>) {
  return [...new Set(offers.flatMap((offer) => offer.technologies).filter(Boolean))];
}

function logJobCall(event: string, payload: Record<string, unknown>) {
  console.info('[radar][jobs]', event, payload);
}

export async function collectJobOffers(searchQueries: string[]): Promise<{ signals: RawSignal[]; calls: ApiCall[] }> {
  const signals: RawSignal[] = [];
  const calls: ApiCall[] = [];
  const token = process.env.CLOUDFLARE_API_TOKEN;

  if (!token || !process.env.CLOUDFLARE_ACCOUNT_ID) return { signals, calls };

  for (const query of searchQueries) {
    try {
      const url = `https://www.indeed.fr/jobs?q=${encodeURIComponent(query)}&l=France`;

      const response = await fetch(`${CF_BASE}/json`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          prompt:
            'Extract all visible job offers from this page. For each offer return title, company, location, contractType, technologies, seniorityLevel, salaryRange, postedDate and url.',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              company: { type: 'string' },
              location: { type: 'string' },
              contractType: { type: 'string' },
              technologies: { type: 'array', items: { type: 'string' } },
              seniorityLevel: { type: 'string' },
              salaryRange: { type: 'string' },
              postedDate: { type: 'string' },
              url: { type: 'string' },
            },
            required: ['title', 'company', 'location', 'contractType', 'technologies', 'seniorityLevel'],
          },
          waitForSelector: 'body',
        }),
      });

      logJobCall('http_response', {
        query,
        targetUrl: url,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorSnippet = (await response.text()).slice(0, 200);
        calls.push({ endpoint: `${CF_BASE}/json`, status: response.status, ok: false, responseData: { errorSnippet } });
        console.error('collectJobOffers:', response.status, errorSnippet);
        continue;
      }

      const json = await response.json();
      calls.push({
        endpoint: `${CF_BASE}/json`,
        status: response.status,
        ok: true,
        responseData: {
          resultCount: json.result?.length ?? 0,
          sample: json.result?.[0]?.title?.slice(0, 200) ?? null,
        },
      });
      const parsed = JobOfferExtractionSchema.safeParse({ offers: json.result ?? [] });
      if (!parsed.success) {
        logJobCall('parse_failed', {
          query,
          issueCount: parsed.error.issues.length,
        });
        continue;
      }

      logJobCall('parsed', {
        query,
        offerCount: parsed.data.offers.length,
      });

      const grouped = Object.groupBy(parsed.data.offers, (offer) => offer.company.trim());
      let signalsForQuery = 0;
      for (const [company, offers] of Object.entries(grouped)) {
        if (!company || !offers || offers.length === 0) continue;

        const candidate = {
          source: 'job_offer' as const,
          title: `${offers.length} offres ${extractTechnologies(offers).slice(0, 3).join('/') || 'IT'}`,
          rawContent: JSON.stringify(offers),
          weight: offers.length >= 5 ? 25 : offers.length >= 3 ? 20 : offers.length >= 2 ? 15 : 10,
          metadata: {
            query,
            offerCount: offers.length,
            technologies: extractTechnologies(offers),
            contractTypes: [...new Set(offers.map((offer) => offer.contractType).filter(Boolean))],
            urls: offers.map((offer) => offer.url).filter(Boolean),
          },
          companyName: company,
        };

        const signal = RawSignalSchema.safeParse(candidate);
        if (signal.success) {
          signals.push(signal.data);
          signalsForQuery += 1;
        }
      }

      logJobCall('query_completed', {
        query,
        companyCount: Object.keys(grouped).length,
        signalCount: signalsForQuery,
      });
    } catch (error) {
      console.error('collectJobOffers:', error);
    }
  }

  return { signals, calls };
}
