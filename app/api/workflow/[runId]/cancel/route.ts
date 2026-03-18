import { getWorld } from 'workflow/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
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

    // Reset DB status if provided
    if (table && recordId && resetStatus) {
      const supabase = getSupabase();
      await supabase
        .from(table)
        .update({ status: resetStatus, workflow_run_id: null })
        .eq('id', recordId);
    }

    return NextResponse.json({ status: 'cancelled' });
  } catch (error: unknown) {
    console.error('Workflow cancel error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
