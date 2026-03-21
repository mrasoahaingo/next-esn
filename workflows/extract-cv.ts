import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModel, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { triggerMissionAnalysesAfterExtract } from '@/lib/services/positioning-analyze-trigger';
import { createGatewayLanguageModel } from '@/lib/ai';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY } from '@/lib/llm/task-keys';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { aggregateLanguageModelUsage, mergeExtractedPartial } from '@/lib/services/extraction-merge';
import {
  extractionSchema,
  type ExtractedCV,
  extractionIdentitySchema,
  extractionExperiencesSchema,
  extractionEducationSchema,
  extractionSkillsStrengthsSchema,
} from '@/lib/schema';
import type { CvExtractionBranch, CvExtractionStreamMeta } from '@/lib/types/cv-extraction-stream';
import mammoth from 'mammoth';

type PrepareCvTextResult = {
  cvText: string;
  orgId: string | null;
  transcriptionUsage: LanguageModelUsage | undefined;
  durationMs: number;
  nextChunkIndex: number;
};

async function prepareCvText(candidateId: string): Promise<PrepareCvTextResult> {
  'use step';

  const encoder = new TextEncoder();
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  let chunkIndex = 0;

  const writeLine = async (payload: { meta: CvExtractionStreamMeta }) => {
    await writer.write(
      encoder.encode(JSON.stringify({ index: chunkIndex++, ...payload }) + '\n'),
    );
  };

  const startTime = Date.now();

  try {
    const supabase = getSupabase();

    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (fetchError || !candidate) throw new Error('Candidate not found');
    const orgId = candidate.org_id as string | null;

    const bucketPrefix = '/cv-original/';
    const bucketIndex = candidate.original_file_url.indexOf(bucketPrefix);
    const storagePath =
      bucketIndex !== -1
        ? candidate.original_file_url.slice(bucketIndex + bucketPrefix.length)
        : candidate.original_file_url.split('/').pop()!;
    const { data: fileBlob, error: downloadError } = await supabase.storage.from('cv-original').download(storagePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw downloadError;
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = storagePath.split('.').pop()?.toLowerCase();
    const isPdf = ext === 'pdf';

    let cvText: string;
    let transcriptionUsage: LanguageModelUsage | undefined;

    if (isPdf) {
      await writeLine({ meta: { phase: 'transcription', transcriptionChars: 0 } });

      const resolvedTx = await resolveLlmTask(supabase, {
        taskKey: TASK_KEY.CV_TRANSCRIPTION,
        orgId,
        context: {},
      });
      const txModel = createGatewayLanguageModel(
        resolvedTx.gatewayModelId,
        resolvedTx.useExtractJson,
      );

      const result = streamText({
        model: txModel,
        system: resolvedTx.systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcris l’intégralité du CV ci-joint.' },
              { type: 'file', mediaType: 'application/pdf', data: buffer },
            ],
          },
        ],
      });

      let accumulated = '';
      let lastEmitAt = Date.now();
      let charsSinceEmit = 0;

      for await (const delta of result.textStream) {
        accumulated += delta;
        charsSinceEmit += delta.length;
        const now = Date.now();
        if (charsSinceEmit >= 96 || now - lastEmitAt > 320) {
          charsSinceEmit = 0;
          lastEmitAt = now;
          await writeLine({
            meta: { phase: 'transcription', transcriptionChars: accumulated.length },
          });
        }
      }

      transcriptionUsage = await result.totalUsage;
      cvText = accumulated;

      if (!cvText.trim()) {
        throw new Error('Empty CV text after preparation');
      }

      return {
        cvText,
        orgId,
        transcriptionUsage,
        durationMs: Date.now() - startTime,
        nextChunkIndex: chunkIndex,
      };
    }

    await writeLine({ meta: { phase: 'reading' } });
    const { value } = await mammoth.extractRawText({ buffer });
    cvText = value;

    if (!cvText?.trim()) {
      throw new Error('Empty CV text after preparation');
    }

    return {
      cvText,
      orgId,
      transcriptionUsage: undefined,
      durationMs: Date.now() - startTime,
      nextChunkIndex: chunkIndex,
    };
  } finally {
    writer.releaseLock();
  }
}

type ParallelExtractResult = {
  object: unknown;
  parallelUsages: LanguageModelUsage[];
  durationMs: number;
};

async function parallelExtractAndStream(
  cvText: string,
  jobDescription: string | undefined,
  startChunkIndex: number,
  orgId: string | null,
): Promise<ParallelExtractResult> {
  'use step';

  const supabase = getSupabase();
  const parallelStart = Date.now();
  const jobCtx = jobDescription
    ? `\n\n--- Fiche de poste (matching / forces) ---\n\n${jobDescription}`
    : '';
  const userContent = `Voici le contenu textuel du CV :\n\n${cvText}${jobCtx}`;

  const acc: Partial<ExtractedCV> = {};
  const encoder = new TextEncoder();
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  let chunkIndex = startChunkIndex;

  const activeBranches = new Set<CvExtractionBranch>();

  let lock = Promise.resolve();
  const runLocked = (fn: () => Promise<void>) => {
    const next = lock.then(fn, fn);
    lock = next.catch(() => {});
    return next;
  };

  const emit = async () => {
    const snapshot = { ...acc };
    const meta: CvExtractionStreamMeta = {
      phase: 'extracting',
      activeBranches: [...activeBranches],
    };
    await writer.write(
      encoder.encode(
        JSON.stringify({
          index: chunkIndex++,
          data: snapshot,
          meta,
        }) + '\n',
      ),
    );
  };

  async function consumeBranch<T>(
    languageModel: LanguageModel,
    system: string,
    schema: FlexibleSchema<T>,
    outputName: string,
    branch: CvExtractionBranch,
  ): Promise<LanguageModelUsage> {
    const result = streamText({
      model: languageModel,
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
        mergeExtractedPartial(acc, partial as Partial<ExtractedCV>);
        await emit();
      });
    }

    await runLocked(async () => {
      activeBranches.delete(branch);
      await emit();
    });

    return await result.usage;
  }

  try {
    const [rId, rEx, rEd, rSk] = await Promise.all([
      resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_IDENTITY, orgId, context: {} }),
      resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_EXPERIENCES, orgId, context: {} }),
      resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_EDUCATION, orgId, context: {} }),
      resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_SKILLS, orgId, context: {} }),
    ]);

    const parallelUsages = await Promise.all([
      consumeBranch(
        createGatewayLanguageModel(rId.gatewayModelId, rId.useExtractJson),
        rId.systemPrompt,
        extractionIdentitySchema,
        'cv_identity',
        'identity',
      ),
      consumeBranch(
        createGatewayLanguageModel(rEx.gatewayModelId, rEx.useExtractJson),
        rEx.systemPrompt,
        extractionExperiencesSchema,
        'cv_experiences',
        'experiences',
      ),
      consumeBranch(
        createGatewayLanguageModel(rEd.gatewayModelId, rEd.useExtractJson),
        rEd.systemPrompt,
        extractionEducationSchema,
        'cv_education',
        'education',
      ),
      consumeBranch(
        createGatewayLanguageModel(rSk.gatewayModelId, rSk.useExtractJson),
        rSk.systemPrompt,
        extractionSkillsStrengthsSchema,
        'cv_skills',
        'skills',
      ),
    ]);

    const parsed = extractionSchema.safeParse(acc);
    const object = parsed.success ? parsed.data : acc;

    if (!parsed.success) {
      console.warn('Extraction schema validation warning:', parsed.error.flatten());
    }

    return {
      object,
      parallelUsages,
      durationMs: Date.now() - parallelStart,
    };
  } finally {
    writer.releaseLock();
  }
}

async function saveResult(
  candidateId: string,
  result: { object: unknown; usage: LanguageModelUsage; durationMs: number; orgId: string | null },
) {
  'use step';

  const supabase = getSupabase();
  const resolvedLog = await resolveLlmTask(supabase, {
    taskKey: TASK_KEY.CV_BRANCH_IDENTITY,
    orgId: result.orgId,
    context: {},
  });

  await logAiUsage(supabase, {
    operation: 'extraction',
    candidateId,
    orgId: result.orgId ?? undefined,
    aiModel: resolvedLog.gatewayModelId,
    taskKey: TASK_KEY.CV_EXTRACTION_AGGREGATE,
    durationMs: result.durationMs,
    usage: result.usage,
  });

  if (result.object) {
    await supabase
      .from('candidates')
      .update({
        extracted_data: result.object,
        status: 'reviewing',
        ai_extraction_duration_ms: result.durationMs,
        workflow_run_id: null,
      })
      .eq('id', candidateId);

    await supabase.from('extraction_history').insert({
      candidate_id: candidateId,
      extraction_result: result.object,
      ai_model: resolvedLog.gatewayModelId,
      org_id: result.orgId,
    });
  }

  const writable = getWritable<Uint8Array>();
  await writable.close();
}

async function runMissionAnalysesAfterExtract(candidateId: string) {
  'use step';

  const supabase = getSupabase();
  await triggerMissionAnalysesAfterExtract(supabase, candidateId);
}

export async function extractCvWorkflow(candidateId: string, jobDescription?: string) {
  'use workflow';

  const prep = await prepareCvText(candidateId);
  const ext = await parallelExtractAndStream(prep.cvText, jobDescription, prep.nextChunkIndex, prep.orgId);

  const usageParts: LanguageModelUsage[] = [...ext.parallelUsages];
  if (prep.transcriptionUsage) {
    usageParts.unshift(prep.transcriptionUsage);
  }
  const usage = aggregateLanguageModelUsage(usageParts);

  const result = {
    object: ext.object,
    usage,
    durationMs: prep.durationMs + ext.durationMs,
    orgId: prep.orgId,
  };

  await saveResult(candidateId, result);
  await runMissionAnalysesAfterExtract(candidateId);
  return result.object;
}
