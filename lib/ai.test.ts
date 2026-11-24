import { describe, expect, it } from 'vitest';
import {
  generateText,
  simulateReadableStream,
  streamText,
  wrapLanguageModel,
  type LanguageModelMiddleware,
} from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import {
  GATEWAY_COMPLIANCE_OPTIONS,
  applyGatewayCompliance,
  guardLanguageModel,
  llmExtractionSettings,
  modelName,
  usageModelIds,
  type GatewayCallParams,
} from '@/lib/ai';
import { DEFAULT_GATEWAY_MODEL_ID } from '@/lib/llm/constants';

const EU_REGION = { scope: 'zone', geoRegion: 'eu' };
const EXPECTED_GATEWAY = { zeroDataRetention: true, inferenceRegion: EU_REGION };

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function mockModel(text = 'OK'): MockLanguageModelV3 {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text }],
      finishReason: { unified: 'stop', raw: undefined },
      usage,
      warnings: [],
    }),
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: 'stream-start', warnings: [] },
          { type: 'text-start', id: 't1' },
          { type: 'text-delta', id: 't1', delta: text },
          { type: 'text-end', id: 't1' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
        ],
      }),
    }),
  });
}

const NON_REASONING_ID = 'google/gemini-2.5-flash';

describe('garde-fou Gateway ZDR + UE (lib/ai.ts)', () => {
  it('ajoute zeroDataRetention et la région UE quand l’appelant ne passe rien', async () => {
    const base = mockModel();
    await generateText({ model: guardLanguageModel(base, NON_REASONING_ID, false), prompt: 'x' });
    expect(base.doGenerateCalls[0].providerOptions?.gateway).toEqual(EXPECTED_GATEWAY);
  });

  it('écrase zeroDataRetention: false passé par l’appelant', async () => {
    const base = mockModel();
    await generateText({
      model: guardLanguageModel(base, NON_REASONING_ID, false),
      prompt: 'x',
      providerOptions: { gateway: { zeroDataRetention: false } },
    });
    expect(base.doGenerateCalls[0].providerOptions?.gateway?.zeroDataRetention).toBe(true);
  });

  it('écrase une autre région d’inférence (us, global)', async () => {
    for (const inferenceRegion of [{ scope: 'zone', geoRegion: 'us' }, { scope: 'global' }]) {
      const base = mockModel();
      await generateText({
        model: guardLanguageModel(base, NON_REASONING_ID, false),
        prompt: 'x',
        providerOptions: { gateway: { inferenceRegion } },
      });
      expect(base.doGenerateCalls[0].providerOptions?.gateway?.inferenceRegion).toEqual(EU_REGION);
    }
  });

  it('conserve les autres options gateway et fournisseur', async () => {
    const base = mockModel();
    await generateText({
      model: guardLanguageModel(base, NON_REASONING_ID, false),
      prompt: 'x',
      providerOptions: {
        gateway: { order: ['openai'], user: 'u-1' },
        openai: { reasoningEffort: 'low' },
      },
    });
    const opts = base.doGenerateCalls[0].providerOptions;
    expect(opts?.gateway).toEqual({ order: ['openai'], user: 'u-1', ...EXPECTED_GATEWAY });
    expect(opts?.openai).toEqual({ reasoningEffort: 'low' });
  });

  it('se compose avec extractJsonMiddleware et reste le middleware le plus interne', async () => {
    const base = mockModel('```json\n{"a":1}\n```');
    const guarded = guardLanguageModel(base, NON_REASONING_ID, true);

    const result = await generateText({ model: guarded, prompt: 'x' });
    expect(result.text).toBe('{"a":1}');
    expect(base.doGenerateCalls[0].providerOptions?.gateway).toEqual(EXPECTED_GATEWAY);

    const hostile: LanguageModelMiddleware = {
      specificationVersion: 'v3',
      transformParams: async ({ params }) => ({
        ...params,
        providerOptions: {
          ...params.providerOptions,
          gateway: { zeroDataRetention: false, inferenceRegion: { scope: 'global' } },
        },
      }),
    };
    const outer = wrapLanguageModel({
      model: guarded as Parameters<typeof wrapLanguageModel>[0]['model'],
      middleware: hostile,
    });
    await generateText({ model: outer, prompt: 'x' });
    expect(base.doGenerateCalls[1].providerOptions?.gateway).toEqual(EXPECTED_GATEWAY);
  });

  it('s’applique aussi en streaming (doStream)', async () => {
    const base = mockModel();
    const result = streamText({
      model: guardLanguageModel(base, NON_REASONING_ID, false),
      prompt: 'x',
      providerOptions: { gateway: { zeroDataRetention: false } },
    });
    expect(await result.text).toBe('OK');
    expect(base.doStreamCalls[0].providerOptions?.gateway).toEqual(EXPECTED_GATEWAY);
  });

  it('retire temperature/topP pour les modèles OpenAI de raisonnement uniquement', async () => {
    const reasoning = mockModel();
    await generateText({
      model: guardLanguageModel(reasoning, 'openai/gpt-6-luna', false),
      prompt: 'x',
      temperature: 0,
      topP: 0.95,
    });
    expect(reasoning.doGenerateCalls[0].temperature).toBeUndefined();
    expect(reasoning.doGenerateCalls[0].topP).toBeUndefined();

    const classic = mockModel();
    await generateText({
      model: guardLanguageModel(classic, NON_REASONING_ID, false),
      prompt: 'x',
      temperature: 0,
      topP: 0.95,
    });
    expect(classic.doGenerateCalls[0].temperature).toBe(0);
    expect(classic.doGenerateCalls[0].topP).toBe(0.95);
  });

  it('désactive le mode strict JSON des modèles OpenAI (schémas à champs optionnels), sans toucher aux autres', async () => {
    const openai = mockModel();
    await generateText({
      model: guardLanguageModel(openai, 'openai/gpt-6-luna', false),
      prompt: 'x',
      providerOptions: { openai: { reasoningEffort: 'low' } },
    });
    expect(openai.doGenerateCalls[0].providerOptions?.openai).toEqual({
      strictJsonSchema: false,
      reasoningEffort: 'low',
    });
    expect(openai.doGenerateCalls[0].providerOptions?.gateway).toEqual(EXPECTED_GATEWAY);

    const explicit = mockModel();
    await generateText({
      model: guardLanguageModel(explicit, 'openai/gpt-6-luna', false),
      prompt: 'x',
      providerOptions: { openai: { strictJsonSchema: true } },
    });
    expect(explicit.doGenerateCalls[0].providerOptions?.openai).toEqual({ strictJsonSchema: true });

    const other = mockModel();
    await generateText({ model: guardLanguageModel(other, NON_REASONING_ID, false), prompt: 'x' });
    expect(other.doGenerateCalls[0].providerOptions?.openai).toBeUndefined();
  });

  it('GATEWAY_COMPLIANCE_OPTIONS est gelé et n’est pas partagé par référence', () => {
    expect(Object.isFrozen(GATEWAY_COMPLIANCE_OPTIONS)).toBe(true);
    expect(Object.isFrozen(GATEWAY_COMPLIANCE_OPTIONS.inferenceRegion)).toBe(true);

    const out = applyGatewayCompliance({ prompt: [] } as GatewayCallParams);
    const gw = out.providerOptions?.gateway as { inferenceRegion: { geoRegion: string } };
    gw.inferenceRegion.geoRegion = 'us';
    expect(GATEWAY_COMPLIANCE_OPTIONS.inferenceRegion.geoRegion).toBe('eu');
  });
});

describe('modèle par défaut openai/gpt-6-luna', () => {
  it('modelName, DEFAULT_GATEWAY_MODEL_ID et usageModelIds pointent sur openai/gpt-6-luna', () => {
    expect(modelName).toBe('openai/gpt-6-luna');
    expect(DEFAULT_GATEWAY_MODEL_ID).toBe(modelName);
    for (const id of Object.values(usageModelIds)) expect(id).toBe(modelName);
  });

  it('les réglages d’extraction réduisent le raisonnement OpenAI et n’ont plus d’option Gemini', () => {
    expect(llmExtractionSettings.providerOptions).toEqual({ openai: { reasoningEffort: 'low' } });
    expect(llmExtractionSettings.providerOptions).not.toHaveProperty('google');
  });
});
