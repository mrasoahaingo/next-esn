import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { respondMissionJobAnalyzePost } from '@/lib/services/job-posting-analyze-trigger';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id: missionId } = await params;
    const supabase = getSupabase();

    const { data: mission, error } = await supabase
      .from('missions')
      .select('id')
      .eq('id', missionId)
      .eq('org_id', orgId)
      .single();

    if (error || !mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 });
    }

    return await respondMissionJobAnalyzePost(supabase, missionId);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Mission job analyze error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
