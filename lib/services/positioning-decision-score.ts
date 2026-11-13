import type {
  DecisionAnswer,
  DecisionQuestion,
  DecisionScoreLevel,
} from '@/lib/llm/decide';
import type { ExtractedCV, JobPostingAnalysis } from '@/lib/schema';
import {
  buildPriorAnswersPromptBlock,
  type PositioningAnswerStoredValue,
} from '@/lib/services/positioning.service';
import { prepareCvForMatchingPrompt } from '@/lib/utils/cv-experience-time';

/**
 * Mode ombre « score par décision » : fonctions pures (questions depuis le barème, état envoyé,
 * calcul du score). Aucun accès réseau, base, environnement ni journal ici — l'orchestration vit
 * dans `positioning-decision-shadow.ts`.
 */

// ─── Constantes ──────────────────────────────────────────────────

/** Plafond de questions par appel (les points clés de plus petit `importanceRank` d'abord). */
export const MAX_DECISION_QUESTIONS = 50;

/** Un éliminatoire échoue si sa probabilité de satisfaction est strictement sous ce seuil. */
export const HARD_CONSTRAINT_PASS_THRESHOLD = 0.5;

/** Plafond du score dès qu'un éliminatoire échoue : sous le seuil orange de 40 de l'interface. */
export const HARD_CONSTRAINT_FAILED_SCORE_CAP = 39;

/** Seuil provisoire : confiance strictement inférieure → bande `low`. */
export const DECISION_CONFIDENCE_LOW_BELOW = 0.4;

/** Seuil provisoire : confiance strictement inférieure → bande `medium`, sinon `high`. */
export const DECISION_CONFIDENCE_MEDIUM_BELOW = 0.7;

/**
 * Niveaux d'une question à échelle, dans l'ordre : indice 0 → valeur 0, 1 → 0,5, 2 → 1
 * (aligné sur le barème « 0 / 50 / 100 »).
 */
export const DECISION_SCORE_LEVELS: DecisionScoreLevel[] = [
  { label: 'missing', description: 'Aucune preuve dans le CV' },
  { label: 'partial', description: 'Preuve indirecte, ancienne ou transférable' },
  { label: 'strong', description: 'Preuve explicite et récente' },
];

// ─── Types ───────────────────────────────────────────────────────

export type DecisionKeyPoint = JobPostingAnalysis['keyPoints'][number];

/** Correspondance nom de question → point clé du barème (conservée dans le log). */
export type DecisionQuestionIndexEntry = {
  name: string;
  keyPointId: string;
  type: 'score' | 'predicate';
  /** Poids du point clé ; `null` s'il est absent, toujours `null` pour un éliminatoire. */
  importanceWeight: number | null;
  /** Nombre de niveaux de l'échelle ; `null` pour un éliminatoire. */
  levelCount: number | null;
};

export type DecisionQuestionSet = {
  questions: DecisionQuestion[];
  questionIndex: DecisionQuestionIndexEntry[];
  /** Points clés reçus qui n'ont pas donné de question (inutilisables ou au-delà du plafond). */
  droppedKeyPointCount: number;
};

export type DecisionHardConstraintFailure = {
  name: string;
  keyPointId: string;
  /** Probabilité de satisfaction, bornée à [0, 1]. */
  probability: number;
};

export type DecisionConfidenceBand = 'low' | 'medium' | 'high';

export type DecisionScoreResult = {
  /** Score 0–100 après plafond éliminatoire ; `null` sans point à échelle exploitable. */
  decisionScore: number | null;
  /** Score 0–100 avant plafond éliminatoire. */
  uncappedScore: number | null;
  hardConstraintFailures: DecisionHardConstraintFailure[];
  /** Confiance agrégée sur [0, 1] ; `null` sans terme. */
  decisionConfidence: number | null;
  decisionConfidenceBand: DecisionConfidenceBand | null;
  refusalCount: number;
  questionCount: number;
};

// ─── Lecture défensive ───────────────────────────────────────────
// `jobAnalysis` peut être l'objet brut casté quand `jobPostingAnalysisSchema` échoue : les types
// ne garantissent rien à l'exécution.

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// ─── Questions (D5) ──────────────────────────────────────────────

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  explicit: 'preuve explicite dans le CV',
  implicit_acceptable: 'preuve implicite acceptable',
  transferable_proven: 'compétence transférable démontrée acceptable',
};

const SCORE_FINAL_INSTRUCTION =
  'Évalue le niveau de preuve apporté par le dossier du candidat (CV et réponses du recruteur) pour ce critère.';

// La probabilité renvoyée doit être celle de la SATISFACTION du critère : c'est ce que suppose
// le seuil d'échec de `computeDecisionScore`.
const PREDICATE_FINAL_INSTRUCTION =
  'Critère éliminatoire : réponds vrai uniquement si le dossier du candidat (CV et réponses du recruteur) établit que ce critère est satisfait ; sinon réponds faux.';

/** Une ligne par champ présent ; un champ absent ne produit aucune ligne. */
function buildQuestionInstructions(
  keyPoint: Record<string, unknown>,
  label: string,
  finalInstruction: string,
): string {
  const lines = [`Critère : ${label}`];

  const valueSought = readText(keyPoint.valueSought);
  if (valueSought) lines.push(`Exigence vérifiable : ${valueSought}`);

  const roleInMission = readText(keyPoint.roleInMission);
  if (roleInMission) lines.push(`Rôle dans la mission : ${roleInMission}`);

  const evidenceType = readText(keyPoint.evidenceTypeExpected);
  const evidenceLabel = evidenceType ? EVIDENCE_TYPE_LABELS[evidenceType] : undefined;
  if (evidenceLabel) lines.push(`Type de preuve attendu : ${evidenceLabel}`);

  const scoringRubricHint = readText(keyPoint.scoringRubricHint);
  if (scoringRubricHint) lines.push(`Indication de barème : ${scoringRubricHint}`);

  lines.push(finalInstruction);
  return lines.join('\n');
}

/**
 * Transforme les points clés du barème en questions pour le modèle de décision.
 *
 * Les noms sont générés (`kp_<i>` échelle, `hc_<j>` éliminatoire, deux compteurs indépendants) et
 * ne dérivent jamais de l'identifiant du point clé : la correspondance vit dans `questionIndex`.
 */
export function buildDecisionQuestions(
  keyPoints: readonly DecisionKeyPoint[] | null | undefined,
): DecisionQuestionSet {
  const received: readonly unknown[] = Array.isArray(keyPoints) ? keyPoints : [];

  const usable: { keyPoint: Record<string, unknown>; label: string; rank: number }[] = [];
  for (const entry of received) {
    if (!isRecord(entry)) continue;
    const label = readText(entry.label);
    if (!label) continue;
    // Rang illisible = dernier.
    const rank = readFiniteNumber(entry.importanceRank) ?? Number.POSITIVE_INFINITY;
    usable.push({ keyPoint: entry, label, rank });
  }

  // `Array.prototype.sort` est stable : l'ordre d'origine est conservé à rang égal.
  const selected = [...usable]
    .sort((a, b) => (a.rank === b.rank ? 0 : a.rank < b.rank ? -1 : 1))
    .slice(0, MAX_DECISION_QUESTIONS);

  const questions: DecisionQuestion[] = [];
  const questionIndex: DecisionQuestionIndexEntry[] = [];
  let scoreCount = 0;
  let predicateCount = 0;

  for (const { keyPoint, label } of selected) {
    const keyPointId = readText(keyPoint.id) ?? '';

    if (keyPoint.requirementTier === 'hard_constraint') {
      const name = `hc_${predicateCount++}`;
      questions.push({
        type: 'predicate',
        name,
        instructions: buildQuestionInstructions(keyPoint, label, PREDICATE_FINAL_INSTRUCTION),
      });
      questionIndex.push({
        name,
        keyPointId,
        type: 'predicate',
        importanceWeight: null,
        levelCount: null,
      });
      continue;
    }

    const name = `kp_${scoreCount++}`;
    const weight = readFiniteNumber(keyPoint.importanceWeight);
    questions.push({
      type: 'score',
      name,
      instructions: buildQuestionInstructions(keyPoint, label, SCORE_FINAL_INSTRUCTION),
      levels: DECISION_SCORE_LEVELS.map((level) => ({ ...level })),
    });
    questionIndex.push({
      name,
      keyPointId,
      type: 'score',
      importanceWeight: weight === undefined ? null : clamp01(weight),
      levelCount: DECISION_SCORE_LEVELS.length,
    });
  }

  return {
    questions,
    questionIndex,
    droppedKeyPointCount: received.length - questions.length,
  };
}

// ─── Score (D7) ──────────────────────────────────────────────────

type ScaleAnswer = Extract<DecisionAnswer, { type: 'score' }>;

/** Valeur d'un point à échelle sur [0, 1], ou `undefined` si la réponse est inexploitable. */
function scaleAnswerValue(answer: ScaleAnswer, levelCount: number | null): number | undefined {
  if (levelCount === null || !Number.isFinite(levelCount) || levelCount < 2) return undefined;
  const maxLevelIndex = levelCount - 1;

  const probabilities = answer.probabilities ?? [];
  const probabilitySum = probabilities.reduce((sum, p) => sum + p.probability, 0);

  // Espérance sur les probabilités (renormalisées si leur somme n'est pas 1) ; à défaut,
  // l'espérance de l'indice de niveau renvoyée par l'API.
  const value =
    probabilities.length > 0 && probabilitySum > 0
      ? probabilities.reduce((sum, p) => sum + (p.value / maxLevelIndex) * p.probability, 0) /
        probabilitySum
      : answer.score / maxLevelIndex;

  return Number.isFinite(value) ? clamp01(value) : undefined;
}

function isDefinedWeight(weight: number | null): weight is number {
  return weight !== null && Number.isFinite(weight) && weight >= 0;
}

/**
 * Poids effectifs des points à échelle exploitables : `importanceWeight`, ou la moyenne des poids
 * définis s'il est absent, ou 1 partout si aucun n'est défini ou si leur somme est nulle.
 */
function effectiveWeights(weights: (number | null)[]): number[] {
  const defined = weights.filter(isDefinedWeight);
  const definedSum = defined.reduce((sum, weight) => sum + weight, 0);
  if (defined.length === 0 || definedSum <= 0) return weights.map(() => 1);

  const definedMean = definedSum / defined.length;
  return weights.map((weight) => (isDefinedWeight(weight) ? weight : definedMean));
}

export function decisionConfidenceBand(confidence: number | null): DecisionConfidenceBand | null {
  if (confidence === null || !Number.isFinite(confidence)) return null;
  if (confidence < DECISION_CONFIDENCE_LOW_BELOW) return 'low';
  if (confidence < DECISION_CONFIDENCE_MEDIUM_BELOW) return 'medium';
  return 'high';
}

/**
 * Calcule le score par décision à partir des réponses du modèle.
 *
 * Les réponses sont appariées aux questions **par nom** (première occurrence), jamais par
 * position. Une question sans réponse, refusée, ou dont la réponse n'a pas le type attendu est
 * exclue ; les pondérations sont renormalisées sur les points effectivement répondus.
 */
export function computeDecisionScore(params: {
  questionIndex: readonly DecisionQuestionIndexEntry[];
  answers: readonly DecisionAnswer[];
}): DecisionScoreResult {
  const { questionIndex, answers } = params;

  const answerByName = new Map<string, DecisionAnswer>();
  for (const answer of answers) {
    if (!answerByName.has(answer.name)) answerByName.set(answer.name, answer);
  }

  const scalePoints: { value: number; weight: number | null; confidence: number | undefined }[] =
    [];
  const hardConstraints: DecisionHardConstraintFailure[] = [];
  let refusalCount = 0;

  for (const entry of questionIndex) {
    const answer = answerByName.get(entry.name);
    if (!answer) continue;

    if (answer.type === 'refusal') {
      refusalCount++;
      continue;
    }

    if (entry.type === 'score' && answer.type === 'score') {
      const value = scaleAnswerValue(answer, entry.levelCount);
      if (value === undefined) continue;
      const confidence =
        answer.confidence !== undefined && Number.isFinite(answer.confidence)
          ? clamp01(answer.confidence)
          : undefined;
      scalePoints.push({ value, weight: entry.importanceWeight, confidence });
      continue;
    }

    if (entry.type === 'predicate' && answer.type === 'predicate') {
      if (!Number.isFinite(answer.probability)) continue;
      hardConstraints.push({
        name: entry.name,
        keyPointId: entry.keyPointId,
        probability: clamp01(answer.probability),
      });
    }
    // Tout autre couple question / réponse est incohérent : exclu.
  }

  const weights = effectiveWeights(scalePoints.map((point) => point.weight));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  // Choix de discrétion : sans point à échelle exploitable, le score est `null` même si des
  // éliminatoires ont répondu — un oui/non seul ne fait pas un score sur 100. Leurs échecs
  // restent listés dans `hardConstraintFailures`, donc journalisés.
  const uncappedScore =
    scalePoints.length > 0 && weightSum > 0
      ? Math.round(
          (100 * scalePoints.reduce((sum, point, i) => sum + point.value * weights[i], 0)) /
            weightSum,
        )
      : null;

  const hardConstraintFailures = hardConstraints.filter(
    (constraint) => constraint.probability < HARD_CONSTRAINT_PASS_THRESHOLD,
  );

  const decisionScore =
    uncappedScore === null
      ? null
      : hardConstraintFailures.length > 0
        ? Math.min(uncappedScore, HARD_CONSTRAINT_FAILED_SCORE_CAP)
        : uncappedScore;

  // Choix de discrétion : dans la confiance, chaque éliminatoire pèse autant qu'un point à
  // échelle « moyen » (moyenne des poids effectifs), ou 1 s'il n'y a aucun point à échelle. Un
  // éliminatoire n'a pas d'`importanceWeight` : lui donner le poids moyen évite qu'il écrase ou
  // disparaisse derrière les points pondérés.
  const hardConstraintWeight = scalePoints.length > 0 ? weightSum / scalePoints.length : 1;

  let confidenceSum = 0;
  let confidenceWeightSum = 0;
  scalePoints.forEach((point, i) => {
    if (point.confidence === undefined) return;
    confidenceSum += point.confidence * weights[i];
    confidenceWeightSum += weights[i];
  });
  for (const constraint of hardConstraints) {
    // Certitude d'un oui/non : 0 à p = 0,5 ; 1 à p = 0 ou p = 1.
    confidenceSum += Math.abs(2 * constraint.probability - 1) * hardConstraintWeight;
    confidenceWeightSum += hardConstraintWeight;
  }

  const decisionConfidence = confidenceWeightSum > 0 ? confidenceSum / confidenceWeightSum : null;

  return {
    decisionScore,
    uncappedScore,
    hardConstraintFailures,
    decisionConfidence,
    decisionConfidenceBand: decisionConfidenceBand(decisionConfidence),
    refusalCount,
    questionCount: questionIndex.length,
  };
}

// ─── État envoyé au modèle (D6) ──────────────────────────────────

/**
 * Texte de l'état : le CV (même normalisation que les branches d'analyse) puis les réponses du
 * recruteur (même rendu que dans les prompts). Ni barème, ni règles d'usage, ni bloc de récence :
 * le barème est porté par les questions.
 */
export function buildDecisionStateText(params: {
  cv: ExtractedCV;
  priorAnswers?: Record<string, PositioningAnswerStoredValue> | null;
  /** Instant de référence pour le poste en cours / les années d'expérience (défaut : maintenant). */
  referenceDate?: Date;
}): string {
  const cvPrepared = prepareCvForMatchingPrompt(params.cv, params.referenceDate ?? new Date());
  const answersBlock = buildPriorAnswersPromptBlock(params.priorAnswers ?? null);
  return `## CV du candidat (JSON)\n\n${JSON.stringify(cvPrepared, null, 2)}${answersBlock}`;
}
