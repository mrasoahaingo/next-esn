import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

const updateCandidateSchema = z.object({
  extracted_data: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['uploaded', 'extracting', 'reviewing', 'ready', 'generated']).optional(),
  template_id: z.string().uuid().nullable().optional(),
}).strict();

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireOrgId();
    const params = await props.params;
    const { id } = params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireOrgId();
    const params = await props.params;
    const { id } = params;
    const supabase = getSupabase();

    await supabase.from('positionings').delete().eq('candidate_id', id);

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireOrgId();
    const params = await props.params;
    const { id } = params;
    const parsed = updateCandidateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('candidates')
      .update(parsed.data)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
