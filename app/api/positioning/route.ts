import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('positionings')
      .select('id, candidate_id, mission_id, job_description, status, analysis, created_at, candidates(id, extracted_data), missions(id, title, company)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobDescription, missionId } = await req.json();
    const supabase = getSupabase();

    let finalJobDescription = jobDescription;

    // If missionId provided, fetch the job description from the mission
    if (missionId) {
      const { data: mission, error: missionError } = await supabase
        .from('missions')
        .select('job_description')
        .eq('id', missionId)
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
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Create positioning error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
