import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('missions')
      .select('*, positionings(id)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const missions = (data ?? []).map((m) => ({
      ...m,
      positioning_count: m.positionings?.length ?? 0,
      positionings: undefined,
    }));

    return NextResponse.json(missions);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const { title, company, jobDescription } = await req.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('missions')
      .insert({
        title,
        company: company || null,
        job_description: jobDescription,
        org_id: orgId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Create mission error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
