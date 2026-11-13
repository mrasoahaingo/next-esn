import type { SupabaseClient } from '@supabase/supabase-js';
import { DECISION_SHADOW_MODEL_ID } from '@/lib/llm/constants';
import {
  DecisionApiError,
  decide,
  type DecideResult,
  type DecisionAnswer,
  type DecisionQuestion,
} from '@/lib/llm/decide';
import { TASK_KEY } from '@/lib/llm/task-keys';
import type { ExtractedCV, JobPostingAnalysis, PositioningAnalysis } from '@/lib/schema';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import {
  buildDecisionQuestions,
  buildDecisionStateText,
  computeDecisionScore,
  type DecisionConfidenceBand,
  type DecisionHardConstraintFailure,
  type DecisionQuestionIndexEntry,
  type DecisionScoreResult,
} from '@/lib/services/positioning-decision-score';
import type { PositioningAnswerStoredValue } from '@/lib/services/positioning.service';

/**
 * Mode ombre « score par décision » de l'analyse de positionnement.
 *
 * Un score issu d'un modèle de décision est calculé à côté du `matchScore` du LLM et journalisé
 * dans `ai_usage_log` pour comparaison. Rien de ce qui est affiché ou persisté dans
 * `positionings.analysis` n'en dépend : les deux fonctions appelées par le workflow sont
 * best-effort et **ne rejettent jamais**.
 */

// ─── Types ───────────────────────────────────────────────────────

export type PositioningDecisionShadowRun = {
  questions: DecisionQuestion[];
  questionIndex: DecisionQuestionIndexEntry[];
  droppedKeyPointCount: number;
  /** Taille de l'état envoyé (CV + réponses du recruteur), en caractères. */
  stateChars: number;
  decideResult: DecideResult;
  score: DecisionScoreResult;
};

export type LlmMatchScoreConfidence = NonNullable<PositioningAnalysis['matchScoreConfidence']>;

/** Score du LLM auquel comparer ; `null` quand l'analyse principale n'a pas abouti. */
export type PositioningDecisionShadowLlmScore = {
  llmMatchScore: number | null;
  llmMatchScoreConfidence: LlmMatchScoreConfidence | null;
};

/** `ai_usage_log.output_payload` de la ligne ombre : exactement ces 13 champs. */
export type PositioningDecisionShadowOutputPayload = {
  answers: DecisionAnswer[];
  questionIndex: DecisionQuestionIndexEntry[];
  decisionScore: number | null;
  uncappedScore: number | null;
  hardConstraintFailures: DecisionHardConstraintFailure[];
  decisionConfidence: number | null;
  decisionConfidenceBand: DecisionConfidenceBand | null;
  refusalCount: number;
  questionCount: number;
  llmMatchScore: number | null;
  llmMatchScoreConfidence: LlmMatchScoreConfidence | null;
  gatewayCostUsd: number | null;
  finalProvider: string | null;
};

// ─── Avertissements sûrs ─────────────────────────────────────────

/** Nom de classe d'erreur : écarte tout ce qui ressemblerait à du texte libre. */
const SAFE_ERROR_NAME_PATTERN = /^[A-Za-z0-9_]{1,80}$/;

function readErrorName(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError';
  return SAFE_ERROR_NAME_PATTERN.test(error.name) ? error.name : 'UnknownError';
}

/**
 * Objet logué par les `console.warn` du mode ombre. Jamais l'état, jamais les questions, jamais
 * l'erreur elle-même : le message d'une erreur quelconque peut citer le CV. Seul celui d'un
 * `DecisionApiError` est repris, car il est sûr par construction (`lib/llm/decide.ts`).
 */
function describeShadowError(positioningId: string, error: unknown): Record<string, unknown> {
  if (error instanceof DecisionApiError) {
    return {
      positioningId,
      errorName: error.name,
      errorKind: error.kind,
      status: error.status ?? null,
      message: error.message,
    };
  }
  return { positioningId, errorName: readErrorName(error) };
}

// ─── Interrupteur (D3) ───────────────────────────────────────────

/** Vrai uniquement si `POSITIONING_DECISION_SHADOW` vaut exactement `'1'` (lu à l'appel). */
export function isPositioningDecisionShadowEnabled(): boolean {
  return process.env.POSITIONING_DECISION_SHADOW === '1';
}

// ─── Appel (D3, D4) ──────────────────────────────────────────────

/**
 * Interroge le modèle de décision sur les points clés du barème et calcule le score.
 *
 * Résout `null` — sans rien loguer — si l'interrupteur est éteint ou si la mission n'a aucun
 * point clé exploitable. Résout `null` avec un `console.warn` sur toute erreur. Ne rejette
 * jamais : la promesse peut être lancée sans `await` et n'être jamais attendue.
 */
export async function runPositioningDecisionShadow(params: {
  positioningId: string;
  cv: ExtractedCV;
  jobAnalysis: JobPostingAnalysis | null | undefined;
  priorAnswers?: Record<string, PositioningAnswerStoredValue> | null;
}): Promise<PositioningDecisionShadowRun | null> {
  try {
    if (!isPositioningDecisionShadowEnabled()) return null;

    // `jobAnalysis` peut être l'objet brut casté (schéma en échec) : contrôle à l'exécution.
    const keyPoints: unknown = params.jobAnalysis?.keyPoints;
    if (!Array.isArray(keyPoints) || keyPoints.length === 0) return null;

    const { questions, questionIndex, droppedKeyPointCount } = buildDecisionQuestions(keyPoints);
    if (questions.length === 0) return null;

    const input = buildDecisionStateText({ cv: params.cv, priorAnswers: params.priorAnswers });
    const decideResult = await decide({ model: DECISION_SHADOW_MODEL_ID, input, questions });
    const score = computeDecisionScore({ questionIndex, answers: decideResult.answers });

    return {
      questions,
      questionIndex,
      droppedKeyPointCount,
      stateChars: input.length,
      decideResult,
      score,
    };
  } catch (error) {
    console.warn(
      'Positioning decision shadow failed',
      describeShadowError(params.positioningId, error),
    );
    return null;
  }
}

// ─── Journalisation (D8) ─────────────────────────────────────────

/**
 * De la passerelle, seuls `answers`, `gatewayCostUsd` et `finalProvider` sont repris : le
 * `provider_metadata` brut (messages d'erreur des tentatives fournisseur) ne sort jamais de
 * `lib/llm/decide.ts`.
 */
export function buildPositioningDecisionShadowOutputPayload(
  run: PositioningDecisionShadowRun,
  llm: PositioningDecisionShadowLlmScore,
): PositioningDecisionShadowOutputPayload {
  return {
    answers: run.decideResult.answers,
    questionIndex: run.questionIndex,
    decisionScore: run.score.decisionScore,
    uncappedScore: run.score.uncappedScore,
    hardConstraintFailures: run.score.hardConstraintFailures,
    decisionConfidence: run.score.decisionConfidence,
    decisionConfidenceBand: run.score.decisionConfidenceBand,
    refusalCount: run.score.refusalCount,
    questionCount: run.score.questionCount,
    llmMatchScore: llm.llmMatchScore,
    llmMatchScoreConfidence: llm.llmMatchScoreConfidence,
    gatewayCostUsd: run.decideResult.gatewayCostUsd,
    finalProvider: run.decideResult.finalProvider,
  };
}

/**
 * Attend le mode ombre et écrit sa ligne `ai_usage_log` (aucune ligne s'il a résolu `null`).
 *
 * Ne rejette JAMAIS. Dans `fetchAndAnalyze`, cette fonction est appelée après la persistance de
 * l'analyse : un rejet ici ferait échouer l'étape alors que l'analyse est déjà enregistrée, et
 * relancerait tous ses appels LLM (`maxRetries = 1`). Appelée depuis le `finally` quand
 * l'analyse a échoué, un rejet masquerait l'erreur d'origine.
 */
export async function logPositioningDecisionShadow(
  supabase: SupabaseClient,
  params: PositioningDecisionShadowLlmScore & {
    /** Promesse renvoyée par `runPositioningDecisionShadow`, lancée sans `await`. */
    shadowRun: Promise<PositioningDecisionShadowRun | null>;
    positioningId: string;
    candidateId?: string;
    orgId?: string;
    workflowRunId?: string | null;
  },
): Promise<void> {
  try {
    const run = await params.shadowRun;
    if (!run) return;

    await logAiUsage(supabase, {
      operation: 'analysis',
      positioningId: params.positioningId,
      candidateId: params.candidateId,
      orgId: params.orgId,
      aiModel: DECISION_SHADOW_MODEL_ID,
      taskKey: TASK_KEY.POSITIONING_ANALYSIS_DECISION_SHADOW,
      durationMs: run.decideResult.durationMs,
      usage: run.decideResult.usage,
      // Pas l'état : le CV est déjà dans les lignes des branches. Seule sa taille est gardée.
      inputPayload: {
        model: DECISION_SHADOW_MODEL_ID,
        questions: run.questions,
        stateChars: run.stateChars,
        droppedKeyPointCount: run.droppedKeyPointCount,
      },
      outputPayload: buildPositioningDecisionShadowOutputPayload(run, {
        llmMatchScore: params.llmMatchScore,
        llmMatchScoreConfidence: params.llmMatchScoreConfidence,
      }),
      workflowRunId: params.workflowRunId ?? null,
    });
  } catch (error) {
    console.warn(
      'Positioning decision shadow log failed',
      describeShadowError(params.positioningId, error),
    );
  }
}
