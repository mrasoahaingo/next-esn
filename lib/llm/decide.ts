import type { LanguageModelUsage } from 'ai';
import { z } from 'zod';

/**
 * Client HTTP de l'API Decisions de l'AI Gateway.
 *
 * `ai@6` n'expose pas les modèles de décision (spécification v4, AI SDK 7) : l'appel passe donc
 * par `fetch`, sans SDK ni dépendance. Pas de streaming, pas de texte généré : le modèle renvoie
 * une réponse structurée par question.
 */

export const DECISIONS_ENDPOINT_URL = 'https://ai-gateway.vercel.sh/v1/decisions';

/** Délai maximal d'un appel, lecture du corps comprise. */
export const DECISION_REQUEST_TIMEOUT_MS = 15_000;

// ─── Requête ─────────────────────────────────────────────────────

export type DecisionScoreLevel = { label: string; description?: string };

export type DecisionQuestion =
  | { type: 'score'; name: string; instructions: string; levels: DecisionScoreLevel[] }
  | { type: 'predicate'; name: string; instructions: string };

// ─── Réponse ─────────────────────────────────────────────────────

/**
 * `z.object` retire les clés inconnues (Zod 4) : rien de ce qui n'est pas déclaré ici ne sort du
 * module. Ne pas passer à `z.looseObject` ni à `.passthrough()`.
 */
export const decisionAnswerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('score'),
    name: z.string(),
    /** Espérance de l'indice de niveau (0 à nbNiveaux − 1). */
    score: z.number(),
    confidence: z.number().optional(),
    probabilities: z
      .array(
        z.object({
          value: z.number(),
          label: z.string().optional(),
          probability: z.number(),
        }),
      )
      .optional(),
  }),
  z.object({
    type: z.literal('predicate'),
    name: z.string(),
    probability: z.number(),
  }),
  z.object({
    type: z.literal('choice'),
    name: z.string(),
    choice: z.unknown().optional(),
    confidence: z.number().optional(),
    probabilities: z
      .array(z.object({ value: z.unknown().optional(), probability: z.number() }))
      .optional(),
  }),
  /** Refus du modèle sur une question, à la position de cette question. */
  z.object({
    type: z.literal('refusal'),
    name: z.string(),
  }),
]);

export type DecisionAnswer = z.infer<typeof decisionAnswerSchema>;

/**
 * `provider_metadata` est réduit à `gateway.cost` et `gateway.routing.finalProvider` : le brut
 * contient les messages d'erreur des tentatives fournisseur et ne doit jamais être journalisé.
 * Purement informatif, il ne fait pas échouer la réponse s'il change de forme (`catch`).
 */
export const decisionResponseSchema = z.object({
  answers: z.array(decisionAnswerSchema),
  model: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
  provider_metadata: z
    .object({
      gateway: z
        .object({
          /** La passerelle renvoie une chaîne. */
          cost: z.union([z.string(), z.number()]).optional(),
          routing: z.object({ finalProvider: z.string().optional() }).optional(),
        })
        .optional(),
    })
    .optional()
    .catch(undefined),
});

export type DecideResult = {
  answers: DecisionAnswer[];
  usage: LanguageModelUsage;
  /** Coût facturé par la passerelle, ou `null` s'il est absent ou illisible. */
  gatewayCostUsd: number | null;
  finalProvider: string | null;
  durationMs: number;
};

// ─── Erreurs ─────────────────────────────────────────────────────

export type DecisionApiErrorKind =
  | 'missing_api_key'
  | 'http'
  | 'timeout'
  | 'network'
  | 'invalid_response';

/**
 * Erreur du client. Son message est **sûr par construction** : il ne porte que le statut HTTP,
 * les champs `type` / `code` / `param` de l'erreur API, le nom d'une erreur réseau et les chemins
 * des erreurs de validation. Jamais le `message` libre de l'API (il peut citer l'entrée, donc le
 * CV), jamais le corps de la requête, jamais la clé. Il peut donc être logué tel quel.
 */
export class DecisionApiError extends Error {
  readonly kind: DecisionApiErrorKind;
  readonly status?: number;

  constructor(kind: DecisionApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'DecisionApiError';
    this.kind = kind;
    this.status = status;
  }
}

/** Nombre maximal de chemins d'erreur de validation cités dans un message. */
const MAX_REPORTED_ISSUE_PATHS = 5;

/** Jeton de type identifiant : écarte tout texte libre (espaces, ponctuation, accents). */
const SAFE_TOKEN_PATTERN = /^[A-Za-z0-9_.\-[\]]{1,80}$/;

function safeToken(value: unknown): string | undefined {
  return typeof value === 'string' && SAFE_TOKEN_PATTERN.test(value) ? value : undefined;
}

function readErrorName(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('name' in error)) return 'UnknownError';
  return safeToken(error.name) ?? 'UnknownError';
}

const decisionApiErrorBodySchema = z.object({
  error: z.object({
    type: z.unknown().optional(),
    code: z.unknown().optional(),
    param: z.unknown().optional(),
  }),
});

/** Lecture best-effort : `undefined` si le texte n'est pas du JSON. Ne lève jamais. */
function parseJsonOrUndefined(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function buildHttpErrorMessage(status: number, bodyText: string): string {
  const parsed = decisionApiErrorBodySchema.safeParse(parseJsonOrUndefined(bodyText));
  if (!parsed.success) return `Decisions API HTTP ${status}`;

  const { type, code, param } = parsed.data.error;
  const details = [
    ['type', safeToken(type)],
    ['code', safeToken(code)],
    ['param', safeToken(param)],
  ]
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`);

  return details.length > 0
    ? `Decisions API HTTP ${status} (${details.join(', ')})`
    : `Decisions API HTTP ${status}`;
}

// ─── Appel ───────────────────────────────────────────────────────

function toLanguageModelUsage(
  usage: z.infer<typeof decisionResponseSchema>['usage'],
): LanguageModelUsage {
  return {
    inputTokens: usage?.input_tokens,
    inputTokenDetails: {
      noCacheTokens: undefined,
      cacheReadTokens: undefined,
      cacheWriteTokens: undefined,
    },
    outputTokens: usage?.output_tokens,
    outputTokenDetails: {
      textTokens: undefined,
      reasoningTokens: undefined,
    },
    totalTokens: usage?.total_tokens,
  };
}

function parseGatewayCostUsd(cost: string | number | undefined): number | null {
  if (cost === undefined) return null;
  const parsed = typeof cost === 'number' ? cost : Number.parseFloat(cost);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Pose `questions` au modèle de décision sur l'état `input`.
 *
 * Lève toujours un `DecisionApiError` (jamais une erreur brute). La rétention zéro est imposée :
 * l'appelant ne peut pas la désactiver.
 */
export async function decide(params: {
  model: string;
  input: string;
  questions: DecisionQuestion[];
  timeoutMs?: number;
}): Promise<DecideResult> {
  // Lue à l'appel, pas au chargement du module : le module reste importable sans la clé.
  const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) {
    throw new DecisionApiError('missing_api_key', 'AI_GATEWAY_API_KEY is not set');
  }

  const timeoutMs = params.timeoutMs ?? DECISION_REQUEST_TIMEOUT_MS;
  const startedAt = Date.now();

  let status: number;
  let isSuccess: boolean;
  let bodyText: string;

  // Un seul bloc couvre l'envoi ET la lecture du corps : le délai s'applique aux deux.
  try {
    const response = await fetch(DECISIONS_ENDPOINT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        input: params.input,
        questions: params.questions,
        providerOptions: {
          gateway: { zeroDataRetention: true, inferenceRegion: { scope: 'zone', geoRegion: 'eu' } },
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    status = response.status;
    isSuccess = response.ok;
    bodyText = await response.text();
  } catch (error) {
    if (error instanceof DecisionApiError) throw error;
    const errorName = readErrorName(error);
    if (errorName === 'TimeoutError' || errorName === 'AbortError') {
      throw new DecisionApiError(
        'timeout',
        `Decisions API request timed out after ${timeoutMs} ms`,
      );
    }
    throw new DecisionApiError('network', `Decisions API network error (${errorName})`);
  }

  const durationMs = Date.now() - startedAt;

  if (!isSuccess) {
    throw new DecisionApiError('http', buildHttpErrorMessage(status, bodyText), status);
  }

  const parsed = decisionResponseSchema.safeParse(parseJsonOrUndefined(bodyText));
  if (!parsed.success) {
    const paths = parsed.error.issues
      .slice(0, MAX_REPORTED_ISSUE_PATHS)
      .map((issue) => issue.path.map(String).join('.') || '(racine)');
    throw new DecisionApiError(
      'invalid_response',
      `Decisions API returned an invalid response (${paths.join(', ')})`,
      status,
    );
  }

  const gateway = parsed.data.provider_metadata?.gateway;

  return {
    answers: parsed.data.answers,
    usage: toLanguageModelUsage(parsed.data.usage),
    gatewayCostUsd: parseGatewayCostUsd(gateway?.cost),
    finalProvider: gateway?.routing?.finalProvider ?? null,
    durationMs,
  };
}
