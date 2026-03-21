import { getWorld } from 'workflow/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    await requireOrgId();
    const { runId } = await params;
    const body = await request.json().catch(() => ({}));
    const { table, recordId, resetStatus } = body as {
      table?: string;
      recordId?: string;
      resetStatus?: string;
    };

    const world = getWorld();
    const run = await world.runs.get(runId, { resolveData: 'none' });
    await world.events.create(runId, {
      eventType: 'run_cancelled',
      specVersion: run.specVersion ?? 1,
    });

    const supabase = getSupabase();

    // Analyse fiche de poste (mission) : pas de colonne status
    if (table === 'missions' && recordId) {
      await supabase
        .from('missions')
        .update({ job_analysis_workflow_run_id: null })
        .eq('id', recordId);
    } else if (table && recordId && resetStatus) {
      await supabase
        .from(table)
        .update({ status: resetStatus, workflow_run_id: null })
        .eq('id', recordId);
    }

    return NextResponse.json({ status: 'cancelled' });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Workflow cancel error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
