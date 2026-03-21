import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgContext, requireOrgId } from '@/lib/utils/auth';
import { hashJobDescription } from '@/lib/utils/job-description-hash';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId, userId } = await requireOrgContext();
    const { id } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('missions')
      .select('*, positionings(id, candidate_id, status, analysis, created_at, workflow_run_id, added_via, candidates(id, extracted_data, original_file_url, status, workflow_run_id))')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error) throw error;

    const { data: understoodRows } = await supabase
      .from('mission_skill_understood')
      .select('point_id')
      .eq('mission_id', id)
      .eq('user_id', userId);

    const understood_point_ids = (understoodRows ?? []).map((r) => r.point_id as string);

    const { data: globalSkillRows } = await supabase
      .from('recruiter_skill_understood')
      .select('skill_key')
      .eq('org_id', orgId)
      .eq('user_id', userId);

    const global_skill_keys_understood = (globalSkillRows ?? []).map((r) => r.skill_key as string);

    const job_analysis_stale =
      data.job_description &&
      data.job_analysis_input_hash &&
      hashJobDescription(data.job_description as string) !== data.job_analysis_input_hash;

    return NextResponse.json({
      ...data,
      understood_point_ids,
      global_skill_keys_understood,
      job_analysis_stale: !!job_analysis_stale,
    });
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
