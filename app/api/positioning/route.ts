import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { triggerMissionPositioningAnalysis } from '@/lib/services/positioning-analyze-trigger';

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('positionings')
      .select('id, candidate_id, mission_id, job_description, status, analysis, workflow_run_id, created_at, candidates(id, extracted_data), missions(id, title, company)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const orgId = await requireOrgId();
    const { candidateId, jobDescription, missionId } = await req.json();
    const supabase = getSupabase();

    let finalJobDescription = jobDescription;

    if (missionId) {
      const { data: mission, error: missionError } = await supabase
        .from('missions')
        .select('job_description')
        .eq('id', missionId)
        .eq('org_id', orgId)
        .single();

      if (missionError) throw missionError;
      finalJobDescription = mission.job_description;
    }

    const { data, error } = await supabase
      .from('positionings')
      .insert({
        candidate_id: candidateId,
        job_description: finalJobDescription,
        mission_id: missionId || null,
        status: 'draft',
        org_id: orgId,
        added_via: missionId ? 'existing_candidate' : null,
      })
      .select()
      .single();

    if (error) throw error;

    if (missionId) {
      await triggerMissionPositioningAnalysis(supabase, data.id);
      const { data: refreshed } = await supabase
        .from('positionings')
        .select()
        .eq('id', data.id)
        .single();
      return NextResponse.json(refreshed ?? data);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Create positioning error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
