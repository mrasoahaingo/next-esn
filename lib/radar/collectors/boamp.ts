import { generateObject } from 'ai';
import { z } from 'zod';
import { createGatewayLanguageModel, llmFactualGenerationSettings } from '@/lib/ai';
import { PublicMarketSchema, RawSignalSchema, type RawSignal } from '@/lib/radar/schemas';

const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering`;

function logBoampCall(event: string, payload: Record<string, unknown>) {
  console.info('[radar][boamp]', event, payload);
}

// Extrait un budget estimé en euros depuis un texte brut (titre ou description)
function parseBudgetEuros(text: string): number | null {
  // Patterns: "500 000 €", "1,5M€", "1.5 million euros", "150K€"
  const millionMatch = text.match(/(\d+[\s,.]?\d*)\s*(?:m|million)[\s]*(?:eur|€|euros?)/i);
  if (millionMatch) {
    const value = parseFloat(millionMatch[1].replace(/[\s,]/g, '.'));
    if (!Number.isNaN(value)) return Math.round(value * 1_000_000);
  }
  const kMatch = text.match(/(\d+)\s*(?:k|000)[\s]*(?:eur|€|euros?)/i);
  if (kMatch) {
    const value = parseInt(kMatch[1], 10);
    if (!Number.isNaN(value)) return value * (text.toLowerCase().includes('k') ? 1000 : 1);
  }
  const plainMatch = text.match(/(\d[\d\s]*\d)\s*(?:eur|€|euros?)/i);
  if (plainMatch) {
    const value = parseInt(plainMatch[1].replace(/\s/g, ''), 10);
    if (!Number.isNaN(value) && value >= 1000) return value;
  }
  return null;
}

function budgetToWeight(budgetEuros: number | null): number {
  if (budgetEuros === null) return 20;
  if (budgetEuros >= 500_000) return 25;
  if (budgetEuros >= 100_000) return 22;
  return 18;
}

const BudgetExtractionSchema = z.object({
  budgetEuros: z.number().nullable(),
  budgetLabel: z.string().nullable(),
});

async function extractBudgetWithAi(text: string): Promise<number | null> {
  try {
    const result = await generateObject({
      ...llmFactualGenerationSettings,
      model: createGatewayLanguageModel('google/gemini-2.5-flash', false),
      schema: BudgetExtractionSchema,
      prompt: `Extrait le budget estimé de ce marché public IT en euros. Retourne null si non mentionné.\n\n${text}`,
    });
    return result.object.budgetEuros ?? null;
  } catch {
    return null;
  }
}

export async function collectPublicMarkets(): Promise<RawSignal[]> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token || !process.env.CLOUDFLARE_ACCOUNT_ID) return [];

  try {
    const response = await fetch(`${CF_BASE}/scrape`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.boamp.fr/pages/recherche/?nature=appel-offre&rubrique=informatique',
        elements: [
          {
            selector: '.result-item',
            fields: {
              reference: { selector: '.ref', type: 'text' },
              title: { selector: '.title', type: 'text' },
              organization: { selector: '.org', type: 'text' },
              deadline: { selector: '.date-limit', type: 'text' },
              url: { selector: 'a', type: 'attribute', attribute: 'href' },
            },
          },
        ],
      }),
    });

    logBoampCall('http_response', {
      targetUrl: 'https://www.boamp.fr/pages/recherche/?nature=appel-offre&rubrique=informatique',
      status: response.status,
      ok: response.ok,
    });

    if (!response.ok) {
      console.error('collectPublicMarkets:', response.status, await response.text());
      return [];
    }

    const json = await response.json();
    const results = Array.isArray(json.result) ? json.result : [];
    const signals: RawSignal[] = [];
    let parsedCount = 0;

    for (const item of results) {
      const parsed = PublicMarketSchema.safeParse({
        ...item,
        lots: [{ number: '1', description: [item?.title, item?.reference].filter(Boolean).join(' - ') }],
      });
      if (!parsed.success) continue;
      parsedCount += 1;

      const haystack = [parsed.data.title, parsed.data.estimatedBudget, ...parsed.data.lots.map((lot) => lot.description)].filter(Boolean).join(' ');
      if (!/java|angular|cloud|devops|numerique|developpement|informatique|data|cyber/i.test(haystack)) {
        continue;
      }
      const budgetRegex = parseBudgetEuros(haystack);
      // Si le regex ne suffit pas, on tente l'IA (seulement si estimatedBudget fourni)
      const budgetEuros = budgetRegex ?? (parsed.data.estimatedBudget ? await extractBudgetWithAi(parsed.data.estimatedBudget) : null);
      const weight = budgetToWeight(budgetEuros);

      const signal = RawSignalSchema.safeParse({
        source: 'public_market',
        title: `AO: ${parsed.data.title}`,
        rawContent: JSON.stringify(parsed.data),
        weight,
        metadata: {
          reference: parsed.data.reference,
          organization: parsed.data.organization,
          deadline: parsed.data.deadline,
          url: parsed.data.url,
          budgetEuros,
          budgetLabel: parsed.data.estimatedBudget ?? null,
        },
        companyName: parsed.data.organization,
      });

      if (signal.success) signals.push(signal.data);
    }

    logBoampCall('completed', {
      rawCount: results.length,
      parsedCount,
      signalCount: signals.length,
    });

    return signals;
  } catch (error) {
    console.error('collectPublicMarkets:', error);
    return [];
  }
}
