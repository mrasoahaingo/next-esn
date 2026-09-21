import { getRun } from 'workflow/api';
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgId } from '@/lib/utils/auth';
import { getSupabase } from '@/lib/utils/supabase';
import { reconcileWorkflowRunById } from '@/lib/services/workflow-reconcile';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    await requireOrgId();
    const { runId } = await params;
    const { searchParams } = new URL(request.url);

    const run = getRun(runId);

    if (!(await run.exists)) {
      // Run perdu : la ligne peut rester bloquée en statut actif — on la réconcilie avant de répondre.
      await reconcileWorkflowRunById(getSupabase(), runId);
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }

    const status = await run.status;

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      const decision = await reconcileWorkflowRunById(getSupabase(), runId);
      return NextResponse.json({ status, reconciled: decision.action });
    }

    const startIndexParam = searchParams.get('startIndex');
    const startIndex = startIndexParam ? parseInt(startIndexParam, 10) : undefined;

    const stream = run.getReadable({ startIndex });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'x-workflow-run-id': runId,
      },
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Workflow stream error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
