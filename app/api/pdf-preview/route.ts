import { NextRequest, NextResponse } from 'next/server';
import { generateCvPdf } from '@/lib/services/pdf.service';
import { requireOrgId } from '@/lib/utils/auth';
import { getTemplateConfig, mergeTemplateWithDefaults } from '@/lib/utils/template';

function getPdfPageCount(buffer: Uint8Array): number {
  const text = Buffer.from(buffer).toString('latin1');
  const match = text.match(/\/Count (\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

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

    const buffer = await generateCvPdf(data, resolvedTemplate);
    const pageCount = getPdfPageCount(buffer);

    return new Response(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
        'X-Pdf-Page-Count': String(pageCount),
      },
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('PDF preview error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
