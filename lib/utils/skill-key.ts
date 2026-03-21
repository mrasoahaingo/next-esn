/** Normalise une clé skill canonique (stockage + comparaison cross-missions). */
export function normalizeSkillKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '-').replace(/_+/g, '-');
}

/** Affichage UI : react → React, cloud-devops → Cloud devops */
export function formatSkillKeyLabel(skillKey: string): string {
  return skillKey
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
