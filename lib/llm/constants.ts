/** Aligné sur `lib/ai.ts` `modelName` — évite les imports circulaires. */
export const DEFAULT_GATEWAY_MODEL_ID = 'google/gemini-2.5-flash';

/**
 * Modèle de décision du mode ombre « score par décision » (analyse de positionnement).
 * Appelé par HTTP direct sur l'API Decisions de l'AI Gateway (`lib/llm/decide.ts`), pas par le
 * SDK `ai` : la version installée n'expose pas les modèles de décision.
 */
export const DECISION_SHADOW_MODEL_ID = 'openai/gpt-6-luna-decisions';
