import { generateObject } from 'ai';
import { extractionSchema, ExtractedCV } from '@/lib/schema';
import { model } from '@/lib/ai';
import mammoth from 'mammoth';

export const SYSTEM_PROMPT = `Tu es un expert en recrutement technique une ESN française.
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

Pour les compétences (skills), classe-les en 4 catégories :
- technologies : langages, frameworks, bases de données, outils techniques
- softSkills : compétences humaines (leadership, communication, esprit d'équipe, etc.)
- expertises : domaines d'expertise (architecture, cloud, data, sécurité, etc.)
- methodologies : méthodologies (Agile, Scrum, DevOps, TDD, etc.)

IMPORTANT pour chaque compétence, indique la source :
- "extracted" : la compétence est explicitement mentionnée dans le CV (dans une section compétences, dans le titre, ou clairement citée dans une expérience)
- "inferred" : la compétence est déduite par toi à partir du contexte (ex: si le candidat utilise React, tu déduis JavaScript ; s'il fait du Scrum Master, tu déduis Agile)
Sois strict : ne marque "extracted" que pour les compétences réellement écrites dans le CV. Privilégie la qualité à la quantité pour les compétences inférées.

IMPORTANT pour les champs "starred" et "added" :
- starred=true pour les compétences les plus importantes, connues, modernes et recherchées. MAX 20 starred pour les technologies. Pour les autres catégories : star les plus valorisantes
- starred=false pour les compétences secondaires ou obsolètes
- added=true automatiquement pour toutes les compétences starred (elles apparaîtront dans le PDF)
- added=false automatiquement pour les compétences non-starred (l'utilisateur pourra les ajouter manuellement)
- Trie chaque catégorie : starred+added en premier, puis les autres

Pour le résumé (summary), rédige 3-4 phrases de synthèse professionnelle. Utilise **double astérisques** autour des compétences clés, technologies et réalisations importantes pour les mettre en évidence.

Pour les informations personnelles :
- yearsOfExperience : calcule le nombre total d'années d'expérience à partir des dates des expériences (ex: "8 ans")
- availability : indique "Immédiate" par défaut sauf si le CV mentionne un préavis

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
