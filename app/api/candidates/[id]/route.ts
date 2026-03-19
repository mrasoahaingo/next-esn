import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

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

    if (error) throw error;
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

    await supabase.from('extraction_history').delete().eq('candidate_id', id);
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
    const body = await req.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('candidates')
      .update(body)
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
