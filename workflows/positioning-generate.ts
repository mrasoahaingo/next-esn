import { getWritable } from 'workflow';
import { streamObject, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { model, modelName } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import {
  positioningOutputSchema,
  POSITIONING_GENERATE_PROMPT,
  buildGenerateMessages,
} from '@/lib/services/positioning.service';

async function fetchAndGenerate(positioningId: string, answers: Record<string, string>) {
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
  if (!positioning.analysis) throw new Error('Analysis not done yet');

  const messages = buildGenerateMessages(
    candidate.extracted_data,
    positioning.job_description,
    positioning.analysis,
    answers ?? {},
  );

  const startTime = Date.now();
  const result = streamObject({
    model,
    schema: positioningOutputSchema,
    system: POSITIONING_GENERATE_PROMPT,
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

  return { object: lastPartial as { tailoredCv: unknown; email: unknown; candidateEmail: unknown }, usage, durationMs, candidateId: positioning.candidate_id };
}

async function saveGeneration(
  positioningId: string,
  result: { object: { tailoredCv: unknown; email: unknown; candidateEmail: unknown }; usage: LanguageModelUsage; durationMs: number; candidateId: string },
) {
  "use step";

  const supabase = getSupabase();

  await logAiUsage(supabase, {
    operation: 'generation',
    positioningId,
    candidateId: result.candidateId,
    aiModel: modelName,
    durationMs: result.durationMs,
    usage: result.usage,
  });

  if (result.object) {
    await supabase
      .from('positionings')
      .update({
        tailored_cv: result.object.tailoredCv,
        email: result.object.email,
        candidate_email: result.object.candidateEmail,
        status: 'generated',
        ai_generation_duration_ms: result.durationMs,
      })
      .eq('id', positioningId);
  }

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

export async function positioningGenerateWorkflow(positioningId: string, answers: Record<string, string>) {
  "use workflow";

  const result = await fetchAndGenerate(positioningId, answers);
  await saveGeneration(positioningId, result);
  return result.object;
}
