import { describe, expect, it } from 'vitest';
import { modelName } from '@/lib/ai';
import { estimateUsageCostUsd, getModelPricing } from '@/lib/pricing';

describe('tarifs MODEL_PRICING_USD', () => {
  it('connaît openai/gpt-6-luna au tarif zone UE', () => {
    expect(getModelPricing('openai/gpt-6-luna')).toEqual({
      inputUsdPer1M: 0.11,
      outputUsdPer1M: 0.55,
      cacheReadUsdPer1M: 0.011,
    });
  });

  it('connaît openai/gpt-6-luna-decisions et le modèle par défaut', () => {
    expect(getModelPricing('openai/gpt-6-luna-decisions')).toBeDefined();
    expect(getModelPricing(modelName)).toBeDefined();
  });

  it('calcule le coût d’un appel luna (1M entrée + 1M sortie ≈ 0,66 USD)', () => {
    const usd = estimateUsageCostUsd({
      ai_model: 'openai/gpt-6-luna',
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
      cache_read_tokens: 0,
    });
    expect(usd).toBeCloseTo(0.66, 6);
  });

  it('garde le tarif gemini pour les lignes historiques de ai_usage_log', () => {
    expect(getModelPricing('google/gemini-2.5-flash')).toBeDefined();
  });
});
