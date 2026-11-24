/** Extrait les années à 4 chiffres (19xx / 20xx) depuis une chaîne de date (FR / ISO / texte libre). */
export function extractYearsFromDateString(s: string): number[] {
  const matches = s.match(/\b(19|20)\d{2}\b/g);
  if (!matches?.length) return [];
  return matches.map((m) => Number.parseInt(m, 10));
}

/** Date lue dans une chaîne libre : année, et mois 0-based quand il est connu. */
export type YearMonth = { year: number; month?: number };

/** Noms de mois FR / EN (sans accents, minuscules), complets ou abrégés → mois 0-based. */
const MONTH_NAMES: Readonly<Record<string, number>> = {
  janvier: 0, janv: 0, jan: 0, january: 0,
  fevrier: 1, fevr: 1, fev: 1, feb: 1, february: 1,
  mars: 2, mar: 2, march: 2,
  avril: 3, avr: 3, apr: 3, april: 3,
  mai: 4, may: 4,
  juin: 5, jun: 5, june: 5,
  juillet: 6, juil: 6, jul: 6, july: 6,
  aout: 7, aug: 7, august: 7,
  septembre: 8, sept: 8, sep: 8, september: 8,
  octobre: 9, oct: 9, october: 9,
  novembre: 10, nov: 10, november: 10,
  decembre: 11, dec: 11, december: 11,
};

const YEAR_PATTERN = /\b(?:19|20)\d{2}\b/g;
/** `MM/` `MM-` `MM.` juste avant l'année (pas précédé d'un chiffre : « 2019 - 2021 » n'est pas un mois). */
const NUMERIC_MONTH_BEFORE = /(?:^|\D)(\d{1,2})\s*[/.-]\s*$/;
/** Nom de mois juste avant l'année (« sept. 2019 », « Sep-2019 »). */
const NAMED_MONTH_BEFORE = /([a-z]+)\.?[\s-]*$/;
/** `/MM` `-MM` juste après l'année (pas suivi d'un chiffre : « 2019-2021 » n'est pas un mois). */
const NUMERIC_MONTH_AFTER = /^\s*[/-]\s*(\d{1,2})(?!\d)/;

function toMonthIndex(raw: string): number | undefined {
  const n = Number.parseInt(raw, 10);
  return n >= 1 && n <= 12 ? n - 1 : undefined;
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Toutes les dates (année + mois si connu) d'une chaîne libre, dans l'ordre d'apparition.
 * Formats du mois : `MM/YYYY`, `MM-YYYY`, `YYYY-MM`, `YYYY/MM`, noms de mois FR / EN.
 */
export function extractYearMonthsFromDateString(s: unknown): YearMonth[] {
  if (typeof s !== 'string' || !s) return [];
  const text = stripDiacritics(s);
  const out: YearMonth[] = [];
  for (const match of text.matchAll(YEAR_PATTERN)) {
    const year = Number.parseInt(match[0], 10);
    const index = match.index ?? 0;
    const before = text.slice(Math.max(0, index - 16), index);
    const after = text.slice(index + match[0].length, index + match[0].length + 6);

    let month: number | undefined;
    const numericBefore = NUMERIC_MONTH_BEFORE.exec(before);
    if (numericBefore) month = toMonthIndex(numericBefore[1]);
    if (month === undefined) {
      const named = NAMED_MONTH_BEFORE.exec(before);
      if (named) month = MONTH_NAMES[named[1]];
    }
    if (month === undefined) {
      const numericAfter = NUMERIC_MONTH_AFTER.exec(after);
      if (numericAfter) month = toMonthIndex(numericAfter[1]);
    }
    out.push({ year, month });
  }
  return out;
}

/**
 * Première date d'une chaîne libre (année + mois 0-based si connu) ; `undefined` sans année.
 * Ex. « 09/2019 », « 2019-09 », « sept. 2019 », « September 2019 » → `{ year: 2019, month: 8 }`.
 */
export function extractYearMonthFromDateString(s: string): YearMonth | undefined {
  return extractYearMonthsFromDateString(s)[0];
}
