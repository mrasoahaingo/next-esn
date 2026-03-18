import { start } from 'workflow/api';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { positioningAnalyzeWorkflow } from '@/workflows/positioning-analyze';

export async function POST(req: NextRequest) {
  try {
    const { positioningId } = await req.json();
    if (!positioningId) throw new Error('positioningId is required');

    const supabase = getSupabase();

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
