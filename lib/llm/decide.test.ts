import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DECISION_SHADOW_MODEL_ID } from '@/lib/llm/constants';
import {
  DECISIONS_ENDPOINT_URL,
  DECISION_REQUEST_TIMEOUT_MS,
  DecisionApiError,
  decide,
  type DecisionQuestion,
} from '@/lib/llm/decide';
import { TASK_KEY } from '@/lib/llm/task-keys';
import { estimateUsageCostUsd } from '@/lib/pricing';

// Aucun appel réseau réel : `fetch` est simulé. Fixtures = contrat vérifié de l'API Decisions.

const MODEL = 'openai/gpt-6-luna-decisions';
const INPUT = '## CV du candidat (JSON)\n\n{}';

const QUESTIONS: DecisionQuestion[] = [
  {
    type: 'score',
    name: 'kp_0',
    instructions: 'Critère : React',
    levels: [
      { label: 'missing', description: 'Aucune preuve dans le CV' },
      { label: 'partial' },
      { label: 'strong' },
    ],
  },
  { type: 'predicate', name: 'hc_0', instructions: 'Critère éliminatoire : habilitation' },
];

const NOMINAL_BODY = {
  answers: [
    {
      type: 'score',
      name: 'kp_0',
      score: 1.13,
      confidence: 0.48,
      probabilities: [
        { value: 0, label: 'missing', probability: 0.11 },
        { value: 1, label: 'partial', probability: 0.65 },
        { value: 2, label: 'strong', probability: 0.24 },
      ],
    },
    { type: 'predicate', name: 'hc_0', probability: 0 },
  ],
  model: MODEL,
  usage: { input_tokens: 313, output_tokens: 0, total_tokens: 313 },
  provider_metadata: { gateway: { cost: '0.0000313', routing: { finalProvider: 'openai' } } },
};

const HTTP_400_BODY = {
  error: {
    message: 'Texte libre EXTRAIT_CV',
    type: 'invalid_request_error',
    param: 'questions',
    code: 'invalid_questions',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn<typeof fetch>();

function callDecide(timeoutMs?: number): ReturnType<typeof decide> {
  return decide({ model: MODEL, input: INPUT, questions: QUESTIONS, timeoutMs });
}

/** Attend un rejet `DecisionApiError` et le renvoie (échoue si la promesse résout). */
async function captureDecisionError(promise: Promise<unknown>): Promise<DecisionApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(DecisionApiError);
    return error as DecisionApiError;
  }
  throw new Error('La promesse aurait dû rejeter');
}

/** `fetch` qui ne répond jamais et rejette avec la raison du signal quand le délai tombe. */
function mockFetchPendingUntilAbort(): void {
  fetchMock.mockImplementationOnce(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!signal) {
          reject(new Error('signal manquant'));
          return;
        }
        signal.addEventListener('abort', () => reject(signal.reason));
      }),
  );
}

/** Scénarios d'erreur des tests 5 à 10, rejoués par le test 11 (non-fuite de la clé). */
const ERROR_SCENARIOS: { label: string; run: () => Promise<DecisionApiError> }[] = [
  {
    label: 'HTTP 400',
    run: () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(HTTP_400_BODY, 400));
      return captureDecisionError(callDecide());
    },
  },
  {
    label: 'HTTP 500 non JSON',
    run: () => {
      fetchMock.mockResolvedValueOnce(new Response('<html>Bad gateway</html>', { status: 500 }));
      return captureDecisionError(callDecide());
    },
  },
  {
    label: '200 invalide',
    run: () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ model: MODEL }));
      return captureDecisionError(callDecide());
    },
  },
  {
    label: 'clé absente',
    run: () => {
      vi.stubEnv('AI_GATEWAY_API_KEY', '');
      return captureDecisionError(callDecide());
    },
  },
  {
    label: 'délai dépassé',
    run: () => {
      mockFetchPendingUntilAbort();
      return captureDecisionError(callDecide(20));
    },
  },
  {
    label: 'réseau',
    run: () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
      return captureDecisionError(callDecide());
    },
  },
];

describe('decide', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('AI_GATEWAY_API_KEY', 'test-key');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('test 1 — envoie une seule requête POST conforme au contrat', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(NOMINAL_BODY));

    await callDecide();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(DECISIONS_ENDPOINT_URL);
    expect(DECISIONS_ENDPOINT_URL).toBe('https://ai-gateway.vercel.sh/v1/decisions');
    expect(init?.method).toBe('POST');

    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer test-key');
    expect(headers.get('Content-Type')).toBe('application/json');

    expect(JSON.parse(String(init?.body))).toStrictEqual({
      model: MODEL,
      input: INPUT,
      questions: QUESTIONS,
      providerOptions: {
        gateway: { zeroDataRetention: true, inferenceRegion: { scope: 'zone', geoRegion: 'eu' } },
      },
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('test 2 — renvoie les réponses, l’usage, le coût et le fournisseur final', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(NOMINAL_BODY));

    const result = await callDecide();

    expect(result.answers).toHaveLength(2);
    expect(result.answers[0]).toMatchObject({ type: 'score', name: 'kp_0', score: 1.13 });
    expect(result.answers[1]).toStrictEqual({ type: 'predicate', name: 'hc_0', probability: 0 });
    expect(result.usage.inputTokens).toBe(313);
    expect(result.usage.outputTokens).toBe(0);
    expect(result.usage.totalTokens).toBe(313);
    expect(result.gatewayCostUsd).toBeCloseTo(0.0000313, 10);
    expect(result.finalProvider).toBe('openai');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('test 3 — accepte choice, refusal et un score sans probabilités ni confiance', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        answers: [
          {
            type: 'choice',
            name: 'c_0',
            choice: 'a',
            confidence: 0.6,
            probabilities: [
              { value: 'a', probability: 0.6 },
              { value: 'b', probability: 0.4 },
            ],
          },
          { type: 'refusal', name: 'kp_1' },
          { type: 'score', name: 'kp_0', score: 2 },
        ],
      }),
    );

    const result = await callDecide();

    expect(result.answers.map((a) => a.type)).toStrictEqual(['choice', 'refusal', 'score']);
    expect(result.answers[2]).toStrictEqual({ type: 'score', name: 'kp_0', score: 2 });
    // Ni `usage` ni `provider_metadata` dans la réponse : valeurs neutres, pas d'erreur.
    expect(result.usage.inputTokens).toBeUndefined();
    expect(result.gatewayCostUsd).toBeNull();
    expect(result.finalProvider).toBeNull();
  });

  it('test 4 — ne laisse jamais sortir le provider_metadata brut (D8)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ...NOMINAL_BODY,
        provider_metadata: {
          gateway: {
            cost: '0.0000313',
            routing: {
              finalProvider: 'openai',
              attempts: [{ provider: 'x', error: 'MESSAGE_FOURNISSEUR_SECRET' }],
            },
          },
        },
      }),
    );

    const result = await callDecide();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('MESSAGE_FOURNISSEUR_SECRET');
    expect(serialized).not.toContain('attempts');
    expect(result.finalProvider).toBe('openai');
    expect(result.gatewayCostUsd).toBeCloseTo(0.0000313, 10);
  });

  it('test 5 — HTTP 400 : erreur typée sans le message libre de l’API', async () => {
    const error = await ERROR_SCENARIOS[0].run();

    expect(error.name).toBe('DecisionApiError');
    expect(error.kind).toBe('http');
    expect(error.status).toBe(400);
    expect(error.message).toContain('invalid_request_error');
    expect(error.message).toContain('invalid_questions');
    expect(error.message).not.toContain('EXTRAIT_CV');
  });

  it('test 6 — HTTP 500 avec corps non JSON', async () => {
    const error = await ERROR_SCENARIOS[1].run();

    expect(error.kind).toBe('http');
    expect(error.status).toBe(500);
    expect(error.message).not.toContain('Bad gateway');
  });

  it('test 7 — réponse 200 non conforme', async () => {
    const missingAnswers = await ERROR_SCENARIOS[2].run();
    expect(missingAnswers.kind).toBe('invalid_response');

    fetchMock.mockResolvedValueOnce(jsonResponse({ answers: [{ type: 'score', name: 'kp_0' }] }));
    const scoreWithoutValue = await captureDecisionError(callDecide());
    expect(scoreWithoutValue.kind).toBe('invalid_response');

    fetchMock.mockResolvedValueOnce(new Response('pas du JSON', { status: 200 }));
    const notJson = await captureDecisionError(callDecide());
    expect(notJson.kind).toBe('invalid_response');
    expect(notJson.message).not.toContain('pas du JSON');
  });

  it('test 8 — clé absente : aucune requête émise', async () => {
    const error = await ERROR_SCENARIOS[3].run();

    expect(error.kind).toBe('missing_api_key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('test 9 — délai dépassé', async () => {
    const error = await ERROR_SCENARIOS[4].run();

    expect(error.kind).toBe('timeout');
  });

  it('test 10 — erreur réseau', async () => {
    const error = await ERROR_SCENARIOS[5].run();

    expect(error.kind).toBe('network');
    expect(error.message).toContain('TypeError');
    expect(error.message).not.toContain('fetch failed');
  });

  it('test 11 — aucun message d’erreur ne contient la clé', async () => {
    for (const scenario of ERROR_SCENARIOS) {
      vi.stubEnv('AI_GATEWAY_API_KEY', 'test-key');
      const error = await scenario.run();
      expect(error.message, scenario.label).not.toContain('test-key');
      expect(JSON.stringify({ ...error, message: error.message }), scenario.label).not.toContain(
        'test-key',
      );
    }
  });

  it('test 12 — constantes et tarif du modèle de décision', () => {
    expect(DECISION_SHADOW_MODEL_ID).toBe('openai/gpt-6-luna-decisions');
    expect(TASK_KEY.POSITIONING_ANALYSIS_DECISION_SHADOW).toBe(
      'positioning.analysis.decisionShadow',
    );
    expect(DECISION_REQUEST_TIMEOUT_MS).toBe(15000);
    expect(
      estimateUsageCostUsd({
        ai_model: DECISION_SHADOW_MODEL_ID,
        input_tokens: 1116,
        output_tokens: 0,
      }),
    ).toBeCloseTo(0.0001116, 10);
  });
});
