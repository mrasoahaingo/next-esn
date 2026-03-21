import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgContext } from '@/lib/utils/auth';

/** Liste des skill_key assimilés par le recruteur courant (toutes missions). Utile pour stats / autres écrans. */
export async function GET() {
  try {
    const { orgId, userId } = await requireOrgContext();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('recruiter_skill_understood')
      .select('skill_key, understood_at')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .order('understood_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      skills: (data ?? []).map((r) => ({
        skill_key: r.skill_key as string,
        understood_at: r.understood_at as string,
      })),
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
