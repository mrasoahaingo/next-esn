import type { LanguageModelUsage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AiOperation = 'extraction' | 'analysis' | 'generation';

export async function logAiUsage(
  supabase: SupabaseClient,
  params: {
    operation: AiOperation;
    candidateId?: string;
    positioningId?: string;
    missionId?: string;
    orgId?: string;
    aiModel: string;
    taskKey?: string;
    durationMs: number;
    usage: LanguageModelUsage;
  },
) {
  const { operation, candidateId, positioningId, missionId, orgId, aiModel, taskKey, durationMs, usage } = params;

  await supabase.from('ai_usage_log').insert({
    candidate_id: candidateId ?? null,
    positioning_id: positioningId ?? null,
    mission_id: missionId ?? null,
    org_id: orgId ?? null,
    operation,
    ai_model: aiModel,
    task_key: taskKey ?? null,
    duration_ms: durationMs,
    input_tokens: usage.inputTokens ?? null,
    output_tokens: usage.outputTokens ?? null,
    cache_read_tokens: usage.inputTokenDetails?.cacheReadTokens ?? null,
    cache_write_tokens: usage.inputTokenDetails?.cacheWriteTokens ?? null,
    reasoning_tokens: usage.outputTokenDetails?.reasoningTokens ?? null,
    raw_usage: usage,
  });
}
