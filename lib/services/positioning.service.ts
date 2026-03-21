import { positioningAnalysisSchema, positioningOutputSchema } from '@/lib/schema';
import type { ExtractedCV, PositioningAnalysis } from '@/lib/schema';

export { positioningAnalysisSchema, positioningOutputSchema };

export function buildAnalysisUserContent(cv: ExtractedCV, jobDescription: string): string {
  return `Voici le CV du candidat :\n\n${JSON.stringify(cv, null, 2)}\n\nVoici la fiche de poste :\n\n${jobDescription}`;
}

export function buildPositioningSynthesisUserContent(
  cv: ExtractedCV,
  jobDescription: string,
  mergedAnalysis: Partial<PositioningAnalysis>,
): string {
  return `${buildAnalysisUserContent(cv, jobDescription)}

---

Voici l'analyse détaillée déjà produite (à synthétiser en score + résumé cohérents) :

${JSON.stringify(mergedAnalysis, null, 2)}`;
}

export function buildGenerateUserContent(
  cv: ExtractedCV,
  jobDescription: string,
  analysis: PositioningAnalysis,
  answers: Record<string, string>,
): string {
  const answersText = Object.entries(answers)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `Q: ${k}\nR: ${v}`)
    .join('\n\n');

  return `Voici le CV du candidat :\n\n${JSON.stringify(cv, null, 2)}\n\nVoici la fiche de poste :\n\n${jobDescription}\n\nVoici l'analyse de matching :\n\n${JSON.stringify(analysis, null, 2)}${answersText ? `\n\nVoici les réponses aux questions :\n\n${answersText}` : ''}`;
}

export function buildAnalysisMessages(cv: ExtractedCV, jobDescription: string) {
  return [
    {
      role: 'user' as const,
      content: buildAnalysisUserContent(cv, jobDescription),
    },
  ];
}

export function buildGenerateMessages(
  cv: ExtractedCV,
  jobDescription: string,
  analysis: PositioningAnalysis,
  answers: Record<string, string>,
) {
  return [
    {
      role: 'user' as const,
      content: buildGenerateUserContent(cv, jobDescription, analysis, answers),
    },
  ];
}
