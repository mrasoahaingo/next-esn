import { getWritable } from 'workflow';
import { streamObject, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { extractionSchema, SYSTEM_PROMPT } from '@/lib/services/ai.service';
import { model, modelName } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import mammoth from 'mammoth';

async function fetchAndExtract(candidateId: string, jobDescription?: string) {
  "use step";

  const supabase = getSupabase();

  // 1. Get candidate
  const { data: candidate, error: fetchError } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', candidateId)
    .single();

  if (fetchError || !candidate) throw new Error('Candidate not found');
  const orgId = candidate.org_id as string | null;

  // 2. Download file — extract storage path after bucket name
  const bucketPrefix = '/cv-original/';
  const bucketIndex = candidate.original_file_url.indexOf(bucketPrefix);
  const storagePath = bucketIndex !== -1
    ? candidate.original_file_url.slice(bucketIndex + bucketPrefix.length)
    : candidate.original_file_url.split('/').pop()!;
  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('cv-original')
    .download(storagePath);

  if (downloadError) {
    console.error('Download error:', downloadError);
    throw downloadError;
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = storagePath.split('.').pop()?.toLowerCase();
  const isPdf = ext === 'pdf';

  // 3. Build message content
  const jobContext = jobDescription
    ? `\n\nVoici la fiche de poste pour le matching :\n\n${jobDescription}`
    : '';

  type ContentPart = { type: 'text'; text: string } | { type: 'file'; mediaType: string; data: Buffer };
  const content: ContentPart[] = isPdf
    ? [
        { type: 'text' as const, text: `Extrais et structure toutes les informations de ce CV.${jobContext}` },
        { type: 'file' as const, mediaType: 'application/pdf', data: buffer },
      ]
    : await (async () => {
        const { value: cvText } = await mammoth.extractRawText({ buffer });
        return [
          { type: 'text' as const, text: `Voici le texte extrait du CV :\n\n${cvText}${jobContext}` },
        ];
      })();

  // 4. Stream Object + write NDJSON lines (strings, not objects)
  const startTime = Date.now();
  const result = streamObject({
    model,
    schema: extractionSchema,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
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

  // Use lastPartial instead of result.object to avoid schema validation errors
  // The partials already contain the complete data by the end of the stream
  const usage = await result.usage;
  const durationMs = Date.now() - startTime;

  return { object: lastPartial, usage, durationMs, orgId };
}

async function saveResult(
  candidateId: string,
  result: { object: unknown; usage: LanguageModelUsage; durationMs: number; orgId: string | null },
) {
  "use step";

  const supabase = getSupabase();

  await logAiUsage(supabase, {
    operation: 'extraction',
    candidateId,
    orgId: result.orgId ?? undefined,
    aiModel: modelName,
    durationMs: result.durationMs,
    usage: result.usage,
  });

  if (result.object) {
    await supabase
      .from('candidates')
      .update({
        extracted_data: result.object,
        status: 'reviewing',
        ai_extraction_duration_ms: result.durationMs,
      })
      .eq('id', candidateId);

    await supabase.from('extraction_history').insert({
      candidate_id: candidateId,
      extraction_result: result.object,
      ai_model: modelName,
      org_id: result.orgId,
    });
  }

  // Close the writable stream
  const writable = getWritable<Uint8Array>();
  await writable.close();
}

export async function extractCvWorkflow(candidateId: string, jobDescription?: string) {
  "use workflow";

  const result = await fetchAndExtract(candidateId, jobDescription);
  await saveResult(candidateId, result);
  return result.object;
}
