import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgContext } from '@/lib/utils/auth';

const RECRUITER_SKILLS_PREVIEW = 10;

export async function GET() {
  try {
    const { orgId, userId } = await requireOrgContext();
    const supabase = getSupabase();

    const [candidatesRes, positioningsRes, skillsCountRes, skillsItemsRes] = await Promise.all([
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
      supabase
        .from('recruiter_skill_understood')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('user_id', userId),
      supabase
        .from('recruiter_skill_understood')
        .select('skill_key, understood_at')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .order('understood_at', { ascending: false })
        .limit(RECRUITER_SKILLS_PREVIEW),
    ]);

    if (candidatesRes.error) throw candidatesRes.error;
    if (positioningsRes.error) throw positioningsRes.error;
    if (skillsCountRes.error) throw skillsCountRes.error;
    if (skillsItemsRes.error) throw skillsItemsRes.error;

    return NextResponse.json({
      candidates: candidatesRes.data ?? [],
      positionings: positioningsRes.data ?? [],
      recruiter_skills: {
        total: skillsCountRes.count ?? 0,
        items: skillsItemsRes.data ?? [],
      },
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
