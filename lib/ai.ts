
import { createGateway, extractJsonMiddleware, wrapLanguageModel, type LanguageModel } from 'ai';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
});

/** Identifiant gateway / facturation ; doit exister dans `lib/pricing.ts` (`MODEL_PRICING_USD`). */
export const modelName = 'google/gemini-2.5-flash';

/**
 * Température 0 pour toutes les tâches factuelles (transcription, extraction, analyse, JSON structuré).
 * Réduit la variance entre exécutions et limite les inventions par rapport au prompt / aux pièces jointes.
 */
export const llmFactualGenerationSettings = {
  temperature: 0,
  maxTokens: 8192,
  topP: 0.95,
} as const;

/**
 * Paramètres pour les tâches d'extraction mécanique (transcription PDF, extraction CV).
 * Désactive le thinking de Gemini 2.5 Flash : l'extraction est une copie structurée de données,
 * pas une tâche de raisonnement. Sans thinking, le premier token JSON arrive immédiatement
 * au lieu d'attendre 30-90s de réflexion → résout le timeout sur la branche experiences.
 */
export const llmExtractionSettings = {
  temperature: 0,
  maxTokens: 8192,
  topP: 0.95,
  providerOptions: {
    google: { thinkingConfig: { thinkingBudget: 0 } },
  },
};

/** Instancie un modèle gateway (optionnellement avec `extractJsonMiddleware` pour `Output.object`). */
export function createGatewayLanguageModel(gatewayModelId: string, useExtractJson: boolean): LanguageModel {
  const m = gateway(gatewayModelId);
  return useExtractJson
    ? wrapLanguageModel({
        model: m,
        middleware: extractJsonMiddleware(),
      })
    : m;
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

const baseModel = gateway(modelName);

/** Modèle par défaut (OCR, generateObject, etc.) */
export const model = baseModel;

/** Modèle avec déballage des blocs JSON (fences markdown) pour streamText + Output.object */
export const extractionModel = wrapLanguageModel({
  model: baseModel,
  middleware: extractJsonMiddleware(),
});
