import type { ExtractedCV } from '@/lib/schema';
import { extractYearMonthsFromDateString, extractYearsFromDateString } from '@/lib/utils/cv-date-years';
import { sanitizeExtractedCv } from '@/lib/utils/cv-sanitize';

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

/**
 * Période d'une expérience en mois inclusifs. Début : date la plus ancienne de `startDate`, au mois
 * près s'il est connu (sinon janvier). Fin : mois de référence si poste en cours, sinon date la plus
 * récente de `endDate` au mois près (sinon décembre) ; sans `endDate`, décembre de l'année de début.
 */
function experienceToInclusiveMonthInterval(
  exp: ExperienceItem,
  referenceDate: Date,
): [number, number] | null {
  const starts = extractYearMonthsFromDateString(exp.startDate);
  if (starts.length === 0) return null;

  const startIdx = Math.min(...starts.map((d) => yearMonthToIndex(d.year, d.month ?? 0)));

  let endIdx: number;
  if (exp.isCurrent) {
    endIdx = yearMonthToIndex(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth());
  } else {
    const ends = extractYearMonthsFromDateString(exp.endDate);
    endIdx =
      ends.length > 0
        ? Math.max(...ends.map((d) => yearMonthToIndex(d.year, d.month ?? 11)))
        : yearMonthToIndex(Math.max(...starts.map((d) => d.year)), 11);
  }

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
 * Durée totale d’expérience professionnelle : union des périodes, au mois près quand le mois est
 * connu (sinon début = janvier, fin = décembre), arrondie à l’année INFÉRIEURE (cohérent avec la
 * formulation « plus de N ans »), minimum 1 an. Retourne undefined si aucune expérience n’a de date
 * de début exploitable.
 *
 * Source de vérité unique des années d’expérience : cette valeur déterministe est écrite dans
 * `personalInfo.yearsOfExperience` (extraction, prompts d’analyse et de génération, CV adapté
 * persisté) et le prompt de génération impose au LLM de la reprendre telle quelle dans le résumé et
 * les emails. Le texte du résumé n’est pas réécrit par regex (« 3 ans d’expérience en React » est
 * légitime).
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

  const years = Math.max(1, Math.floor(totalMonths / 12));
  const unit = language === 'en' ? (years === 1 ? 'year' : 'years') : years === 1 ? 'an' : 'ans';
  return `${years} ${unit}`;
}

/**
 * Nettoie les sorties LLM non strictes (`sanitizeExtractedCv` : « null », markdown des compétences),
 * normalise poste en cours + recalcule `personalInfo.yearsOfExperience` lorsque le calcul est fiable.
 */
export function prepareCvForMatchingPrompt(cv: ExtractedCV, referenceDate: Date): ExtractedCV {
  let out = normalizeExtractedCvExperienceTime(sanitizeExtractedCv(cv), referenceDate);
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

/**
 * Durée d’expérience calculée (voir `formatTotalExperienceYears`) pour le CV source, avec la même
 * normalisation que `prepareCvForMatchingPrompt`. `undefined` si aucune date exploitable : on ne
 * renvoie jamais la valeur écrite par le LLM.
 */
export function computeReferenceYearsOfExperience(
  cv: ExtractedCV,
  referenceDate: Date,
): string | undefined {
  const normalized = normalizeExtractedCvExperienceTime(sanitizeExtractedCv(cv), referenceDate);
  return formatTotalExperienceYears(normalized, referenceDate, normalized.language ?? 'fr');
}
