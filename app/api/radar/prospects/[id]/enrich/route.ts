import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireOrgContext } from '@/lib/utils/auth';
import { enrichProspectLinkedIn } from '@/lib/radar/queries';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId } = await requireOrgContext();
    const { id: companyId } = await params;

    const count = await enrichProspectLinkedIn(orgId, companyId);
    revalidateTag(`radar:prospect:${companyId}`, 'max');

    return NextResponse.json({ contacts: count });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/prospects/[id]/enrich:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
