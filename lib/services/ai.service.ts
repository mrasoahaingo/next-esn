import { generateObject } from 'ai';
import { extractionSchema, ExtractedCV } from '@/lib/schema';
import { model } from '@/lib/ai';
import mammoth from 'mammoth';

export const SYSTEM_PROMPT = `Tu es un expert en recrutement technique pour Himeo, une ESN française.
Ton objectif est d'extraire les données d'un CV et de les normaliser.

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

export async function extractCVData(
  fileBuffer: Buffer,
  isPdf: boolean,
  jobDescription?: string,
): Promise<ExtractedCV> {
  const jobContext = jobDescription
    ? `\n\nVoici la fiche de poste pour le matching :\n\n${jobDescription}`
    : '';

  type ContentPart = { type: 'text'; text: string } | { type: 'file'; mediaType: string; data: Buffer };
  let content: ContentPart[];

  if (isPdf) {
    content = [
      { type: 'text', text: `Extrais et structure toutes les informations de ce CV.${jobContext}` },
      { type: 'file', mediaType: 'application/pdf', data: fileBuffer },
    ];
  } else {
    const { value: cvText } = await mammoth.extractRawText({ buffer: fileBuffer });
    content = [
      { type: 'text', text: `Voici le texte extrait du CV :\n\n${cvText}${jobContext}` },
    ];
  }

  const { object } = await generateObject({
    model,
    schema: extractionSchema,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  return object as ExtractedCV;
}
