/**
 * Lecture du matching : regroupement des compétences par catégorie et taux de
 * couverture, pour le panneau de barres de l'étape 1 (une teinte, segments par
 * clarté). Fonctions pures, testées dans `matching-readout.test.ts`.
 */

export type SkillRelevance = 'strong' | 'partial' | 'missing';

export type ReadoutSkill = {
  skill?: string;
  category?: string;
  relevance?: string;
};

export type CategoryCoverage = {
  category: string;
  strong: number;
  partial: number;
  missing: number;
  total: number;
  /** Couverture 0–100 : fort = 1, partiel = 0,5, manquant = 0. */
  coveragePercent: number;
};

export const DEFAULT_SKILL_CATEGORY = 'Autres';

/** Les deux vocabulaires du schéma (`strong/partial/missing`, `high/medium/low`) ramenés à trois niveaux. */
export function normalizeRelevance(relevance: string | undefined): SkillRelevance | null {
  switch (relevance) {
    case 'strong':
    case 'high':
      return 'strong';
    case 'partial':
    case 'medium':
      return 'partial';
    case 'missing':
    case 'low':
      return 'missing';
    default:
      return null;
  }
}

export function computeCategoryCoverage(skills: ReadonlyArray<ReadoutSkill>): CategoryCoverage[] {
  const byCategory = new Map<string, CategoryCoverage>();

  for (const s of skills) {
    const level = normalizeRelevance(s.relevance);
    if (!level) continue;
    const category = s.category?.trim() || DEFAULT_SKILL_CATEGORY;
    const row =
      byCategory.get(category) ??
      { category, strong: 0, partial: 0, missing: 0, total: 0, coveragePercent: 0 };
    row[level] += 1;
    row.total += 1;
    byCategory.set(category, row);
  }

  const rows = [...byCategory.values()].map((row) => ({
    ...row,
    coveragePercent: row.total === 0 ? 0 : Math.round(((row.strong + row.partial * 0.5) / row.total) * 100),
  }));

  // Les catégories les plus fournies d'abord ; à égalité, ordre alphabétique français.
  return rows.sort((a, b) => b.total - a.total || a.category.localeCompare(b.category, 'fr'));
}

export function countStrongSkills(skills: ReadonlyArray<ReadoutSkill>): { strong: number; total: number } {
  let strong = 0;
  let total = 0;
  for (const s of skills) {
    const level = normalizeRelevance(s.relevance);
    if (!level) continue;
    total += 1;
    if (level === 'strong') strong += 1;
  }
  return { strong, total };
}
