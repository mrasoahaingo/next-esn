import { NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { requireOrgAdmin } from '@/lib/utils/auth';
import { collectLinkedInAgentBrowserWorkflow } from '@/app/api/radar/workflows/collect-linkedin-agent-browser.workflow';

export async function POST() {
  try {
    const { orgId } = await requireOrgAdmin();
    const run = await start(collectLinkedInAgentBrowserWorkflow, [orgId]);

    return NextResponse.json({
      started: 1,
      runs: [{ kind: 'linkedin-agent-browser', runId: run.runId }],
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/cron/linkedin-agent-browser:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
