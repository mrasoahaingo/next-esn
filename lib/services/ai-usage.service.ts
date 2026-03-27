import type { LanguageModelUsage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  LLM_LOG_MAX_STRING_CHARS,
  serializeLlmLogPayload,
} from '@/lib/utils/llm-log-payload';

export type AiOperation = 'extraction' | 'analysis' | 'generation';

/** Snapshots d’analyse (payload riche) : plafond plus haut que pour une sortie LLM brute. */
export const AI_USAGE_SNAPSHOT_MAX_STRING_CHARS = 600 * 1024;

/** État enregistré avec la ligne de log (corrélation workflow / échecs). */
export type AiUsageCallStatus = 'completed' | 'failed' | 'cancelled';

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
    /** Objet sérialisable (tronqué avant insert). */
    inputPayload?: unknown;
    outputPayload?: unknown;
    workflowRunId?: string | null;
    /** completed = appel modèle terminé normalement ; failed / cancelled pour diagnostic. */
    callStatus?: AiUsageCallStatus;
    /** Sous-flux parallèle (ex. executive, keyPoints pour l’analyse fiche mission). */
    branch?: string | null;
    /**
     * Troncature des chaînes dans `output_payload` (défaut : `LLM_LOG_MAX_STRING_CHARS`).
     * Les snapshots d’analyse utilisent `AI_USAGE_SNAPSHOT_MAX_STRING_CHARS`.
     */
    outputPayloadMaxChars?: number;
  },
) {
  const {
    operation,
    candidateId,
    positioningId,
    missionId,
    orgId,
    aiModel,
    taskKey,
    durationMs,
    usage,
    inputPayload,
    outputPayload,
    workflowRunId,
    callStatus = 'completed',
    branch = null,
    outputPayloadMaxChars = LLM_LOG_MAX_STRING_CHARS,
  } = params;

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
    input_payload: inputPayload !== undefined ? serializeLlmLogPayload(inputPayload) : null,
    output_payload:
      outputPayload !== undefined
        ? serializeLlmLogPayload(outputPayload, outputPayloadMaxChars)
        : null,
    workflow_run_id: workflowRunId ?? null,
    call_status: callStatus,
    branch,
  });
}
