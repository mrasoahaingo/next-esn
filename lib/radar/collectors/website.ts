import { generateObject } from 'ai';
import { z } from 'zod';
import { createGatewayLanguageModel, llmFactualGenerationSettings } from '@/lib/ai';
import { RawSignalSchema, type RawSignal } from '@/lib/radar/schemas';

const WebsiteTechExtractionSchema = z.object({
  technologies: z.array(z.string()).default([]),
  // Signaux de transformation digitale détectés dans le contenu
  transformationSignals: z
    .array(
      z.object({
        type: z.enum(['cloud_migration', 'tech_hiring', 'digital_project', 'outsourcing_mention', 'tech_partnership']),
        evidence: z.string(),
      }),
    )
    .default([]),
  techJobCount: z.number().default(0),  // Nb d'offres IT détectées sur la page carrières
  confidence: z.enum(['high', 'medium', 'low']),
});

function logWebsiteCall(event: string, payload: Record<string, unknown>) {
  console.info('[radar][website]', event, payload);
}

// Pages candidates à scraper par priorité
const CAREER_PAGE_PATHS = ['/carrieres', '/careers', '/jobs', '/recrutement', '/offres-emploi', '/nous-rejoindre'];

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<string | null> {
  const response = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      // Limiter aux pages pertinentes — évite de scraper des CGU
      onlyMainContent: true,
    }),
  });

  if (!response.ok) return null;
  const json = await response.json();
  const markdown = json?.data?.markdown;
  return typeof markdown === 'string' && markdown.trim() ? markdown : null;
}

async function findCareerPage(website: string, apiKey: string): Promise<string | null> {
  // Essayer d'abord la page d'accueil pour détecter un lien carrières
  const homepage = await scrapeWithFirecrawl(website, apiKey);
  if (homepage) {
    const careerLinkMatch = homepage.match(/\[.*?(?:carri[eè]res?|careers?|jobs?|recrut|rejoindre).*?\]\(([^)]+)\)/i);
    if (careerLinkMatch?.[1]) {
      const careerUrl = careerLinkMatch[1].startsWith('http')
        ? careerLinkMatch[1]
        : `${website.replace(/\/$/, '')}${careerLinkMatch[1]}`;
      return careerUrl;
    }
  }

  // Fallback: tenter les chemins canoniques
  const base = website.replace(/\/$/, '');
  for (const path of CAREER_PAGE_PATHS) {
    const testUrl = `${base}${path}`;
    const content = await scrapeWithFirecrawl(testUrl, apiKey);
    if (content && content.length > 500) return testUrl;
  }

  return null;
}

export async function collectWebsiteSignals(
  companies: Array<{ name: string; website: string; siren?: string }>,
): Promise<RawSignal[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];

  const signals: RawSignal[] = [];

  for (const company of companies) {
    try {
      logWebsiteCall('start', { company: company.name, website: company.website });

      // 1. Chercher la page carrières
      const careerPageUrl = await findCareerPage(company.website, apiKey);
      const pageToScrape = careerPageUrl ?? company.website;

      logWebsiteCall('page_found', { company: company.name, url: pageToScrape, isCareer: Boolean(careerPageUrl) });

      const content = await scrapeWithFirecrawl(pageToScrape, apiKey);
      if (!content) {
        logWebsiteCall('empty_content', { company: company.name });
        continue;
      }

      // Limiter le contenu pour éviter de dépasser le contexte LLM
      const truncated = content.slice(0, 8000);

      // 2. Extraction LLM des technologies et signaux
      const extraction = await generateObject({
        ...llmFactualGenerationSettings,
        model: createGatewayLanguageModel('google/gemini-2.5-flash', false),
        schema: WebsiteTechExtractionSchema,
        prompt: `Analyse cette page web d'entreprise et extrait les informations pertinentes pour une ESN.

Cherche:
- Les technologies mentionnées (langages, frameworks, outils cloud, plateformes)
- Les signaux de transformation digitale ou d'externalisation IT
- Le nombre d'offres d'emploi IT visibles

Entreprise: ${company.name}
URL: ${pageToScrape}

Contenu:
${truncated}`,
      });

      const result = extraction.object;

      logWebsiteCall('extracted', {
        company: company.name,
        techCount: result.technologies.length,
        signalCount: result.transformationSignals.length,
        jobCount: result.techJobCount,
        confidence: result.confidence,
      });

      if (result.technologies.length === 0 && result.transformationSignals.length === 0) {
        logWebsiteCall('no_signal', { company: company.name });
        continue;
      }

      // Poids selon richesse des signaux
      const weight = result.confidence === 'high' ? 18
        : result.confidence === 'medium' ? 14
        : 10;

      const signalTypeDesc = result.transformationSignals.map((s) => s.type).join(', ') || 'tech_stack';

      const signal = RawSignalSchema.safeParse({
        source: 'website',
        title: `Stack tech détectée sur site: ${result.technologies.slice(0, 4).join(', ')}`,
        rawContent: JSON.stringify({ technologies: result.technologies, signals: result.transformationSignals }),
        weight,
        metadata: {
          signalType: 'digital_transformation',
          technologies: result.technologies,
          transformationSignals: result.transformationSignals,
          techJobCount: result.techJobCount,
          sourceUrl: pageToScrape,
          scrapedAt: new Date().toISOString(),
          confidence: result.confidence,
          signalDesc: signalTypeDesc,
        },
        companyName: company.name,
        companySiren: company.siren,
      });

      if (signal.success) {
        signals.push(signal.data);
        logWebsiteCall('signal_created', {
          company: company.name,
          technologies: result.technologies.slice(0, 5),
        });
      }
    } catch (error) {
      console.error('collectWebsiteSignals:', company.name, error);
    }
  }

  return signals;
}
