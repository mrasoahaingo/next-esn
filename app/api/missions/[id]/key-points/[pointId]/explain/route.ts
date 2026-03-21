import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { createGatewayLanguageModel } from '@/lib/ai';
import { jobPostingKeyPointExplainSchema, type JobPostingAnalysis } from '@/lib/schema';
import { buildJobPostingKeyPointExplainUserContent } from '@/lib/services/job-posting-analysis.service';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY } from '@/lib/llm/task-keys';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; pointId: string }> },
) {
  try {
    const orgId = await requireOrgId();
    const { id: missionId, pointId } = await params;
    const supabase = getSupabase();

    const { data: mission, error } = await supabase
      .from('missions')
      .select('id, org_id, job_description, job_analysis')
      .eq('id', missionId)
      .eq('org_id', orgId)
      .single();

    if (error || !mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 });
    }

    const jd = mission.job_description as string;
    const analysis = mission.job_analysis as JobPostingAnalysis | null;
    const fromAnalysis = analysis?.keyPoints?.find((k) => k.id === pointId);

    const point = fromAnalysis ?? {
      id: pointId,
      label: pointId,
      aspect: 'other' as const,
      category: '',
      importanceRank: 1,
      roleInMission: '',
    };

    const resolved = await resolveLlmTask(supabase, {
      taskKey: TASK_KEY.MISSION_KEY_POINT_EXPLAIN,
      orgId,
      context: {},
    });
    const model = createGatewayLanguageModel(resolved.gatewayModelId, resolved.useExtractJson);

    const start = Date.now();
    const { object, usage } = await generateObject({
      model,
      schema: jobPostingKeyPointExplainSchema,
      system: resolved.systemPrompt,
      messages: [
        {
          role: 'user',
          content: buildJobPostingKeyPointExplainUserContent(jd, {
            id: point.id,
            label: point.label,
            aspect: point.aspect,
            roleInMission: point.roleInMission,
            canonicalSkillKey: fromAnalysis?.canonicalSkillKey,
          }),
        },
      ],
    });

    const durationMs = Date.now() - start;

    after(async () => {
      await logAiUsage(supabase, {
        operation: 'analysis',
        missionId,
        orgId,
        aiModel: resolved.gatewayModelId,
        taskKey: TASK_KEY.MISSION_KEY_POINT_EXPLAIN,
        durationMs,
        usage,
      });
    });

    return NextResponse.json(object);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('key-point explain error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
