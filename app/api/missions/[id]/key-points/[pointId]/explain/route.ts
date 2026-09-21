import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { createGatewayLanguageModel, llmFactualGenerationSettings } from '@/lib/ai';
import {
  jobPostingKeyPointExplainSchema,
  type JobPostingAnalysis,
  type JobPostingKeyPointExplain,
} from '@/lib/schema';
import { buildJobPostingKeyPointExplainUserContent } from '@/lib/services/job-posting-analysis.service';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY } from '@/lib/llm/task-keys';
import { sanitizeForJsonb, type JsonbSanitizeMeta } from '@/lib/utils/pg-jsonb-safe';

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
      .select('id, org_id, job_description, job_analysis, job_analysis_workflow_run_id')
      .eq('id', missionId)
      .eq('org_id', orgId)
      .single();

    if (error || !mission) {
      return NextResponse.json({ error: 'Mission introuvable' }, { status: 404 });
    }

    const jd = mission.job_description as string;
    const analysis = mission.job_analysis as JobPostingAnalysis | null;
    const cached = analysis?.keyPointExplanations?.[pointId];
    if (cached) {
      return NextResponse.json(cached);
    }
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

    const explainUserContent = buildJobPostingKeyPointExplainUserContent(jd, {
      id: point.id,
      label: point.label,
      aspect: point.aspect,
      roleInMission: point.roleInMission,
      canonicalSkillKey: fromAnalysis?.canonicalSkillKey,
    });

    const start = Date.now();
    const { object, usage } = await generateObject({
      ...llmFactualGenerationSettings,
      model,
      schema: jobPostingKeyPointExplainSchema,
      system: resolved.systemPrompt,
      messages: [{ role: 'user', content: explainUserContent }],
    });

    const durationMs = Date.now() - start;

    after(async () => {
      // Assainissement AVANT écriture : un NUL ou un surrogate isolé produit par le
      // modèle ferait échouer l'update jsonb et perdrait l'explication du point clé.
      const sanitizeMeta: JsonbSanitizeMeta = { removedChars: 0, paths: [] };
      const nextJobAnalysis = sanitizeForJsonb(
        {
          ...(analysis ?? {}),
          keyPointExplanations: {
            ...((analysis?.keyPointExplanations ?? {}) as Record<string, JobPostingKeyPointExplain>),
            [pointId]: object,
          },
        },
        sanitizeMeta,
      );

      if (sanitizeMeta.removedChars > 0) {
        // Jamais le contenu du payload : uniquement le volume et les chemins touchés.
        console.warn('Key point explain jsonb sanitization', {
          missionId,
          pointId,
          removedChars: sanitizeMeta.removedChars,
          paths: sanitizeMeta.paths,
        });
      }

      const [, { error: updateError }] = await Promise.all([
        logAiUsage(supabase, {
          operation: 'analysis',
          missionId,
          orgId,
          aiModel: resolved.gatewayModelId,
          taskKey: TASK_KEY.MISSION_KEY_POINT_EXPLAIN,
          durationMs,
          usage,
          inputPayload: {
            system: resolved.systemPrompt,
            messages: [{ role: 'user' as const, content: explainUserContent }],
          },
          outputPayload: object,
          workflowRunId: mission.job_analysis_workflow_run_id ?? null,
        }),
        supabase
          .from('missions')
          .update({ job_analysis: nextJobAnalysis })
          .eq('id', missionId)
          .eq('org_id', orgId),
      ]);

      // supabase-js ne lève pas : sans ce contrôle, une explication de point clé pourrait
      // disparaître en silence. La réponse HTTP est déjà renvoyée, on se contente de loguer.
      if (updateError) {
        console.error('key-point explain job_analysis update failed', {
          missionId,
          pointId,
          supabaseError: updateError.message,
        });
      }
    });

    return NextResponse.json(object);
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('key-point explain error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
