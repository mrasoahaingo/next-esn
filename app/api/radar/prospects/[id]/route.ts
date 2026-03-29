import { NextResponse } from 'next/server';
import { getProspectDetail } from '@/lib/radar/queries';
import { requireOrgId } from '@/lib/utils/auth';

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id } = await context.params;
    const detail = await getProspectDetail(orgId, id);

    if (!detail) {
      return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/radar/prospects/[id]:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
