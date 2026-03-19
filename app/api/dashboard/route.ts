import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const supabase = getSupabase();

    const [candidatesRes, positioningsRes] = await Promise.all([
      supabase
        .from('candidates')
        .select('id, status, extracted_data, created_at, ai_extraction_duration_ms, user_review_time_seconds')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
      supabase
        .from('positionings')
        .select('id, candidate_id, job_description, status, analysis, created_at, ai_analysis_duration_ms, ai_generation_duration_ms, user_time_seconds, candidates(id, extracted_data)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
    ]);

    if (candidatesRes.error) throw candidatesRes.error;
    if (positioningsRes.error) throw positioningsRes.error;

    return NextResponse.json({
      candidates: candidatesRes.data ?? [],
      positionings: positioningsRes.data ?? [],
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
