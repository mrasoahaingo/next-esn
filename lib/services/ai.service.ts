import { generateObject } from 'ai';
import { extractionSchema, ExtractedCV } from '@/lib/schema';
import { anthropic } from '@ai-sdk/anthropic';

export const SYSTEM_PROMPT = `Tu es un expert en recrutement technique pour Himeo, une ESN française.
Ton objectif est d'extraire les données d'un CV texte et de les normaliser.

IMPORTANT : Tu dois impérativement utiliser la liste de référence de https://skills.sh/ pour mapper les compétences techniques.
Normalisation des termes :
- "Syfo" -> "Symfony"
- "dev" -> "Développeur"
- "Pio" -> "Pilotage de projet" (ou le terme officiel le plus proche dans skills.sh)
- "DDD" -> "Domain Driven Design"
- "TDD" -> "Test Driven Development"
- Mappe systématiquement les abréviations vers les labels officiels de la taxonomie skills.sh.

Format de sortie attendu : JSON structuré.
Si une fiche de poste est fournie, génère 4-5 points forts (strengths) qui matchent le CV avec les besoins du poste. Sinon, génère des points forts généraux basés sur l'expertise du candidat.

Langue : Français.`;

export { extractionSchema, type ExtractedCV };

export async function extractCVData(cvText: string, jobDescription?: string): Promise<ExtractedCV> {
  const { object } = await generateObject({
    model: anthropic('claude-3-5-sonnet-20240620'), // Automatically uses Vercel AI Gateway in creators/model-name format
    schema: extractionSchema,
    system: SYSTEM_PROMPT,
    prompt: `Voici le texte extrait du CV :\n\n${cvText}${jobDescription ? `\n\nVoici la fiche de poste pour le matching :\n\n${jobDescription}` : ''}`,
  });

  return object;
}
