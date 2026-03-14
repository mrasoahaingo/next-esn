import { streamObject } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { model } from '@/lib/ai';
import {
  positioningAnalysisSchema,
  POSITIONING_ANALYSIS_PROMPT,
  buildAnalysisMessages,
} from '@/lib/services/positioning.service';

export async function POST(req: NextRequest) {
  try {
    const { positioningId } = await req.json();
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

    await supabase
      .from('positionings')
      .update({ status: 'analyzing' })
      .eq('id', positioningId);

    const messages = buildAnalysisMessages(
      candidate.extracted_data,
      positioning.job_description,
    );

    const result = streamObject({
      model,
      schema: positioningAnalysisSchema,
      system: POSITIONING_ANALYSIS_PROMPT,
      messages,
      onFinish: async ({ object }) => {
        if (object) {
          await supabase
            .from('positionings')
            .update({ analysis: object, status: 'analyzed' })
            .eq('id', positioningId);
        }
      },
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    console.error('Positioning analysis error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
