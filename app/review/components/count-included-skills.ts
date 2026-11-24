import type { ExtractedCV, Skill } from '@/lib/schema';

type SkillsData = Partial<ExtractedCV['skills']>;

const CATEGORY_KEYS = ['technologies', 'softSkills', 'expertises', 'methodologies'] as const;

/**
 * Nombre de compétences incluses dans le PDF, toutes catégories confondues, pour le
 * compteur du panneau « Compétences ». Même règle d'inclusion que l'éditeur : une
 * compétence en texte simple (donnée ancienne) est incluse ; une compétence structurée
 * l'est si `added` est vrai, sinon si elle est `starred`.
 */
export function countIncludedSkills(skills: SkillsData | null | undefined): number {
  if (!skills) return 0;
  let total = 0;
  for (const key of CATEGORY_KEYS) {
    const items = skills[key] as (Skill | string | null | undefined)[] | undefined;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item) continue;
      if (typeof item === 'string') {
        total += 1;
        continue;
      }
      if (item.added ?? item.starred ?? true) total += 1;
    }
  }
  return total;
}
