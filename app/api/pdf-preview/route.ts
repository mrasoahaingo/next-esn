import { NextRequest, NextResponse } from 'next/server';
import { generateHimeoPdf } from '@/lib/services/pdf.service';
import { requireOrgId } from '@/lib/utils/auth';
import { getTemplateConfig, mergeTemplateWithDefaults } from '@/lib/utils/template';

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const body = await req.json();
    const { data, templateConfig } = body;

    let resolvedTemplate = mergeTemplateWithDefaults(templateConfig);
    if (Object.prototype.hasOwnProperty.call(body, 'templateId')) {
      const fromDb = await getTemplateConfig(orgId, body.templateId ?? undefined);
      resolvedTemplate = mergeTemplateWithDefaults(fromDb);
    }

    const buffer = await generateHimeoPdf(data, resolvedTemplate, orgId);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('PDF preview error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
