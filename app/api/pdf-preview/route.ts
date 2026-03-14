import { NextRequest, NextResponse } from 'next/server';
import { generateHimeoPdf } from '@/lib/services/pdf.service';

export async function POST(req: NextRequest) {
  try {
    const { data, templateConfig } = await req.json();
    const buffer = await generateHimeoPdf(data, templateConfig);

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: unknown) {
    console.error('PDF preview error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
