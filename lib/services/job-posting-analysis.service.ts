import type { JobPostingKeyPointAspect } from '@/lib/schema';

const ASPECT_LABELS: Record<JobPostingKeyPointAspect, string> = {
  technical: 'Technique',
  methodology: 'Méthodologie',
  soft_skills: 'Soft skills',
  context_client: 'Contexte client',
  constraints: 'Contraintes',
  delivery: 'Organisation / livraison',
  other: 'Autre',
};

export function jobPostingAspectLabel(aspect: JobPostingKeyPointAspect): string {
  return ASPECT_LABELS[aspect] ?? aspect;
}

export function buildJobPostingAnalysisExecutivePrompt(): string {
  return `Tu es un expert recrutement ESN en France. Tu aides un recruteur à saisir le CADRE d'une fiche de poste.

Tâche : produire uniquement le champ executiveSummary (3 à 5 phrases en français).
- Contexte client / secteur / enjeux si présents dans le texte.
- Ce qui semble non négociable vs secondaire.
- Ton factuel, utile pour un entretien commercial ou un brief interne.
- Ne liste pas encore les compétences détaillées (c'est une autre étape).`;
}

export function buildJobPostingAnalysisKeyPointsPrompt(): string {
  return `Tu es un expert recrutement ESN en France. Tu extrais les POINTS CLÉS d'une fiche de poste pour qu'un recruteur maîtrise l'offre sur TOUS les aspects : technique, méthodologie, soft skills, contexte client, contraintes (durée, lieu, télétravail…), organisation de la mission.

Règles :
- keyPoints : liste triée par importanceRank CROISSANT (1 = le plus critique pour répondre au besoin mission).
- Chaque point : id STABLE en slug ASCII (ex. contexte_grand_compte, teletravail_3j) — les mêmes concepts doivent garder le même id si la fiche est réanalysée.
- aspect : choisir la valeur la plus pertinente parmi technical, methodology, soft_skills, context_client, constraints, delivery, other.
- Pour aspect = technical : remplir OBLIGATOIREMENT canonicalSkillKey avec une clé CANONIQUE en minuscules et tirets (ex. react, nodejs, graphql, aws, kubernetes, docker), identique pour la même techno sur toutes les missions — ne pas inventer de variantes (pas de reactjs si react suffit).
- Si le point n'est pas technique : ne pas remplir canonicalSkillKey.
- category : court libellé FR pour REGROUPER les points à l'écran (même libellé pour le même thème, ex. toujours "Backend" et pas parfois "Back-end"). Utilise des intitulés stables : ex. Backend, Frontend, Cloud & DevOps, Data, Contexte client, Méthodologie, Soft skills, Contraintes mission.
- roleInMission : une phrase sur ce que ce point change pour le recruteur ou le candidat.
- openQuestions : ce qui manque ou est flou dans la fiche (questions à poser au client).
- redFlags : ambiguïtés, contradictions ou risques pour le discours commercial.

Réponds en remplissant keyPoints, et optionnellement openQuestions et redFlags.`;
}

export function buildJobPostingAnalysisUserContent(jobDescription: string): string {
  return `Voici la fiche de poste :\n\n${jobDescription}`;
}

export function buildJobPostingKeyPointExplainPrompt(): string {
  return `Tu aides un recruteur ESN à préparer un entretien. À partir de la fiche de poste et d'un point clé, fournis une réponse structurée en français.
Même si le recruteur connaît déjà la techno au sens large, reste STRICTEMENT ancré dans CETTE fiche de poste pour l'usage en mission, les questions et les attentes.
- definition : explication claire du terme ou du sujet pour un profil non technique (peut être courte si le sujet est classique).
- usageInMission : en quoi c'est utilisé ou attendu dans CETTE mission précise (cite des éléments de la fiche si possible).
- candidateQuestions : 3 à 6 questions pertinentes à poser au candidat, alignées sur ce poste.
- expectedAnswers : pour chaque niveau (debutant, confirme, senior), ce qu'on attend comme niveau de réponse crédible dans ce contexte.`;
}

export function buildJobPostingKeyPointExplainUserContent(
  jobDescription: string,
  point: { id: string; label: string; aspect: string; roleInMission: string; canonicalSkillKey?: string },
): string {
  const sk = point.canonicalSkillKey ? `\n- clé canonique (techno): ${point.canonicalSkillKey}` : '';
  return `Fiche de poste :\n\n${jobDescription}\n\nPoint clé à approfondir :\n- id: ${point.id}\n- libellé: ${point.label}\n- aspect: ${point.aspect}\n- rôle dans la mission: ${point.roleInMission}${sk}`;
}
