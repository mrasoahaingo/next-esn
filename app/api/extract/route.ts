import { streamObject } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { extractionSchema, SYSTEM_PROMPT } from '@/lib/services/ai.service';
import { model, modelName } from '@/lib/ai';
import mammoth from 'mammoth';

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobDescription } = await req.json();
    const supabase = getSupabase();

    // 1. Get candidate
    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (fetchError || !candidate) throw new Error('Candidate not found');

    // 2. Update status
    await supabase.from('candidates').update({ status: 'extracting' }).eq('id', candidateId);

    // 3. Download file
    const fileName = candidate.original_file_url.split('/').pop()!;
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('cv-original')
      .download(fileName);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw downloadError;
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = fileName.split('.').pop()?.toLowerCase();
    const isPdf = ext === 'pdf';

    // 4. Build message content
    // PDF → send as file attachment (Gemini vision/file-input)
    // DOCX → extract text with mammoth (Gemini doesn't support DOCX files)
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

    // 5. Stream Object
    const result = streamObject({
      model,
      schema: extractionSchema,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
      onFinish: async ({ object }) => {
        if (object) {
          await supabase
            .from('candidates')
            .update({
              extracted_data: object,
              status: 'reviewing',
            })
            .eq('id', candidateId);

          await supabase.from('extraction_history').insert({
            candidate_id: candidateId,
            extraction_result: object,
            ai_model: modelName,
          });
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
