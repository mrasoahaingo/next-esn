/** Extrait les années à 4 chiffres (19xx / 20xx) depuis une chaîne de date (FR / ISO / texte libre). */
export function extractYearsFromDateString(s: string): number[] {
  const matches = s.match(/\b(19|20)\d{2}\b/g);
  if (!matches?.length) return [];
  return matches.map((m) => Number.parseInt(m, 10));
}
