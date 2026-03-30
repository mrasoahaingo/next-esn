import { generateObject } from 'ai';
import { PressExtractionSchema, RawSignalSchema, type ApiCall, type RawSignal } from '@/lib/radar/schemas';
import { createGatewayLanguageModel, llmFactualGenerationSettings } from '@/lib/ai';

function logPressCall(event: string, payload: Record<string, unknown>) {
  console.info('[radar][press]', event, payload);
}

export async function collectPressSignals(rssUrls: string[]): Promise<{ signals: RawSignal[]; calls: ApiCall[] }> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return { signals: [], calls: [] };

  const signals: RawSignal[] = [];
  const calls: ApiCall[] = [];

  for (const rssUrl of rssUrls) {
    try {
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v2/scrape', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: rssUrl,
          formats: ['markdown'],
        }),
      });

      logPressCall('http_response', {
        rssUrl,
        status: scrapeResponse.status,
        ok: scrapeResponse.ok,
      });

      if (!scrapeResponse.ok) {
        const errorSnippet = (await scrapeResponse.text()).slice(0, 200);
        calls.push({ endpoint: 'https://api.firecrawl.dev/v2/scrape', status: scrapeResponse.status, ok: false, responseData: { errorSnippet } });
        console.error('collectPressSignals:', scrapeResponse.status, errorSnippet);
        continue;
      }

      const article = await scrapeResponse.json();
      const markdown = article?.data?.markdown;
      calls.push({
        endpoint: 'https://api.firecrawl.dev/v2/scrape',
        status: scrapeResponse.status,
        ok: true,
        responseData: { markdownLength: typeof markdown === 'string' ? markdown.length : 0 },
      });
      if (typeof markdown !== 'string' || !markdown.trim()) {
        logPressCall('empty_markdown', { rssUrl });
        continue;
      }

      const extraction = await generateObject({
        ...llmFactualGenerationSettings,
        model: createGatewayLanguageModel('google/gemini-2.5-flash', false),
        schema: PressExtractionSchema,
        prompt: `Analyse cet article et extrait les signaux de prospection ESN.
Retourne une liste d'evenements sur les entreprises qui indiquent un besoin de consultants IT.

Article:
${markdown}`,
      });

      const parsed = PressExtractionSchema.safeParse(extraction.object);
      calls.push({
        endpoint: 'llm/gemini-2.5-flash',
        status: 200,
        ok: true,
        responseData: {
          signalCount: parsed.success ? parsed.data.signals.length : 0,
          model: 'google/gemini-2.5-flash',
        },
      });
      if (!parsed.success) {
        logPressCall('parse_failed', {
          rssUrl,
          issueCount: parsed.error.issues.length,
        });
        continue;
      }

      logPressCall('parsed', {
        rssUrl,
        extractedSignalCount: parsed.data.signals.length,
      });

      // Poids adaptatif selon la valeur SDR du type de signal
      const PRESS_SIGNAL_WEIGHTS: Record<string, number> = {
        nomination: 22,             // DSI nommé — golden window 100 jours
        fundraising: 20,            // Levée de fonds — budget disponible
        outsourcing: 18,            // Signal externalisation direct
        digital_transformation: 15,
        hiring: 18,                 // Recrutement massif = besoin IT
      };

      let persistedCandidates = 0;
      for (const item of parsed.data.signals) {
        const weight = PRESS_SIGNAL_WEIGHTS[item.signalType] ?? 15;
        const signal = RawSignalSchema.safeParse({
          source: 'press',
          title: item.title,
          rawContent: item.details,
          weight,
          metadata: {
            signalType: item.signalType,
            sourceUrl: rssUrl,
            articleTitle: article?.data?.metadata?.title ?? null,
          },
          companyName: item.company,
        });

        if (signal.success) {
          signals.push(signal.data);
          persistedCandidates += 1;
        }
      }

      logPressCall('rss_completed', {
        rssUrl,
        signalCount: persistedCandidates,
      });
    } catch (error) {
      console.error('collectPressSignals:', error);
    }
  }

  return { signals, calls };
}
