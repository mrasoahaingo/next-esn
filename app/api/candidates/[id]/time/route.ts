import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const { id } = params;
    const { seconds } = await req.json();

    if (!seconds || typeof seconds !== 'number' || seconds <= 0) {
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabase();
    await supabase.rpc('increment_candidate_time', {
      p_id: id,
      p_seconds: Math.round(seconds),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
