import { NextRequest, NextResponse } from 'next/server';
import { requireOrgId } from '@/lib/utils/auth';
import { getTemplateConfig, mergeTemplateWithDefaults } from '@/lib/utils/template';

/** Merged template + organization_settings defaults for PDF preview and CV flows. */
export async function GET(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const templateId = req.nextUrl.searchParams.get('templateId');
    const partial = await getTemplateConfig(orgId, templateId || undefined);
    const config = mergeTemplateWithDefaults(partial);
    return NextResponse.json({ config });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
