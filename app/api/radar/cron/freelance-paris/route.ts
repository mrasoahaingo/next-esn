import { NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { requireOrgAdmin } from '@/lib/utils/auth';
import { freelanceParisWorkflow } from '@/app/api/radar/workflows/freelance-paris.workflow';

export async function POST() {
  try {
    await requireOrgAdmin();
    const run = await start(freelanceParisWorkflow, []);

    return NextResponse.json({
      started: 1,
      runs: [{ kind: 'freelance-paris', runId: run.runId }],
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/cron/freelance-paris:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
