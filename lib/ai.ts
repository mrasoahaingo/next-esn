
import {
  createGateway,
  extractJsonMiddleware,
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware,
} from 'ai';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
});

/** Identifiant gateway / facturation ; doit exister dans `lib/pricing.ts` (`MODEL_PRICING_USD`). */
export const modelName = 'openai/gpt-6-luna';

/**
 * Température 0 pour toutes les tâches factuelles (transcription, extraction, analyse, JSON structuré).
 * Réduit la variance entre exécutions et limite les inventions par rapport au prompt / aux pièces jointes.
 *
 * Pour les modèles OpenAI de raisonnement (dont `openai/gpt-6-luna`), le garde-fou retire
 * automatiquement `temperature` et `topP` (refusés par l'API) ; ils restent utiles si un admin
 * choisit un modèle non-raisonnement. `maxTokens` n'est pas un paramètre d'ai 6 (seul
 * `maxOutputTokens` existe) : il est ignoré, et volontairement non renommé — sur un modèle de
 * raisonnement, `maxOutputTokens` inclut les tokens de raisonnement et tronquerait les JSON longs.
 */
export const llmFactualGenerationSettings = {
  temperature: 0,
  maxTokens: 8192,
  topP: 0.95,
} as const;

/**
 * Paramètres pour les tâches d'extraction mécanique (transcription PDF, extraction CV).
 * L'extraction est une copie structurée de données, pas une tâche de raisonnement : on réduit
 * l'effort de raisonnement pour que le premier token JSON arrive vite, au lieu d'attendre 30-90 s
 * de réflexion (timeout historique de la branche experiences).
 *
 * `reasoningEffort: 'low'` : valeur la plus basse acceptée par tous les modèles OpenAI de
 * raisonnement ; une valeur refusée ferait échouer toute l'extraction. Le catalogue du Gateway ne
 * liste pas `minimal` pour gpt-6-luna.
 *
 * `temperature` / `topP` : retirés par le garde-fou pour les modèles OpenAI de raisonnement.
 * `maxTokens` : ignoré par ai 6, volontairement non renommé (voir `llmFactualGenerationSettings`).
 */
export const llmExtractionSettings = {
  temperature: 0,
  maxTokens: 8192,
  topP: 0.95,
  providerOptions: {
    openai: { reasoningEffort: 'low' },
  },
};

// ─── Conformité Gateway (ZDR + UE) ─────────────────────────────────────────────
//
// Les CV sont des données personnelles. Chaque appel au Vercel AI Gateway part donc avec :
// - `zeroDataRetention: true` : seuls les fournisseurs sans conservation des données sont éligibles ;
// - `inferenceRegion: { scope: 'zone', geoRegion: 'eu' }` : l'inférence a lieu dans l'Union européenne.
//
// Ces deux options ne sont PAS surchargeables : le garde-fou est le middleware le plus interne
// (au plus près de `gateway(id)`) et étale ses clés en dernier, après celles de l'appelant.
// Si le Gateway ne peut pas honorer ZDR + UE pour le modèle demandé, l'appel échoue : c'est voulu,
// il n'y a aucun repli. Le ZDR par requête exige un compte Gateway payant.
//
// Ne jamais instancier le Gateway ailleurs : ESLint (`no-restricted-imports`) et
// `lib/ai-guard.test.ts` bloquent tout import de `createGateway` / `gateway` / `@ai-sdk/*` hors de ce fichier.

/** Options imposées. Type local : `@ai-sdk/gateway` n'est pas une dépendance directe et ne type pas `inferenceRegion`. */
type GatewayComplianceOptions = {
  readonly zeroDataRetention: true;
  readonly inferenceRegion: { readonly scope: 'zone'; readonly geoRegion: 'eu' };
};

export const GATEWAY_COMPLIANCE_OPTIONS: GatewayComplianceOptions = Object.freeze({
  zeroDataRetention: true,
  inferenceRegion: Object.freeze({ scope: 'zone', geoRegion: 'eu' }),
} as const);

/** Paramètres d'appel tels que vus par un middleware de modèle de langage. */
export type GatewayCallParams = Parameters<NonNullable<LanguageModelMiddleware['transformParams']>>[0]['params'];

/** Copie des paramètres où les options gateway de conformité écrasent celles de l'appelant. */
export function applyGatewayCompliance(params: GatewayCallParams): GatewayCallParams {
  return {
    ...params,
    providerOptions: {
      ...params.providerOptions,
      gateway: {
        ...(params.providerOptions?.gateway ?? {}),
        zeroDataRetention: GATEWAY_COMPLIANCE_OPTIONS.zeroDataRetention,
        inferenceRegion: {
          scope: GATEWAY_COMPLIANCE_OPTIONS.inferenceRegion.scope,
          geoRegion: GATEWAY_COMPLIANCE_OPTIONS.inferenceRegion.geoRegion,
        },
      },
    },
  };
}

/**
 * Modèles OpenAI de raisonnement (o1, o3, o4-mini, gpt-5 … gpt-9), hors variantes `-chat`.
 * L'API OpenAI refuse une `temperature` non par défaut sur ces modèles, et le provider côté Gateway
 * ne reconnaît pas forcément les ids récents (ex. gpt-6-luna) pour la retirer lui-même.
 */
export function isOpenAiReasoningGatewayModel(gatewayModelId: string): boolean {
  return /^openai\/(o\d|gpt-[5-9])/.test(gatewayModelId) && !gatewayModelId.includes('-chat');
}

/** Middleware garde-fou : ZDR + UE sur chaque appel, retrait temperature/topP pour les modèles de raisonnement. */
export function createGatewayGuardMiddleware(gatewayModelId: string): LanguageModelMiddleware {
  const stripSampling = isOpenAiReasoningGatewayModel(gatewayModelId);
  return {
    specificationVersion: 'v3',
    transformParams: async ({ params }) => {
      const compliant = applyGatewayCompliance(params);
      return stripSampling ? { ...compliant, temperature: undefined, topP: undefined } : compliant;
    },
  };
}

type WrappableModel = Parameters<typeof wrapLanguageModel>[0]['model'];

/**
 * Enveloppe un modèle avec le garde-fou (middleware le plus interne), puis optionnellement
 * `extractJsonMiddleware` autour (déballage des fences markdown pour `Output.object`).
 */
export function guardLanguageModel(
  base: WrappableModel,
  gatewayModelId: string,
  useExtractJson: boolean,
): LanguageModel {
  const guarded = wrapLanguageModel({
    model: base,
    middleware: createGatewayGuardMiddleware(gatewayModelId),
  });
  return useExtractJson
    ? wrapLanguageModel({ model: guarded, middleware: extractJsonMiddleware() })
    : guarded;
}

/** Instancie un modèle gateway gardé (ZDR + UE), optionnellement avec `extractJsonMiddleware` pour `Output.object`. */
export function createGatewayLanguageModel(gatewayModelId: string, useExtractJson: boolean): LanguageModel {
  return guardLanguageModel(gateway(gatewayModelId), gatewayModelId, useExtractJson);
}

/**
 * Chaînes à passer à `logAiUsage({ aiModel })` par type de flux.
 * Aujourd’hui tout pointe sur `modelName` ; pour un autre modèle par tâche,
 * changez uniquement la valeur ciblée (et ajoutez la clé dans `MODEL_PRICING_USD`).
 */
export const usageModelIds = {
  transcriptionAndExtraction: modelName,
  positioningAnalysis: modelName,
  positioningGeneration: modelName,
  jobPostingAnalysis: modelName,
  keyPointExplain: modelName,
} as const;

/** Modèle par défaut (OCR, generateObject, etc.), gardé ZDR + UE. */
export const model = createGatewayLanguageModel(modelName, false);

/** Modèle gardé avec déballage des blocs JSON (fences markdown) pour streamText + Output.object */
export const extractionModel = createGatewayLanguageModel(modelName, true);
