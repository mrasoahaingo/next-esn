import { getWritable } from 'workflow';
import { streamObject, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { model, modelName } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import {
  positioningAnalysisSchema,
  POSITIONING_ANALYSIS_PROMPT,
  buildAnalysisMessages,
} from '@/lib/services/positioning.service';

async function fetchAndAnalyze(positioningId: string) {
  "use step";

  const supabase = getSupabase();

  const { data: positioning, error: fetchError } = await supabase
    .from('positionings')
    .select('*, candidates(*)')
    .eq('id', positioningId)
    .single();

  if (fetchError || !positioning) throw new Error('Positioning not found');

  const candidate = positioning.candidates;
  if (!candidate?.extracted_data) throw new Error('CV not extracted yet');

  const messages = buildAnalysisMessages(
    candidate.extracted_data,
    positioning.job_description,
  );

  const startTime = Date.now();
  const result = streamObject({
    model,
    schema: positioningAnalysisSchema,
    system: POSITIONING_ANALYSIS_PROMPT,
    messages,
  });

  const encoder = new TextEncoder();
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  let chunkIndex = 0;
  let lastPartial: unknown = null;

  try {
    for await (const partial of result.partialObjectStream) {
      lastPartial = partial;
      await writer.write(encoder.encode(JSON.stringify({ index: chunkIndex++, data: partial }) + '\n'));
    }
  } finally {
    writer.releaseLock();
  }

  const usage = await result.usage;
  const durationMs = Date.now() - startTime;

  return { object: lastPartial, usage, durationMs, candidateId: positioning.candidate_id, orgId: positioning.org_id as string | null };
}

async function saveAnalysis(
  positioningId: string,
  result: { object: unknown; usage: LanguageModelUsage; durationMs: number; candidateId: string; orgId: string | null },
) {
  "use step";

  const supabase = getSupabase();

  await logAiUsage(supabase, {
    operation: 'analysis',
    positioningId,
    candidateId: result.candidateId,
    orgId: result.orgId ?? undefined,
    aiModel: modelName,
    durationMs: result.durationMs,
    usage: result.usage,
  });

  if (result.object) {
    await supabase
      .from('positionings')
      .update({
        analysis: result.object,
        status: 'analyzed',
        ai_analysis_duration_ms: result.durationMs,
      })
      .eq('id', positioningId);
  }

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

export async function positioningAnalyzeWorkflow(positioningId: string) {
  "use workflow";

  const result = await fetchAndAnalyze(positioningId);
  await saveAnalysis(positioningId, result);
  return result.object;
}
