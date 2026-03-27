import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id: positioningId } = await params;
    const supabase = getSupabase();

    const { data: positioning, error: posErr } = await supabase
      .from('positionings')
      .select('id')
      .eq('id', positioningId)
      .eq('org_id', orgId)
      .single();

    if (posErr || !positioning) {
      return NextResponse.json({ error: 'Positioning not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('positioning_analysis_history')
      .select('id, created_at, analysis, answers')
      .eq('positioning_id', positioningId)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Get positioning analysis history error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
