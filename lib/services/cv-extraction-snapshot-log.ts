import type { LanguageModelUsage } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  AI_USAGE_SNAPSHOT_MAX_STRING_CHARS,
  logAiUsage,
} from '@/lib/services/ai-usage.service';
import { TASK_KEY } from '@/lib/llm/task-keys';
import {
  CV_EXTRACTION_SNAPSHOT_KIND,
  type CvExtractionModelsSnapshot,
  type CvExtractionSnapshotReason,
} from '@/lib/types/cv-extraction-snapshot-payload';

const ZERO_USAGE = { inputTokens: 0, outputTokens: 0 } as LanguageModelUsage;

/**
 * Snapshot d’extraction CV dans `ai_usage_log` (pas un appel LLM : `workflow/no-llm`).
 */
export async function logCvExtractionSnapshot(
  supabase: SupabaseClient,
  params: {
    candidateId: string;
    orgId: string;
    reason: CvExtractionSnapshotReason;
    extractedData: unknown;
    aiModels: CvExtractionModelsSnapshot;
    durationMs: number;
    workflowRunId?: string | null;
  },
): Promise<void> {
  const outputPayload = {
    kind: CV_EXTRACTION_SNAPSHOT_KIND,
    version: 1 as const,
    reason: params.reason,
    extracted_data: params.extractedData,
    ai_models: params.aiModels,
    duration_ms: params.durationMs,
  };

  await logAiUsage(supabase, {
    operation: 'extraction',
    candidateId: params.candidateId,
    orgId: params.orgId,
    aiModel: 'workflow/no-llm',
    taskKey: TASK_KEY.CV_EXTRACTION_SNAPSHOT,
    durationMs: 0,
    usage: ZERO_USAGE,
    outputPayload,
    outputPayloadMaxChars: AI_USAGE_SNAPSHOT_MAX_STRING_CHARS,
    workflowRunId: params.workflowRunId ?? null,
  });
}
