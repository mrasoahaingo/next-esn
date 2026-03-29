import { NextResponse } from 'next/server';
import { start } from 'workflow/api';
import { listRadarOrgIds } from '@/lib/radar/queries';
import { scoreProspectsWorkflow } from '@/app/api/radar/workflows/score-prospects.workflow';
import { requireOrgAdmin } from '@/lib/utils/auth';

async function startScoreRun(orgId: string) {
  return start(scoreProspectsWorkflow, [orgId]).then((run) => ({
    kind: 'scoring',
    runId: run.runId,
  }));
}

export async function GET() {
  try {
    const orgIds = await listRadarOrgIds();
    const runs = await Promise.all(orgIds.map((orgId) => startScoreRun(orgId)));
    return NextResponse.json({ started: runs.length, orgCount: orgIds.length, runs });
  } catch (error) {
    console.error('GET /api/radar/cron/compute-scores:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { orgId } = await requireOrgAdmin();
    const run = await startScoreRun(orgId);
    return NextResponse.json({
      started: 1,
      orgId,
      runs: [run],
      mode: 'manual',
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/cron/compute-scores:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
