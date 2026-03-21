/**
 * Barème USD par million de tokens, aligné sur les identifiants `ai_usage_log.ai_model`
 * (même chaîne que le modèle passé au AI Gateway, ex. `google/gemini-2.5-flash`).
 *
 * Mettre à jour les montants selon la grille officielle du fournisseur
 * (ex. https://ai.google.dev/pricing) — les tarifs changent.
 *
 * Tokens cache : si `cacheReadUsdPer1M` est défini, `cache_read_tokens` est facturé à ce tarif
 * (souvent différent du prompt « normal » côté Google).
 */
export type ModelPricingUsd = {
  inputUsdPer1M: number;
  outputUsdPer1M: number;
  /** Si absent, les tokens cache ne sont pas ajoutés au coût (conservateur). */
  cacheReadUsdPer1M?: number;
};

/** Clés = valeur exacte de `ai_model` en base */
export const MODEL_PRICING_USD: Record<string, ModelPricingUsd> = {
  'google/gemini-2.5-flash': {
    // Ordre de grandeur type « Flash » — à ajuster selon la facturation réelle
    inputUsdPer1M: 0.075,
    outputUsdPer1M: 0.3,
    cacheReadUsdPer1M: 0.01875,
  },
};

export function getModelPricing(aiModel: string): ModelPricingUsd | undefined {
  return MODEL_PRICING_USD[aiModel];
}

export type UsageRowForPricing = {
  ai_model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens?: number | null;
};

function computeUsd(row: UsageRowForPricing, p: ModelPricingUsd): number {
  const input = (row.input_tokens ?? 0) / 1_000_000;
  const output = (row.output_tokens ?? 0) / 1_000_000;
  const cacheRead = (row.cache_read_tokens ?? 0) / 1_000_000;

  let usd = input * p.inputUsdPer1M + output * p.outputUsdPer1M;
  if (p.cacheReadUsdPer1M != null && cacheRead > 0) {
    usd += cacheRead * p.cacheReadUsdPer1M;
  }
  return usd;
}

/**
 * Estime le coût en USD pour une ligne de `ai_usage_log`.
 * `dbPricingByGateway` : tarifs issus de `llm_models` (prioritaires), sinon `MODEL_PRICING_USD`.
 */
export function estimateUsageCostUsd(
  row: UsageRowForPricing,
  dbPricingByGateway?: Map<string, ModelPricingUsd>,
): number | null {
  const p = dbPricingByGateway?.get(row.ai_model) ?? getModelPricing(row.ai_model);
  if (!p) return null;
  return computeUsd(row, p);
}
