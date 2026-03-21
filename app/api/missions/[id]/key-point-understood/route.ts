import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgContext } from '@/lib/utils/auth';
import type { JobPostingAnalysis } from '@/lib/schema';
import { normalizeSkillKey } from '@/lib/utils/skill-key';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { orgId, userId } = await requireOrgContext();
    const { id: missionId } = await params;
    const body = await req.json();
    const pointId = body.pointId as string | undefined;
    const understood = Boolean(body.understood);

    if (!pointId?.trim()) {
      return NextResponse.json({ error: 'pointId requis' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: mission, error: mErr } = await supabase
      .from('missions')
      .select('id, job_analysis')
      .eq('id', missionId)
      .eq('org_id', orgId)
      .single();

    if (mErr || !mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 });
    }

    const analysis = mission.job_analysis as JobPostingAnalysis | null;
    const point = analysis?.keyPoints?.find((p) => p.id === pointId);
    const useGlobalSkill =
      point?.aspect === 'technical' &&
      point.canonicalSkillKey &&
      point.canonicalSkillKey.trim().length > 0;

    if (useGlobalSkill && point.canonicalSkillKey) {
      const skillKey = normalizeSkillKey(point.canonicalSkillKey);
      if (understood) {
        const { error: upErr } = await supabase.from('recruiter_skill_understood').upsert(
          {
            org_id: orgId,
            user_id: userId,
            skill_key: skillKey,
            understood_at: new Date().toISOString(),
          },
          { onConflict: 'org_id,user_id,skill_key' },
        );
        if (upErr) throw upErr;
      } else {
        const { error: delErr } = await supabase
          .from('recruiter_skill_understood')
          .delete()
          .eq('org_id', orgId)
          .eq('user_id', userId)
          .eq('skill_key', skillKey);
        if (delErr) throw delErr;
      }
    } else {
      if (understood) {
        const { error: upErr } = await supabase.from('mission_skill_understood').upsert(
          {
            mission_id: missionId,
            org_id: orgId,
            user_id: userId,
            point_id: pointId,
            understood_at: new Date().toISOString(),
          },
          { onConflict: 'mission_id,user_id,point_id' },
        );
        if (upErr) throw upErr;
      } else {
        const { error: delErr } = await supabase
          .from('mission_skill_understood')
          .delete()
          .eq('mission_id', missionId)
          .eq('user_id', userId)
          .eq('point_id', pointId);
        if (delErr) throw delErr;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('key-point-understood error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
