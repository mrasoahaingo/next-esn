import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { extractionModel, usageModelIds } from '@/lib/ai';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { aggregateLanguageModelUsage } from '@/lib/services/extraction-merge';
import { mergePositioningPartial } from '@/lib/services/positioning-analysis-merge';
import {
  positioningAnalysisSchema,
  type PositioningAnalysis,
  type ExtractedCV,
  positioningSkillMatchesSchema,
  positioningExperienceRelevanceSchema,
  positioningGapsSchema,
  positioningQuestionsSchema,
  positioningSynthesisSchema,
} from '@/lib/schema';
import {
  buildPositioningAnalysisSkillsSystemPrompt,
  buildPositioningAnalysisExperiencesSystemPrompt,
  buildPositioningAnalysisGapsSystemPrompt,
  buildPositioningAnalysisQuestionsSystemPrompt,
  buildPositioningSynthesisPrompt,
  buildAnalysisUserContent,
  buildPositioningSynthesisUserContent,
} from '@/lib/services/positioning.service';
import { getOrganizationSettings, toPositioningPromptBranding } from '@/lib/utils/org-settings';
import type {
  PositioningAnalysisBranch,
  PositioningAnalysisStreamMeta,
} from '@/lib/types/positioning-analysis-stream';

async function fetchAndAnalyze(positioningId: string) {
  'use step';

  const supabase = getSupabase();

  const { data: positioning, error: fetchError } = await supabase
    .from('positionings')
    .select('*, candidates(*)')
    .eq('id', positioningId)
    .single();

  if (fetchError || !positioning) throw new Error('Positioning not found');

  const candidate = positioning.candidates;
  if (!candidate?.extracted_data) throw new Error('CV not extracted yet');

  const cv = candidate.extracted_data as ExtractedCV;
  const jobDescription = positioning.job_description as string;

  const orgId = positioning.org_id as string | null | undefined;
  const orgSettings = orgId ? await getOrganizationSettings(orgId) : null;
  const branding = toPositioningPromptBranding(orgSettings);

  const userContent = buildAnalysisUserContent(cv, jobDescription);

  const startTime = Date.now();
  const encoder = new TextEncoder();
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  let chunkIndex = 0;

  const acc: Partial<PositioningAnalysis> = {};
  const activeBranches = new Set<PositioningAnalysisBranch>();

  let lock = Promise.resolve();
  const runLocked = (fn: () => Promise<void>) => {
    const next = lock.then(fn, fn);
    lock = next.catch(() => {});
    return next;
  };

  const emit = async () => {
    const snapshot = { ...acc };
    const meta: PositioningAnalysisStreamMeta = {
      phase: activeBranches.has('synthesis') ? 'synthesizing' : 'extracting',
      activeBranches: [...activeBranches],
    };
    await writer.write(
      encoder.encode(JSON.stringify({ index: chunkIndex++, data: snapshot, meta }) + '\n'),
    );
  };

  async function consumeBranch<T>(
    system: string,
    schema: FlexibleSchema<T>,
    outputName: string,
    branch: PositioningAnalysisBranch,
  ): Promise<LanguageModelUsage> {
    const result = streamText({
      model: extractionModel,
      system,
      messages: [{ role: 'user', content: userContent }],
      output: Output.object({ schema, name: outputName }),
    });

    let branchStarted = false;

    for await (const partial of result.partialOutputStream) {
      await runLocked(async () => {
        if (!branchStarted) {
          branchStarted = true;
          activeBranches.add(branch);
        }
        mergePositioningPartial(acc, partial as Partial<PositioningAnalysis>);
        await emit();
      });
    }

    await runLocked(async () => {
      activeBranches.delete(branch);
      await emit();
    });

    return await result.usage;
  }

  const usages: LanguageModelUsage[] = [];

  try {
    const parallelUsages = await Promise.all([
      consumeBranch(
        buildPositioningAnalysisSkillsSystemPrompt(branding),
        positioningSkillMatchesSchema,
        'positioning_skills',
        'skills',
      ),
      consumeBranch(
        buildPositioningAnalysisExperiencesSystemPrompt(branding),
        positioningExperienceRelevanceSchema,
        'positioning_experiences',
        'experiences',
      ),
      consumeBranch(
        buildPositioningAnalysisGapsSystemPrompt(branding),
        positioningGapsSchema,
        'positioning_gaps',
        'gaps',
      ),
      consumeBranch(
        buildPositioningAnalysisQuestionsSystemPrompt(branding),
        positioningQuestionsSchema,
        'positioning_questions',
        'questions',
      ),
    ]);
    usages.push(...parallelUsages);

    const synthesisResult = streamText({
      model: extractionModel,
      system: buildPositioningSynthesisPrompt(branding),
      messages: [
        {
          role: 'user',
          content: buildPositioningSynthesisUserContent(cv, jobDescription, acc),
        },
      ],
      output: Output.object({ schema: positioningSynthesisSchema, name: 'positioning_synthesis' }),
    });

    let synStarted = false;
    for await (const partial of synthesisResult.partialOutputStream) {
      await runLocked(async () => {
        if (!synStarted) {
          synStarted = true;
          activeBranches.add('synthesis');
        }
        mergePositioningPartial(acc, partial as Partial<PositioningAnalysis>);
        await emit();
      });
    }

    await runLocked(async () => {
      activeBranches.delete('synthesis');
      await emit();
    });

    usages.push(await synthesisResult.usage);

    const parsed = positioningAnalysisSchema.safeParse(acc);
    const object = parsed.success ? parsed.data : acc;

    if (!parsed.success) {
      console.warn('Positioning analysis schema validation warning:', parsed.error.flatten());
    }

    const durationMs = Date.now() - startTime;

    return {
      object,
      usage: aggregateLanguageModelUsage(usages),
      durationMs,
      candidateId: positioning.candidate_id,
      orgId: positioning.org_id as string | null,
    };
  } finally {
    writer.releaseLock();
  }
}

async function saveAnalysis(
  positioningId: string,
  result: { object: unknown; usage: LanguageModelUsage; durationMs: number; candidateId: string; orgId: string | null },
) {
  'use step';

  const supabase = getSupabase();

  await logAiUsage(supabase, {
    operation: 'analysis',
    positioningId,
    candidateId: result.candidateId,
    orgId: result.orgId ?? undefined,
    aiModel: usageModelIds.positioningAnalysis,
    durationMs: result.durationMs,
    usage: result.usage,
  });

  if (result.object) {
    await supabase
      .from('positionings')
      .update({
        analysis: result.object,
        status: 'analyzed',
        ai_analysis_duration_ms: result.durationMs,
        workflow_run_id: null,
      })
      .eq('id', positioningId);
  }

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

export async function positioningAnalyzeWorkflow(positioningId: string) {
  'use workflow';

  const result = await fetchAndAnalyze(positioningId);
  await saveAnalysis(positioningId, result);
  return result.object;
}
