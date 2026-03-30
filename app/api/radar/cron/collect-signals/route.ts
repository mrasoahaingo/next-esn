import { NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { listRadarOrgIds } from '@/lib/radar/queries';
import { collectPressWorkflow } from '@/app/api/radar/workflows/collect-press.workflow';
import { collectLinkedInWorkflow } from '@/app/api/radar/workflows/collect-linkedin.workflow';
import { requireOrgAdmin } from '@/lib/utils/auth';

async function startCollectRuns(orgId: string) {
  return Promise.all([
    start(collectPressWorkflow, [orgId]).then((run) => ({ kind: 'press', runId: run.runId })),
    start(collectLinkedInWorkflow, [orgId]).then((run) => ({ kind: 'linkedin', runId: run.runId })),
  ]);
}

export async function GET() {
  try {
    const orgIds = await listRadarOrgIds();
    const runs = [];

    for (const orgId of orgIds) {
      runs.push(await startCollectRuns(orgId));
    }

    return NextResponse.json({
      started: runs.flat().length,
      orgCount: orgIds.length,
      runs: runs.flat(),
    });
  } catch (error) {
    console.error('GET /api/radar/cron/collect-signals:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { orgId } = await requireOrgAdmin();
    const runs = await startCollectRuns(orgId);

    return NextResponse.json({
      started: runs.length,
      orgId,
      runs,
      mode: 'manual',
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/cron/collect-signals:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
