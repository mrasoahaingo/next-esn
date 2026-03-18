import { start } from 'workflow/api';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { positioningAnalyzeWorkflow } from '@/workflows/positioning-analyze';

export async function POST(req: NextRequest) {
  try {
    const { positioningId } = await req.json();
    if (!positioningId) throw new Error('positioningId is required');

    const supabase = getSupabase();
    const { data: positioning, error: positioningError } = await supabase
      .from('positionings')
      .select('id, candidate_id, candidates(status, extracted_data)')
      .eq('id', positioningId)
      .single();

    if (positioningError || !positioning) {
      throw new Error('Positioning not found');
    }

    const candidate = positioning.candidates as { status?: string; extracted_data?: Record<string, unknown> | null } | null;
    const hasExtractedData = !!candidate?.extracted_data && Object.keys(candidate.extracted_data).length > 0;
    const canStartAnalysis = !!candidate?.status && ['reviewing', 'ready', 'generated'].includes(candidate.status);

    if (!canStartAnalysis || !hasExtractedData) {
      return NextResponse.json(
        { error: "Le CV est en cours d'extraction. L'analyse du positionnement est en attente." },
        { status: 409 },
      );
    }

    const run = await start(positioningAnalyzeWorkflow, [positioningId]);

    await supabase
      .from('positionings')
      .update({ workflow_run_id: run.runId, status: 'analyzing' })
      .eq('id', positioningId);

    return new Response(run.readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'x-workflow-run-id': run.runId,
      },
    });
  } catch (error: unknown) {
    console.error('Positioning analysis error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
