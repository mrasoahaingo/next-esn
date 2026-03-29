import { NextRequest, NextResponse } from 'next/server';
import { listProspects, recordProspectAction } from '@/lib/radar/queries';
import { ProspectActionInputSchema, ProspectFiltersSchema } from '@/lib/radar/schemas';
import { requireOrgContext, requireOrgId } from '@/lib/utils/auth';

export async function GET(request: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const filters = ProspectFiltersSchema.parse({
      sector: request.nextUrl.searchParams.get('sector') ?? undefined,
      heat: request.nextUrl.searchParams.get('heat') ?? undefined,
      city: request.nextUrl.searchParams.get('city') ?? undefined,
      technology: request.nextUrl.searchParams.get('technology') ?? undefined,
    });

    const prospects = await listProspects(orgId, filters);
    return NextResponse.json(prospects);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/radar/prospects:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId, userId } = await requireOrgContext();
    const body = ProspectActionInputSchema.parse(await request.json());
    const action = await recordProspectAction(orgId, userId, body);
    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/prospects:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
