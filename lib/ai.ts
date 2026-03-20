
import { createGateway, extractJsonMiddleware, wrapLanguageModel } from 'ai';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY ?? '',
});

export const modelName = 'google/gemini-2.5-flash';

const baseModel = gateway(modelName);

/** Modèle par défaut (OCR, generateObject, etc.) */
export const model = baseModel;

/** Modèle avec déballage des blocs JSON (fences markdown) pour streamText + Output.object */
export const extractionModel = wrapLanguageModel({
  model: baseModel,
  middleware: extractJsonMiddleware(),
});
