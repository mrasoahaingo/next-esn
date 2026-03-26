import type { MatchingWeightsConfig } from '@/lib/config/matching-weights';
import { mergeMatchingWeights, weightForRecencyRank } from '@/lib/config/matching-weights';
import type { ExtractedCV } from '@/lib/schema';
import { extractYearsFromDateString } from '@/lib/utils/cv-date-years';

export type ExperienceRecencyRow = {
  /** Index dans le tableau `experiences` du CV (ordre d’origine) */
  originalIndex: number;
  /** 0 = expérience la plus récente */
  recencyRank: number;
  /** Poids 0–1 pour le matching (récent > ancien) */
  weight: number;
  role: string;
  company: string;
  periodHint: string;
};

function endYearForExperience(
  exp: ExtractedCV['experiences'][number],
  referenceDate: Date,
): number {
  if (exp.isCurrent) return referenceDate.getUTCFullYear();
  const end = exp.endDate?.trim();
  if (end) {
    const ys = extractYearsFromDateString(end);
    if (ys.length) return Math.max(...ys);
  }
  const startYs = extractYearsFromDateString(exp.startDate);
  if (startYs.length) return Math.max(...startYs);
  return 1970;
}

function startYearForExperience(
  exp: ExtractedCV['experiences'][number],
  referenceDate: Date,
): number {
  const ys = extractYearsFromDateString(exp.startDate);
  if (ys.length) return Math.min(...ys);
  return endYearForExperience(exp, referenceDate);
}

/**
 * Trie les indices d’expériences : plus récente en premier (fin de période la plus tardive).
 */
export function sortExperienceIndicesByRecency(
  experiences: ExtractedCV['experiences'],
  referenceDate: Date = new Date(),
): number[] {
  const n = experiences.length;
  if (n === 0) return [];
  return Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const endA = endYearForExperience(experiences[a], referenceDate);
    const endB = endYearForExperience(experiences[b], referenceDate);
    if (endB !== endA) return endB - endA;
    const startA = startYearForExperience(experiences[a], referenceDate);
    const startB = startYearForExperience(experiences[b], referenceDate);
    return startB - startA;
  });
}

export function buildExperienceRecencyRows(
  cv: ExtractedCV,
  matchingWeights?: MatchingWeightsConfig | null,
  referenceDate: Date = new Date(),
): ExperienceRecencyRow[] {
  const cfg = mergeMatchingWeights(matchingWeights);
  if (!cfg.experienceRecencyEnabled) {
    return [];
  }

  const experiences = cv.experiences ?? [];
  const order = sortExperienceIndicesByRecency(experiences, referenceDate);
  return order.map((originalIndex, recencyRank) => {
    const exp = experiences[originalIndex];
    const periodHint = exp.isCurrent
      ? `${exp.startDate} → présent`
      : [exp.startDate, exp.endDate].filter(Boolean).join(' → ');
    return {
      originalIndex,
      recencyRank,
      weight: weightForRecencyRank(recencyRank, cfg),
      role: exp.role,
      company: exp.company,
      periodHint,
    };
  });
}

/**
 * Bloc texte injecté dans les prompts de matching : priorité aux missions/postes récents.
 */
export function buildExperienceRecencyContextBlock(
  cv: ExtractedCV,
  matchingWeights?: MatchingWeightsConfig | null,
  referenceDate: Date = new Date(),
): string {
  const cfg = mergeMatchingWeights(matchingWeights);
  if (!cfg.experienceRecencyEnabled) {
    return '';
  }

  const rows = buildExperienceRecencyRows(cv, matchingWeights, referenceDate);
  if (!rows.length) {
    return '';
  }

  const modeLine =
    cfg.recencyMode === 'explicit' && cfg.recencyExplicitWeights?.length
      ? `Mode : **poids explicites** par rang (org).`
      : `Mode : **décroissance exponentielle** (facteur ${cfg.recencyDecayPerRank}, plancher ${cfg.recencyWeightFloor}).`;

  const lines = rows.map(
    (r) =>
      `- Rang récence ${r.recencyRank + 1} (poids **${r.weight.toFixed(2)}**) — expériences[${r.originalIndex}] : ${r.role} @ ${r.company} (${r.periodHint})`,
  );

  return `## Pondération par récence des missions / expériences (paramètres organisation)
${modeLine}
Les postes sont classés du **plus récent au plus ancien**. Un poids élevé signifie que la preuve de compétence sur ce poste compte **davantage** pour le matching.

${lines.join('\n')}

**Règles pour le score et les notes :**
- Une compétence surtout démontrée sur l’expérience **la plus récente** (rang 1) pèse plus qu’une compétence uniquement visible sur des postes **anciens**.
- Si le besoin mission est proche d’une **mission récente** (même stack / domaine), valoriser fortement cette proximité dans les skillMatches et experienceRelevance.
- Si une techno est seulement sur un poste **vieux de plusieurs années**, le matching doit être **modéré** sauf si la fiche accepte explicitement une techno « historique ».
- **Le bloc « niveau d’expertise attendu » du barème mission (s’il est fourni dans le message) prime sur ces règles de récence** : une bonne proximité technologique ou une preuve récente **ne compense pas** un écart objectivable sur le niveau requis (séniorité, autonomie, années, posture).

`;
}
