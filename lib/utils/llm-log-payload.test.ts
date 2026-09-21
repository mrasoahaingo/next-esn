import { describe, it, expect } from 'vitest';
import { LLM_LOG_MAX_STRING_CHARS, serializeLlmLogPayload } from '@/lib/utils/llm-log-payload';
import { AI_USAGE_SNAPSHOT_MAX_STRING_CHARS } from '@/lib/services/ai-usage.service';

type TruncationMeta = {
  _truncation?: { truncated: boolean; fields: { path: string; originalLength: number }[] };
};

describe('serializeLlmLogPayload', () => {
  it('tronque une chaîne au-delà du plafond et documente le champ coupé', () => {
    const originalLength = LLM_LOG_MAX_STRING_CHARS + 500;
    const payload = { summary: 'a'.repeat(originalLength) };

    const result = serializeLlmLogPayload(payload) as { summary: string } & TruncationMeta;

    expect(result.summary).toHaveLength(LLM_LOG_MAX_STRING_CHARS);
    expect(result._truncation?.truncated).toBe(true);
    expect(result._truncation?.fields).toContainEqual({
      path: 'summary',
      originalLength,
    });
  });

  it('laisse intact un payload sous le plafond', () => {
    const payload = { summary: 'court' };

    const result = serializeLlmLogPayload(payload) as { summary: string } & TruncationMeta;

    expect(result.summary).toBe('court');
    expect(result._truncation).toBeUndefined();
  });

  it('tronque les chaînes imbriquées dans un tableau d’objets (forme réelle d’une analyse)', () => {
    const originalLength = LLM_LOG_MAX_STRING_CHARS + 42;
    const payload = {
      experienceRelevance: [{ comment: 'b'.repeat(originalLength) }],
    };

    const result = serializeLlmLogPayload(payload) as {
      experienceRelevance: { comment: string }[];
    } & TruncationMeta;

    expect(result.experienceRelevance[0].comment).toHaveLength(LLM_LOG_MAX_STRING_CHARS);
    expect(result._truncation?.fields).toContainEqual({
      path: 'experienceRelevance[0].comment',
      originalLength,
    });
  });

  it('respecte un maxStringChars explicite (plafond snapshot)', () => {
    const originalLength = LLM_LOG_MAX_STRING_CHARS + 1000;
    const payload = { summary: 'c'.repeat(originalLength) };

    const result = serializeLlmLogPayload(
      payload,
      AI_USAGE_SNAPSHOT_MAX_STRING_CHARS,
    ) as { summary: string } & TruncationMeta;

    // Sous le plafond snapshot (600 ko) : aucune troncature malgré le dépassement du plafond par défaut.
    expect(result.summary).toHaveLength(originalLength);
    expect(result._truncation).toBeUndefined();

    const tooLong = { summary: 'd'.repeat(AI_USAGE_SNAPSHOT_MAX_STRING_CHARS + 1) };
    const truncated = serializeLlmLogPayload(
      tooLong,
      AI_USAGE_SNAPSHOT_MAX_STRING_CHARS,
    ) as { summary: string } & TruncationMeta;

    expect(truncated.summary).toHaveLength(AI_USAGE_SNAPSHOT_MAX_STRING_CHARS);
    expect(truncated._truncation?.truncated).toBe(true);
  });
});
