/** Normalise une clé skill canonique (stockage + comparaison cross-missions). */
export function normalizeSkillKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
}
