
import { createGateway, extractJsonMiddleware, wrapLanguageModel, type LanguageModel } from 'ai';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
});

/** Identifiant gateway / facturation ; doit exister dans `lib/pricing.ts` (`MODEL_PRICING_USD`). */
export const modelName = 'google/gemini-2.5-flash';

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
