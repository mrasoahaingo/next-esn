import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { respondPositioningAnalyzePost } from '@/lib/services/positioning-analyze-trigger';

export async function POST(req: NextRequest) {
  try {
    await requireOrgId();
    const body = (await req.json()) as {
      positioningId?: string;
      answers?: Record<string, string>;
    };
    const { positioningId, answers } = body;
    if (!positioningId) throw new Error('positioningId is required');

    const supabase = getSupabase();
    return await respondPositioningAnalyzePost(supabase, positioningId, answers);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Positioning analysis error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
