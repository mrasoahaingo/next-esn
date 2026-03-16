import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();

    const [candidatesRes, positioningsRes] = await Promise.all([
      supabase
        .from('candidates')
        .select('id, status, extracted_data, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('positionings')
        .select('id, candidate_id, job_description, status, analysis, created_at, candidates(id, extracted_data)')
        .order('created_at', { ascending: false }),
    ]);

    if (candidatesRes.error) throw candidatesRes.error;
    if (positioningsRes.error) throw positioningsRes.error;

    return NextResponse.json({
      candidates: candidatesRes.data ?? [],
      positionings: positioningsRes.data ?? [],
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
