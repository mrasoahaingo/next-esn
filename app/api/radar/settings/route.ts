import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin, requireOrgId } from '@/lib/utils/auth';
import { getRadarSettings, radarSettingsPatchSchema, upsertRadarSettings } from '@/lib/radar/settings';

// Strip internal fields (linkedinContextId) before returning settings to clients
function toPublicSettings({ linkedinContextId: _omit, ...rest }: Awaited<ReturnType<typeof getRadarSettings>>) {
  return rest;
}

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const settings = await getRadarSettings(orgId);
    return NextResponse.json(toPublicSettings(settings));
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/radar/settings:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await requireOrgAdmin();
    const parsed = radarSettingsPatchSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const settings = await upsertRadarSettings(orgId, parsed.data);
    return NextResponse.json(toPublicSettings(settings));
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('PATCH /api/radar/settings:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
