import type { LanguageModelUsage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AI_USAGE_SNAPSHOT_MAX_STRING_CHARS,
  logAiUsage,
} from '@/lib/services/ai-usage.service';
import { TASK_KEY } from '@/lib/llm/task-keys';
import {
  POSITIONING_ANALYSIS_SNAPSHOT_KIND,
  type PositioningAnalysisSnapshotReason,
} from '@/lib/types/positioning-analysis-snapshot-payload';

/**
 * Enregistre un snapshot d’analyse dans `ai_usage_log` (pas un appel LLM : `workflow/no-llm`, tokens 0).
 * L’historique produit et l’admin s’appuient sur `output_payload` structuré.
 */
export async function logPositioningAnalysisSnapshot(
  supabase: SupabaseClient,
  params: {
    positioningId: string;
    candidateId: string;
    orgId: string;
    reason: PositioningAnalysisSnapshotReason;
    analysis: unknown;
    answers: unknown;
    /** JSON tel que stocké en `positionings.ai_analysis_models` (snapshot brut). */
    aiAnalysisModels: unknown;
    durationMs?: number;
    workflowRunId?: string | null;
  },
): Promise<void> {
  const outputPayload = {
    kind: POSITIONING_ANALYSIS_SNAPSHOT_KIND,
    version: 1 as const,
    reason: params.reason,
    analysis: params.analysis,
    answers: params.answers,
    ai_analysis_models: params.aiAnalysisModels ?? null,
    ...(params.durationMs != null ? { duration_ms: params.durationMs } : {}),
  };

  await logAiUsage(supabase, {
    operation: 'analysis',
    positioningId: params.positioningId,
    candidateId: params.candidateId,
    orgId: params.orgId,
    aiModel: 'workflow/no-llm',
    taskKey: TASK_KEY.POSITIONING_ANALYSIS_SNAPSHOT,
    durationMs: params.durationMs ?? 0,
    usage: { inputTokens: 0, outputTokens: 0 } as LanguageModelUsage,
    outputPayload,
    outputPayloadMaxChars: AI_USAGE_SNAPSHOT_MAX_STRING_CHARS,
    workflowRunId: params.workflowRunId ?? null,
  });
}
