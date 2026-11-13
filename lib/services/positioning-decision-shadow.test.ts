import { inspect } from 'node:util';
import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { DECISION_SHADOW_MODEL_ID } from '@/lib/llm/constants';
import { DecisionApiError, decide, type DecideResult } from '@/lib/llm/decide';
import type { ExtractedCV, JobPostingAnalysis } from '@/lib/schema';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import {
  buildPositioningDecisionShadowOutputPayload,
  isPositioningDecisionShadowEnabled,
  logPositioningDecisionShadow,
  runPositioningDecisionShadow,
  type PositioningDecisionShadowRun,
} from '@/lib/services/positioning-decision-shadow';

// Seul `decide` est remplacé : le vrai `DecisionApiError` est conservé.
vi.mock('@/lib/llm/decide', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/llm/decide')>();
  return { ...actual, decide: vi.fn() };
});

vi.mock('@/lib/services/ai-usage.service', () => ({ logAiUsage: vi.fn() }));

const decideMock = vi.mocked(decide);
const logAiUsageMock = vi.mocked(logAiUsage);

// ─── Fixtures ────────────────────────────────────────────────────

const SHADOW_ENV = 'POSITIONING_DECISION_SHADOW';
const CV_MARKER = 'MARQUEUR_CV';
const POSITIONING_ID = 'pos-1';

const CV: ExtractedCV = {
  language: 'fr',
  personalInfo: {
    firstName: 'Jean',
    lastName: CV_MARKER,
    title: 'Développeur',
    yearsOfExperience: '3 ans',
  },
  summary: 'Résumé.',
  experiences: [],
  education: [],
  skills: {
    technologies: [],
    softSkills: [],
    expertises: [],
    methodologies: [],
  },
};

type KeyPoint = JobPostingAnalysis['keyPoints'][number];

function keyPoint(overrides: Partial<KeyPoint> = {}): KeyPoint {
  return {
    id: 'react',
    label: 'React',
    aspect: 'technical',
    canonicalSkillKey: 'react',
    category: 'Frontend',
    importanceRank: 1,
    roleInMission: 'Développement des écrans',
    requirementTier: 'must_have',
    importanceWeight: 1,
    evidenceTypeExpected: undefined,
    valueSought: undefined,
    scoringRubricHint: undefined,
    ...overrides,
  };
}

function jobAnalysisWith(keyPoints: KeyPoint[]): JobPostingAnalysis {
  return { executiveSummary: 'Mission de développement.', keyPoints };
}

/** Un point à échelle (→ kp_0) et un éliminatoire (→ hc_0). */
const JOB_ANALYSIS = jobAnalysisWith([
  keyPoint(),
  keyPoint({
    id: 'habilitation',
    label: 'Habilitation',
    aspect: 'constraints',
    canonicalSkillKey: undefined,
    importanceRank: 2,
    requirementTier: 'hard_constraint',
    importanceWeight: undefined,
  }),
]);

/** kp_0 vaut 0,8 (score non plafonné 80) ; hc_0 échoue (0,2) → score plafonné à 39. */
const DECIDE_RESULT: DecideResult = {
  answers: [
    {
      type: 'score',
      name: 'kp_0',
      score: 1.6,
      confidence: 0.9,
      probabilities: [
        { value: 0, label: 'missing', probability: 0.1 },
        { value: 1, label: 'partial', probability: 0.2 },
        { value: 2, label: 'strong', probability: 0.7 },
      ],
    },
    { type: 'predicate', name: 'hc_0', probability: 0.2 },
  ],
  usage: {
    inputTokens: 313,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokens: 0,
    outputTokenDetails: { textTokens: undefined, reasoningTokens: undefined },
    totalTokens: 313,
  },
  gatewayCostUsd: 0.0000313,
  finalProvider: 'openai',
  durationMs: 432,
};

const OUTPUT_PAYLOAD_KEYS = [
  'answers',
  'questionIndex',
  'decisionScore',
  'uncappedScore',
  'hardConstraintFailures',
  'decisionConfidence',
  'decisionConfidenceBand',
  'refusalCount',
  'questionCount',
  'llmMatchScore',
  'llmMatchScoreConfidence',
  'gatewayCostUsd',
  'finalProvider',
];

// `logAiUsage` est simulé : le client n'est jamais utilisé.
const supabase = {} as unknown as SupabaseClient;

function runShadow(
  jobAnalysis: JobPostingAnalysis | null = JOB_ANALYSIS,
): Promise<PositioningDecisionShadowRun | null> {
  return runPositioningDecisionShadow({
    positioningId: POSITIONING_ID,
    cv: CV,
    jobAnalysis,
    priorAnswers: { 'candidat:Disponibilité ?': 'Immédiate' },
  });
}

/** Passe par le vrai `runPositioningDecisionShadow`, avec `decide` simulé. */
async function completedShadowRun(): Promise<PositioningDecisionShadowRun> {
  vi.stubEnv(SHADOW_ENV, '1');
  decideMock.mockResolvedValueOnce(DECIDE_RESULT);
  const run = await runShadow();
  if (!run) throw new Error('Le mode ombre aurait dû produire un résultat');
  return run;
}

function logShadow(
  shadowRun: Promise<PositioningDecisionShadowRun | null>,
  llm: {
    llmMatchScore: number | null;
    llmMatchScoreConfidence: 'low' | 'medium' | 'high' | null;
  } = { llmMatchScore: 72, llmMatchScoreConfidence: 'medium' },
): Promise<void> {
  return logPositioningDecisionShadow(supabase, {
    shadowRun,
    positioningId: POSITIONING_ID,
    candidateId: 'cand-1',
    orgId: 'org-1',
    workflowRunId: 'run-1',
    ...llm,
  });
}

/** Tout ce que `console.warn` a reçu, erreurs et objets imbriqués compris. */
function serializedWarnings(warnSpy: { mock: { calls: unknown[][] } }): string {
  return inspect(warnSpy.mock.calls, { depth: 10 });
}

describe('mode ombre du score par décision', () => {
  let warnSpy: MockInstance<typeof console.warn>;

  beforeEach(() => {
    decideMock.mockReset();
    logAiUsageMock.mockReset();
    logAiUsageMock.mockResolvedValue(undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
  });

  // ─── runPositioningDecisionShadow ──────────────────────────────

  it('O1 — interrupteur absent ou différent de « 1 » : aucun appel, aucun avertissement', async () => {
    for (const value of [undefined, '0', 'true']) {
      vi.stubEnv(SHADOW_ENV, value);
      expect(isPositioningDecisionShadowEnabled()).toBe(false);
      await expect(runShadow()).resolves.toBeNull();
    }

    expect(decideMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('O2 — interrupteur actif mais aucun point clé : aucun appel', async () => {
    vi.stubEnv(SHADOW_ENV, '1');
    expect(isPositioningDecisionShadowEnabled()).toBe(true);

    await expect(runShadow(null)).resolves.toBeNull();
    await expect(runShadow(jobAnalysisWith([]))).resolves.toBeNull();
    // Points clés présents mais tous inutilisables : aucune question, donc aucun appel.
    await expect(runShadow(jobAnalysisWith([keyPoint({ label: '  ' })]))).resolves.toBeNull();

    expect(decideMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('O3 — interrupteur actif et points clés : un appel, résultat complet', async () => {
    vi.stubEnv(SHADOW_ENV, '1');
    decideMock.mockResolvedValueOnce(DECIDE_RESULT);

    const run = await runShadow();

    expect(decideMock).toHaveBeenCalledTimes(1);
    const [request] = decideMock.mock.calls[0];
    expect(request.model).toBe(DECISION_SHADOW_MODEL_ID);
    expect(request.input).toContain(CV_MARKER);
    expect(request.input).toContain('Immédiate');
    expect(request.input).not.toContain('Barème mission');
    expect(request.questions.map((q) => q.name)).toStrictEqual(['kp_0', 'hc_0']);

    expect(run).not.toBeNull();
    expect(run?.questions).toStrictEqual(request.questions);
    expect(run?.questionIndex.map((entry) => entry.keyPointId)).toStrictEqual([
      'react',
      'habilitation',
    ]);
    expect(run?.droppedKeyPointCount).toBe(0);
    expect(run?.stateChars).toBe(request.input.length);
    expect(run?.decideResult).toBe(DECIDE_RESULT);
    expect(run?.score.uncappedScore).toBe(80);
    expect(run?.score.decisionScore).toBe(39);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('O4 — délai dépassé : résout null, un avertissement sans contenu de CV', async () => {
    vi.stubEnv(SHADOW_ENV, '1');
    decideMock.mockRejectedValueOnce(
      new DecisionApiError('timeout', 'Decisions API request timed out after 15000 ms'),
    );

    await expect(runShadow()).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][1]).toMatchObject({
      positioningId: POSITIONING_ID,
      errorName: 'DecisionApiError',
      errorKind: 'timeout',
    });
    expect(serializedWarnings(warnSpy)).not.toContain(CV_MARKER);
  });

  it('O5 — erreur quelconque : résout null, seul le nom de l’erreur est logué', async () => {
    vi.stubEnv(SHADOW_ENV, '1');
    decideMock.mockRejectedValueOnce(new RangeError(`contenu sensible ${CV_MARKER}`));

    await expect(runShadow()).resolves.toBeNull();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][1]).toStrictEqual({
      positioningId: POSITIONING_ID,
      errorName: 'RangeError',
    });
    expect(serializedWarnings(warnSpy)).not.toContain(CV_MARKER);
  });

  // ─── logPositioningDecisionShadow ──────────────────────────────

  it('O6 — mode ombre sans résultat : aucune ligne', async () => {
    await expect(logShadow(Promise.resolve(null))).resolves.toBeUndefined();

    expect(logAiUsageMock).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('O7 — une seule ligne, 13 champs en sortie, pas de CV en entrée (D8)', async () => {
    const run = await completedShadowRun();

    await logShadow(Promise.resolve(run));

    expect(logAiUsageMock).toHaveBeenCalledTimes(1);
    const [client, params] = logAiUsageMock.mock.calls[0];
    expect(client).toBe(supabase);
    expect(params).toMatchObject({
      operation: 'analysis',
      taskKey: 'positioning.analysis.decisionShadow',
      aiModel: DECISION_SHADOW_MODEL_ID,
      usage: DECIDE_RESULT.usage,
      durationMs: DECIDE_RESULT.durationMs,
      positioningId: POSITIONING_ID,
      candidateId: 'cand-1',
      orgId: 'org-1',
      workflowRunId: 'run-1',
    });

    const outputPayload = params.outputPayload as Record<string, unknown>;
    expect(Object.keys(outputPayload).sort()).toStrictEqual([...OUTPUT_PAYLOAD_KEYS].sort());
    expect(outputPayload).toStrictEqual(
      buildPositioningDecisionShadowOutputPayload(run, {
        llmMatchScore: 72,
        llmMatchScoreConfidence: 'medium',
      }),
    );
    expect(outputPayload).toMatchObject({
      answers: DECIDE_RESULT.answers,
      decisionScore: 39,
      uncappedScore: 80,
      hardConstraintFailures: [{ name: 'hc_0', keyPointId: 'habilitation', probability: 0.2 }],
      refusalCount: 0,
      questionCount: 2,
      llmMatchScore: 72,
      llmMatchScoreConfidence: 'medium',
      gatewayCostUsd: 0.0000313,
      finalProvider: 'openai',
    });

    const inputPayload = params.inputPayload as Record<string, unknown>;
    expect(inputPayload.model).toBe(DECISION_SHADOW_MODEL_ID);
    expect(inputPayload.questions).toStrictEqual(run.questions);
    expect(inputPayload.stateChars).toBe(run.stateChars);
    expect(inputPayload.droppedKeyPointCount).toBe(0);
    // L'état (CV + réponses) n'est pas recopié : seule sa taille est journalisée.
    expect(JSON.stringify(inputPayload)).not.toContain(CV_MARKER);
    expect(JSON.stringify(outputPayload)).not.toContain(CV_MARKER);
  });

  it('O8 — échec de la journalisation : résout quand même, avec un avertissement', async () => {
    const run = await completedShadowRun();
    logAiUsageMock.mockRejectedValueOnce(new Error(`insert refusé ${CV_MARKER}`));

    await expect(logShadow(Promise.resolve(run))).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][1]).toStrictEqual({
      positioningId: POSITIONING_ID,
      errorName: 'Error',
    });
    expect(serializedWarnings(warnSpy)).not.toContain(CV_MARKER);
  });

  it('O9 — promesse du mode ombre rejetée : résout sans lever', async () => {
    await expect(logShadow(Promise.reject(new Error('inattendu')))).resolves.toBeUndefined();

    expect(logAiUsageMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('O10 — analyse principale en échec : ligne écrite avec un score LLM à null', async () => {
    const run = await completedShadowRun();

    await logShadow(Promise.resolve(run), { llmMatchScore: null, llmMatchScoreConfidence: null });

    expect(logAiUsageMock).toHaveBeenCalledTimes(1);
    const [, params] = logAiUsageMock.mock.calls[0];
    const outputPayload = params.outputPayload as Record<string, unknown>;
    expect(outputPayload.llmMatchScore).toBeNull();
    expect(outputPayload.llmMatchScoreConfidence).toBeNull();
    // Le score par décision, lui, est bien journalisé : l'appel a eu lieu et a été facturé.
    expect(outputPayload.decisionScore).toBe(39);
    expect(Object.keys(outputPayload).sort()).toStrictEqual([...OUTPUT_PAYLOAD_KEYS].sort());
    expect(params.usage).toBe(DECIDE_RESULT.usage);
  });
});
