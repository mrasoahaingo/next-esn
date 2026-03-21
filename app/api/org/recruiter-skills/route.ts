import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgAdmin } from '@/lib/utils/auth';

/** Agrégats des technos assimilées par l’équipe (org). Admin org uniquement. */
export async function GET() {
  try {
    const { orgId } = await requireOrgAdmin();
    const supabase = getSupabase();

    const { data: rows, error } = await supabase
      .from('recruiter_skill_understood')
      .select('skill_key, user_id')
      .eq('org_id', orgId);

    if (error) throw error;

    const bySkill = new Map<string, number>();
    const byUser = new Map<string, number>();

    for (const r of rows ?? []) {
      const sk = r.skill_key as string;
      const uid = r.user_id as string;
      bySkill.set(sk, (bySkill.get(sk) ?? 0) + 1);
      byUser.set(uid, (byUser.get(uid) ?? 0) + 1);
    }

    const bySkillList = [...bySkill.entries()]
      .map(([skill_key, member_count]) => ({ skill_key, member_count }))
      .sort((a, b) => b.member_count - a.member_count || a.skill_key.localeCompare(b.skill_key));

    const byUserList = [...byUser.entries()]
      .map(([user_id, skill_count]) => ({ user_id, skill_count }))
      .sort((a, b) => b.skill_count - a.skill_count);

    return NextResponse.json({
      bySkill: bySkillList,
      byUser: byUserList,
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
