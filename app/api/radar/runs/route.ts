import { getRun } from 'workflow/api';
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    await requireOrgAdmin();
    const runIds = request.nextUrl.searchParams.getAll('runId').filter(Boolean);

    if (runIds.length === 0) {
      return NextResponse.json({ runs: [] });
    }

    const runs = await Promise.all(
      runIds.map(async (runId) => {
        const run = getRun(runId);
        const exists = await run.exists;

        if (!exists) {
          return { runId, status: 'not_found' as const };
        }

        const status = await run.status;

        return {
          runId,
          status,
          result:
            status === 'completed'
              ? await run.returnValue.catch(() => null)
              : null,
        };
      }),
    );

    return NextResponse.json({ runs });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/radar/runs:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
