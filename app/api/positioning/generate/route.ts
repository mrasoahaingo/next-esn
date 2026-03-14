import { streamObject } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { model } from '@/lib/ai';
import {
  positioningOutputSchema,
  POSITIONING_GENERATE_PROMPT,
  buildGenerateMessages,
} from '@/lib/services/positioning.service';

export async function POST(req: NextRequest) {
  try {
    const { positioningId, answers } = await req.json();
    if (!positioningId) throw new Error('positioningId is required');

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

    await supabase
      .from('positionings')
      .update({ answers, status: 'generating' })
      .eq('id', positioningId);

    const messages = buildGenerateMessages(
      candidate.extracted_data,
      positioning.job_description,
      positioning.analysis,
      answers ?? {},
    );

    const result = streamObject({
      model,
      schema: positioningOutputSchema,
      system: POSITIONING_GENERATE_PROMPT,
      messages,
      onFinish: async ({ object }) => {
        if (object) {
          await supabase
            .from('positionings')
            .update({
              tailored_cv: object.tailoredCv,
              email: object.email,
              candidate_email: object.candidateEmail,
              status: 'generated',
            })
            .eq('id', positioningId);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error('Positioning generate error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
