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
export type AiUsageCallStatus = 'in_progress' | 'completed' | 'failed' | 'cancelled';

/**
 * Insère une ligne `in_progress` dès le début de l'appel LLM.
 * Retourne l'`id` à passer à `updateAiUsageEnd` une fois l'appel terminé.
 */
export async function insertAiUsageStart(
  supabase: SupabaseClient,
  params: {
    operation: AiOperation;
    candidateId?: string;
    positioningId?: string;
    missionId?: string;
    orgId?: string;
    aiModel: string;
    taskKey?: string;
    workflowRunId?: string | null;
    branch?: string | null;
    inputPayload?: unknown;
  },
): Promise<string | null> {
  const { data } = await supabase
    .from('ai_usage_log')
    .insert({
      candidate_id: params.candidateId ?? null,
      positioning_id: params.positioningId ?? null,
      mission_id: params.missionId ?? null,
      org_id: params.orgId ?? null,
      operation: params.operation,
      ai_model: params.aiModel,
      task_key: params.taskKey ?? null,
      duration_ms: 0,
      workflow_run_id: params.workflowRunId ?? null,
      call_status: 'in_progress',
      branch: params.branch ?? null,
      input_payload:
        params.inputPayload !== undefined
          ? serializeLlmLogPayload(params.inputPayload)
          : null,
    })
    .select('id')
    .single();
  return data?.id ?? null;
}

/**
 * Met à jour la ligne créée par `insertAiUsageStart` avec les données finales.
 * Silencieux si `logId` est null (insert initial échoué).
 */
export async function updateAiUsageEnd(
  supabase: SupabaseClient,
  logId: string | null,
  params: {
    durationMs: number;
    usage?: LanguageModelUsage;
    outputPayload?: unknown;
    callStatus?: AiUsageCallStatus;
    outputPayloadMaxChars?: number;
  },
): Promise<void> {
  if (!logId) return;
  const {
    durationMs,
    usage,
    outputPayload,
    callStatus = 'completed',
    outputPayloadMaxChars = LLM_LOG_MAX_STRING_CHARS,
  } = params;

  await supabase
    .from('ai_usage_log')
    .update({
      duration_ms: durationMs,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
      cache_read_tokens: usage?.inputTokenDetails?.cacheReadTokens ?? null,
      cache_write_tokens: usage?.inputTokenDetails?.cacheWriteTokens ?? null,
      reasoning_tokens: usage?.outputTokenDetails?.reasoningTokens ?? null,
      raw_usage: usage ?? null,
      output_payload:
        outputPayload !== undefined
          ? serializeLlmLogPayload(outputPayload, outputPayloadMaxChars)
          : null,
      call_status: callStatus,
    })
    .eq('id', logId);
}

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
