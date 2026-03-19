import { NextRequest, NextResponse } from 'next/server';
import { generateHimeoPdf } from '@/lib/services/pdf.service';
import { requireOrgId } from '@/lib/utils/auth';

export async function POST(req: NextRequest) {
  try {
    await requireOrgId();
    const { data, templateConfig } = await req.json();
    const buffer = await generateHimeoPdf(data, templateConfig);

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
