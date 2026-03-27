import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { TASK_KEY } from '@/lib/llm/task-keys';
import { parsePositioningAnalysisSnapshotPayload } from '@/lib/types/positioning-analysis-snapshot-payload';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id: positioningId } = await params;
    const supabase = getSupabase();

    const { data: positioning, error: posErr } = await supabase
      .from('positionings')
      .select('id')
      .eq('id', positioningId)
      .eq('org_id', orgId)
      .single();

    if (posErr || !positioning) {
      return NextResponse.json({ error: 'Positioning not found' }, { status: 404 });
    }

    const { data: rows, error } = await supabase
      .from('ai_usage_log')
      .select('id, created_at, output_payload')
      .eq('positioning_id', positioningId)
      .eq('org_id', orgId)
      .eq('task_key', TASK_KEY.POSITIONING_ANALYSIS_SNAPSHOT)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped =
      rows?.flatMap((row) => {
        const payload = parsePositioningAnalysisSnapshotPayload(row.output_payload);
        if (!payload) return [];
        return [
          {
            id: row.id as string,
            created_at: row.created_at as string,
            analysis: payload.analysis,
            answers: payload.answers,
            ai_analysis_models: payload.ai_analysis_models,
            snapshot_reason: payload.reason,
          },
        ];
      }) ?? [];

    return NextResponse.json(mapped);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Get positioning analysis history error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
