import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/utils/auth';

export async function POST() {
  try {
    const { orgId } = await requireOrgAdmin();

    revalidateTag(`radar:prospects:${orgId}`, 'max');
    revalidatePath('/radar');
    revalidatePath('/radar/settings');

    return NextResponse.json({ ok: true, orgId });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/refresh:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
