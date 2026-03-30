import { z } from 'zod';
import { generateObject } from 'ai';
import { Stagehand } from '@browserbasehq/stagehand';
import { createGatewayLanguageModel, llmFactualGenerationSettings } from '@/lib/ai';
import { RawSignalSchema, type ApiCall, type RawSignal } from '@/lib/radar/schemas';

function logBoampCall(event: string, payload: Record<string, unknown>) {
  console.info('[radar][boamp]', event, payload);
}

function parseBudgetEuros(text: string): number | null {
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

const BoampExtractionSchema = z.object({
  notices: z.array(
    z.object({
      reference: z.string().optional(),
      title: z.string(),
      organization: z.string(),
      deadline: z.string().optional(),
      estimatedBudget: z.string().optional(),
      url: z.string().optional(),
    }),
  ),
});

export async function collectPublicMarkets(): Promise<{ signals: RawSignal[]; calls: ApiCall[] }> {
  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    return { signals: [], calls: [] };
  }

  const calls: ApiCall[] = [];
  const signals: RawSignal[] = [];
  const targetUrl = 'https://www.boamp.fr/pages/recherche/?nature=appel-offre&rubrique=informatique';

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    modelName: 'claude-3-5-sonnet-20241022',
    modelClientOptions: { apiKey: process.env.ANTHROPIC_API_KEY! },
    verbose: 0,
  });

  try {
    await stagehand.init();
    await stagehand.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    const extracted = await stagehand.extract({
      instruction: `Extrais tous les appels d'offres publics IT visibles sur cette page BOAMP. Pour chaque avis : référence, intitulé du marché, organisme acheteur, date limite de réponse, montant estimé si visible, URL de l'avis.`,
      schema: BoampExtractionSchema,
    });

    const notices = extracted.notices ?? [];
    calls.push({ endpoint: targetUrl, status: 200, ok: true, responseData: { noticeCount: notices.length } });
    logBoampCall('extracted', { noticeCount: notices.length });

    let parsedCount = 0;
    for (const item of notices) {
      const haystack = [item.title, item.estimatedBudget].filter(Boolean).join(' ');
      if (!/java|angular|cloud|devops|numerique|developpement|informatique|data|cyber/i.test(haystack)) continue;

      parsedCount += 1;
      const budgetRegex = parseBudgetEuros(haystack);
      const budgetEuros = budgetRegex ?? (item.estimatedBudget ? await extractBudgetWithAi(item.estimatedBudget) : null);
      const weight = budgetToWeight(budgetEuros);

      const signal = RawSignalSchema.safeParse({
        source: 'public_market',
        title: `AO: ${item.title}`,
        rawContent: JSON.stringify(item),
        weight,
        metadata: {
          reference: item.reference ?? null,
          organization: item.organization,
          deadline: item.deadline ?? null,
          url: item.url ?? null,
          budgetEuros,
          budgetLabel: item.estimatedBudget ?? null,
        },
        companyName: item.organization,
      });

      if (signal.success) signals.push(signal.data);
    }

    logBoampCall('completed', { rawCount: notices.length, parsedCount, signalCount: signals.length });
  } catch (error) {
    calls.push({ endpoint: targetUrl, status: 0, ok: false, responseData: { error: String(error).slice(0, 200) } });
    console.error('collectPublicMarkets:', error);
  } finally {
    await stagehand.close();
  }

  return { signals, calls };
}
