import type { ExtractedCV } from '@/lib/schema';
import { extractYearsFromDateString } from '@/lib/utils/cv-date-years';

type ExperienceItem = ExtractedCV['experiences'][number];

/**
 * True si `endDate` contient au moins une année exploitable (fin de période connue).
 * Sans année (ex. « Présent », « En cours » seul) → false → poste traité comme en cours si c’est l’expérience la plus récente.
 */
export function hasConcreteEndDate(endDate: string | undefined): boolean {
  const t = endDate?.trim();
  if (!t) return false;
  return extractYearsFromDateString(t).length > 0;
}

function cloneCv(cv: ExtractedCV): ExtractedCV {
  return structuredClone(cv) as ExtractedCV;
}

/**
 * Copie le CV ; si la première expérience (la plus récente dans notre convention) n’a pas de fin datée,
 * force `isCurrent: true` et retire un `endDate` non informatif.
 */
export function normalizeExtractedCvExperienceTime(cv: ExtractedCV, _referenceDate: Date): ExtractedCV {
  void _referenceDate;
  const out = cloneCv(cv);
  const exps = out.experiences ?? [];
  if (exps.length === 0) return out;

  const first = exps[0];
  if (hasConcreteEndDate(first.endDate)) {
    return out;
  }

  exps[0] = {
    ...first,
    isCurrent: true,
    endDate: undefined,
  };
  out.experiences = exps;
  return out;
}

/** Mois entier 0-based depuis une epoch fictive : year * 12 + month */
function yearMonthToIndex(y: number, m: number): number {
  return y * 12 + m;
}

function experienceToInclusiveMonthInterval(
  exp: ExperienceItem,
  referenceDate: Date,
): [number, number] | null {
  const startYears = extractYearsFromDateString(exp.startDate);
  if (startYears.length === 0) return null;

  const startY = Math.min(...startYears);
  const startIdx = yearMonthToIndex(startY, 0);

  let endY: number;
  let endM: number;
  if (exp.isCurrent) {
    endY = referenceDate.getUTCFullYear();
    endM = referenceDate.getUTCMonth();
  } else {
    const endYears = extractYearsFromDateString(exp.endDate ?? '');
    if (endYears.length > 0) {
      endY = Math.max(...endYears);
      endM = 11;
    } else {
      const sy = Math.max(...startYears);
      endY = sy;
      endM = 11;
    }
  }

  const endIdx = yearMonthToIndex(endY, endM);
  if (startIdx > endIdx) {
    return [endIdx, startIdx];
  }
  return [startIdx, endIdx];
}

function mergeInclusiveMonthIntervals(intervals: [number, number][]): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  let [cs, ce] = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const [ns, ne] = sorted[i];
    if (ns <= ce + 1) {
      ce = Math.max(ce, ne);
    } else {
      out.push([cs, ce]);
      cs = ns;
      ce = ne;
    }
  }
  out.push([cs, ce]);
  return out;
}

/**
 * Estime la durée totale d’expérience professionnelle (union des périodes, granularité mois/année).
 * Retourne undefined si aucune expérience n’a de date de début exploitable.
 */
export function formatTotalExperienceYears(
  cv: ExtractedCV,
  referenceDate: Date,
  language: 'fr' | 'en' = 'fr',
): string | undefined {
  const experiences = cv.experiences ?? [];
  const intervals: [number, number][] = [];
  for (const exp of experiences) {
    const iv = experienceToInclusiveMonthInterval(exp, referenceDate);
    if (iv) intervals.push(iv);
  }
  if (intervals.length === 0) return undefined;

  const merged = mergeInclusiveMonthIntervals(intervals);
  let totalMonths = 0;
  for (const [a, b] of merged) {
    totalMonths += b - a + 1;
  }
  if (totalMonths <= 0) return undefined;

  const years = Math.max(1, Math.round(totalMonths / 12));
  const unit = language === 'en' ? 'years' : 'ans';
  return `${years} ${unit}`;
}

/**
 * Normalise poste en cours + recalcule `personalInfo.yearsOfExperience` lorsque le calcul est fiable.
 */
export function prepareCvForMatchingPrompt(cv: ExtractedCV, referenceDate: Date): ExtractedCV {
  let out = normalizeExtractedCvExperienceTime(cv, referenceDate);
  const years = formatTotalExperienceYears(out, referenceDate, out.language ?? 'fr');
  if (years !== undefined) {
    out = {
      ...out,
      personalInfo: {
        ...out.personalInfo,
        yearsOfExperience: years,
      },
    };
  }
  return out;
}
