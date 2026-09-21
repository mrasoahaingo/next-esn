import { start } from 'workflow/api';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { logSupabaseWriteError } from '@/lib/utils/supabase-write-error';
import { extractCvWorkflow } from '@/workflows/extract-cv';

export async function POST(req: NextRequest) {
  try {
    await requireOrgId();
    const { candidateId, jobDescription } = await req.json();
    const supabase = getSupabase();

    const run = await start(extractCvWorkflow, [candidateId, jobDescription]);

    // Le run est déjà démarré : on ne lève pas (le stream est la réponse attendue), mais si
    // cette écriture échoue la ligne reste sans `workflow_run_id` — donc invisible pour la
    // réconciliation des runs zombies. Le log est indispensable au diagnostic.
    const { error: claimError } = await supabase
      .from('candidates')
      .update({ workflow_run_id: run.runId, status: 'extracting', workflow_started_at: new Date().toISOString() })
      .eq('id', candidateId);

    if (claimError) {
      logSupabaseWriteError({
        table: 'candidates',
        recordId: candidateId,
        operation: 'extract.claimRun',
        supabaseError: claimError,
      });
    }

    return new Response(run.readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'x-workflow-run-id': run.runId,
      },
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Extraction error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
