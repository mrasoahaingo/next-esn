import { positioningAnalysisSchema, positioningOutputSchema } from '@/lib/schema';
import type { ExtractedCV, PositioningAnalysis } from '@/lib/schema';
import type { PositioningPromptBranding } from '@/lib/utils/org-settings';

export { positioningAnalysisSchema, positioningOutputSchema };

export {
  buildPositioningGeneratePrompt,
  buildPositioningGenerateTailoredCvSystemPrompt,
  buildPositioningGenerateEmailSystemPrompt,
  buildPositioningGenerateEmailFirstContactSystemPrompt,
  buildPositioningGenerateEmailBulletPointsSystemPrompt,
  buildPositioningGenerateCandidateEmailSystemPrompt,
} from './positioning-generate-prompts';

function positioningAnalysisIntro(b: PositioningPromptBranding): string {
  const { displayName, brandContextBlock } = b;
  return `${brandContextBlock}Tu es un expert en recrutement technique pour **${displayName}**, une structure de conseil et de services IT opérant en France (ESN, cabinet de recrutement technique ou équivalent selon le contexte entreprise).

Tu analyses le matching entre un CV et une fiche de poste fournis par l'utilisateur.
Langue : Français.`;
}

/** Prompt complet (legacy / doc) — même contenu que la somme des blocs + synthèse */
export function buildPositioningAnalysisPrompt(b: PositioningPromptBranding): string {
  return `${positioningAnalysisIntro(b)}

## Compétences (skillMatches)
${POSITIONING_ANALYSIS_SKILLS_RULES}

## Expériences (experienceRelevance)
${POSITIONING_ANALYSIS_EXPERIENCES_RULES}

## Lacunes (gaps)
${POSITIONING_ANALYSIS_GAPS_RULES}

## Questions
${POSITIONING_ANALYSIS_QUESTIONS_RULES}

## Score
${POSITIONING_ANALYSIS_SCORE_RULES}`;
}

const POSITIONING_ANALYSIS_SKILLS_RULES = `Pour chaque compétence mentionnée dans la fiche de poste :
- "strong" : le candidat possède clairement cette compétence avec de l'expérience
- "partial" : le candidat a une compétence proche ou une expérience limitée
- "missing" : le candidat ne semble pas posséder cette compétence

Pour chaque compétence, rédige un champ "note" détaillé qui explique concrètement POURQUOI ça match ou pas. Cite des éléments factuels du CV : expériences précises, durées, projets, technologies adjacentes. Exemples :
- "Note: Le candidat a utilisé React pendant 3 ans chez X, notamment sur un projet e-commerce à forte charge. Compétence confirmée."
- "Note: Aucune mention de Kubernetes dans le CV. Le candidat a utilisé Docker mais pas d'orchestration. Compétence manquante mais Docker faciliterait la montée en compétence."

Produis uniquement la liste skillMatches (schéma JSON attendu).`;

const POSITIONING_ANALYSIS_EXPERIENCES_RULES = `Pour chaque expérience du CV :
- "high" : très pertinente pour le poste
- "medium" : partiellement pertinente
- "low" : peu pertinente

Pour chaque expérience, rédige un champ "note" détaillé qui explique la pertinence par rapport au poste. Mentionne les missions/technologies/responsabilités qui matchent ou pas.

Produis uniquement la liste experienceRelevance (schéma JSON attendu).`;

const POSITIONING_ANALYSIS_GAPS_RULES = `Identifie les lacunes principales du candidat par rapport au poste. Pour chaque lacune, rédige un champ "note" qui explique l'impact concret sur le poste et les pistes de mitigation éventuelles.

Produis uniquement la liste gaps (schéma JSON attendu).`;

const POSITIONING_ANALYSIS_QUESTIONS_RULES = `Génère des questions pertinentes :
- candidateQuestions : pour vérifier des compétences ou clarifier des expériences
- clientQuestions : pour mieux cerner les attentes du poste

Produis uniquement candidateQuestions et clientQuestions (schéma JSON attendu).`;

const POSITIONING_ANALYSIS_SCORE_RULES = `Donne un score de matching global (0-100) et un résumé synthétique (matchSummary).`;

export function buildPositioningAnalysisSkillsSystemPrompt(b: PositioningPromptBranding): string {
  return `${positioningAnalysisIntro(b)}

## Tâche
${POSITIONING_ANALYSIS_SKILLS_RULES}`;
}

export function buildPositioningAnalysisExperiencesSystemPrompt(b: PositioningPromptBranding): string {
  return `${positioningAnalysisIntro(b)}

## Tâche
${POSITIONING_ANALYSIS_EXPERIENCES_RULES}`;
}

export function buildPositioningAnalysisGapsSystemPrompt(b: PositioningPromptBranding): string {
  return `${positioningAnalysisIntro(b)}

## Tâche
${POSITIONING_ANALYSIS_GAPS_RULES}`;
}

export function buildPositioningAnalysisQuestionsSystemPrompt(b: PositioningPromptBranding): string {
  return `${positioningAnalysisIntro(b)}

## Tâche
${POSITIONING_ANALYSIS_QUESTIONS_RULES}`;
}

/** Synthèse score + résumé à partir de l'analyse déjà agrégée */
export function buildPositioningSynthesisPrompt(b: PositioningPromptBranding): string {
  const { displayName, brandContextBlock } = b;
  return `${brandContextBlock}Tu es un expert en recrutement technique pour **${displayName}**.

L'utilisateur fournit le CV, la fiche de poste et une analyse détaillée déjà produite (JSON).

## Tâche
Produis UNIQUEMENT :
- matchScore : entier entre 0 et 100, cohérent avec les skillMatches, les lacunes (gaps) et la pertinence des expériences décrites dans l'analyse
- matchSummary : 3 à 5 phrases en français, synthèse exécutive du positionnement (forces, risques, angle client)

Ne recopie pas les listes détaillées. Langue : Français.`;
}

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
