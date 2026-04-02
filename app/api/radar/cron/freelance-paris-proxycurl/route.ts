import { NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { requireOrgAdmin } from '@/lib/utils/auth';
import { freelanceParisProxycurlWorkflow } from '@/app/api/radar/workflows/freelance-paris-proxycurl.workflow';

export async function POST() {
  try {
    await requireOrgAdmin();
    const run = await start(freelanceParisProxycurlWorkflow, []);

    return NextResponse.json({
      started: 1,
      runs: [{ kind: 'freelance-paris-proxycurl', runId: run.runId }],
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/cron/freelance-paris-proxycurl:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
