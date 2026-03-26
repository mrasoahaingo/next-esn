import type { JobPostingAnalysis, JobPostingKeyPointAspect } from '@/lib/schema';

/** Affichage / persistance : toujours au moins une entrée par liste (le modèle omet souvent les champs optionnels). */
const DEFAULT_OPEN_QUESTIONS_FALLBACK = [
  'Aucune zone floue majeure : la fiche permet de cadrer le besoin sans clarification préalable obligatoire.',
] as const;

const DEFAULT_RED_FLAGS_FALLBACK = [
  'Aucun point de vigilance majeur identifié dans le texte fourni.',
] as const;

function trimNonEmptyStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((s) => String(s).trim()).filter((s) => s.length > 0);
}

/**
 * Garantit openQuestions et redFlags non vides après fusion LLM ou pour d’anciennes analyses en base.
 */
export function withMandatoryJobPostingLists<T extends Partial<JobPostingAnalysis>>(input: T): T {
  const out = { ...input } as T & Partial<JobPostingAnalysis>;
  const oq = trimNonEmptyStrings(out.openQuestions);
  out.openQuestions = oq.length > 0 ? oq : [...DEFAULT_OPEN_QUESTIONS_FALLBACK];
  const rf = trimNonEmptyStrings(out.redFlags);
  out.redFlags = rf.length > 0 ? rf : [...DEFAULT_RED_FLAGS_FALLBACK];
  return out as T;
}

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

export function buildJobPostingAnalysisUserContent(jobDescription: string): string {
  return `Voici la fiche de poste :\n\n${jobDescription}`;
}

export function buildJobPostingKeyPointExplainUserContent(
  jobDescription: string,
  point: { id: string; label: string; aspect: string; roleInMission: string; canonicalSkillKey?: string },
): string {
  const sk = point.canonicalSkillKey ? `\n- clé canonique (techno): ${point.canonicalSkillKey}` : '';
  return `Fiche de poste :\n\n${jobDescription}\n\nPoint clé à approfondir :\n- id: ${point.id}\n- libellé: ${point.label}\n- aspect: ${point.aspect}\n- rôle dans la mission: ${point.roleInMission}${sk}`;
}
