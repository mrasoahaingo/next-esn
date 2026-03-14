import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('positionings')
      .select('id, candidate_id, job_description, status, analysis, created_at, candidates(id, extracted_data)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { candidateId, jobDescription } = await req.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('positionings')
      .insert({
        candidate_id: candidateId,
        job_description: jobDescription,
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
