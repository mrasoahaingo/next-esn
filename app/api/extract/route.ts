import { start } from 'workflow/api';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { extractCvWorkflow } from '@/workflows/extract-cv';

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobDescription } = await req.json();
    const supabase = getSupabase();

    const run = await start(extractCvWorkflow, [candidateId, jobDescription]);

    await supabase
      .from('candidates')
      .update({ workflow_run_id: run.runId, status: 'extracting' })
      .eq('id', candidateId);

    return new Response(run.readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'x-workflow-run-id': run.runId,
      },
    });
  } catch (error: unknown) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
