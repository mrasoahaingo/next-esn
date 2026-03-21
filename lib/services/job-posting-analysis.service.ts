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
