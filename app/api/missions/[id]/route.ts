import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('missions')
      .select('*, positionings(id, candidate_id, status, analysis, created_at, workflow_run_id, added_via, candidates(id, extracted_data, original_file_url, status, workflow_run_id))')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
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
    const body = await req.json();
    const supabase = getSupabase();

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.company !== undefined) updates.company = body.company;
    if (body.jobDescription !== undefined) updates.job_description = body.jobDescription;

    const { data, error } = await supabase
      .from('missions')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
