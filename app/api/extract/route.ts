import { streamObject } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { parseCVFile } from '@/lib/utils/parser';
import { extractionSchema, SYSTEM_PROMPT } from '@/lib/services/ai.service';
import { anthropic } from '@ai-sdk/anthropic';

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

    if (downloadError) throw downloadError;

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Parse
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimetype = ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const cvText = await parseCVFile(buffer, mimetype);

    // 5. Stream Object
    const result = streamObject({
      model: anthropic('claude-3-5-sonnet-20240620'),
      schema: extractionSchema,
      system: SYSTEM_PROMPT,
      prompt: `Voici le texte extrait du CV :\n\n${cvText}${jobDescription ? `\n\nVoici la fiche de poste pour le matching :\n\n${jobDescription}` : ''}`,
      onFinish: async ({ object }) => {
        if (object) {
          // Update DB with final result
          await supabase
            .from('candidates')
            .update({
              extracted_data: object,
              status: 'reviewing',
            })
            .eq('id', candidateId);

          // History
          await supabase.from('extraction_history').insert({
            candidate_id: candidateId,
            extraction_result: object,
            ai_model: 'claude-3-5-sonnet',
          });
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
