import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

const updatePositioningSchema = z.object({
  job_description: z.string().max(50000).optional(),
  status: z.enum(['draft', 'analyzing', 'analyzed', 'generating', 'generated', 'exported']).optional(),
  analysis: z.record(z.string(), z.unknown()).nullable().optional(),
  tailored_cv: z.record(z.string(), z.unknown()).nullable().optional(),
  cover_letter: z.string().nullable().optional(),
  email_body: z.string().nullable().optional(),
}).passthrough();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('positionings')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Positioning not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Get positioning error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id } = await params;
    const parsed = updatePositioningSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('positionings')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Update positioning error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
