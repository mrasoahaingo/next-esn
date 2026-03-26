import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModel, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { triggerMissionAnalysesAfterExtract } from '@/lib/services/positioning-analyze-trigger';
import { createGatewayLanguageModel, llmFactualGenerationSettings } from '@/lib/ai';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY, type TaskKey } from '@/lib/llm/task-keys';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { mergeExtractedPartial } from '@/lib/services/extraction-merge';
import { prepareCvForMatchingPrompt } from '@/lib/utils/cv-experience-time';
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
  workflowRunId: string | null;
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
      .select('id, org_id, original_file_url, workflow_run_id')
      .eq('id', candidateId)
      .single();

    if (fetchError || !candidate) throw new Error('Candidate not found');
    const orgId = candidate.org_id as string | null;
    const workflowRunId = (candidate.workflow_run_id as string | null) ?? null;

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

      const txStart = Date.now();
      const result = streamText({
        ...llmFactualGenerationSettings,
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
      const txDurationMs = Date.now() - txStart;

      if (!cvText.trim()) {
        throw new Error('Empty CV text after preparation');
      }

      await logAiUsage(supabase, {
        operation: 'extraction',
        candidateId,
        orgId: orgId ?? undefined,
        aiModel: resolvedTx.gatewayModelId,
        taskKey: TASK_KEY.CV_TRANSCRIPTION,
        durationMs: txDurationMs,
        usage: transcriptionUsage,
        inputPayload: {
          kind: 'pdf_attachment',
          mediaType: 'application/pdf',
          byteLength: buffer.length,
          system: resolvedTx.systemPrompt,
          userText: 'Transcris l’intégralité du CV ci-joint.',
        },
        outputPayload: { text: cvText },
        workflowRunId,
      });

      return {
        cvText,
        orgId,
        workflowRunId,
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
      workflowRunId,
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
  durationMs: number;
};

async function parallelExtractAndStream(
  candidateId: string,
  cvText: string,
  jobDescription: string | undefined,
  startChunkIndex: number,
  orgId: string | null,
  workflowRunId: string | null,
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
    taskKey: TaskKey,
    gatewayModelId: string,
  ): Promise<void> {
    const branchStart = Date.now();
    const result = streamText({
      ...llmFactualGenerationSettings,
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

    const usage = await result.usage;
    const output = await result.output;

    await logAiUsage(supabase, {
      operation: 'extraction',
      candidateId,
      orgId: orgId ?? undefined,
      aiModel: gatewayModelId,
      taskKey,
      durationMs: Date.now() - branchStart,
      usage,
      inputPayload: { system, messages: [{ role: 'user', content: userContent }] },
      outputPayload: output,
      workflowRunId,
    });
  }

  try {
    const [rId, rEx, rEd, rSk] = await Promise.all([
      resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_IDENTITY, orgId, context: {} }),
      resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_EXPERIENCES, orgId, context: {} }),
      resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_EDUCATION, orgId, context: {} }),
      resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_SKILLS, orgId, context: {} }),
    ]);

    await Promise.all([
      consumeBranch(
        createGatewayLanguageModel(rId.gatewayModelId, rId.useExtractJson),
        rId.systemPrompt,
        extractionIdentitySchema,
        'cv_identity',
        'identity',
        TASK_KEY.CV_BRANCH_IDENTITY,
        rId.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rEx.gatewayModelId, rEx.useExtractJson),
        rEx.systemPrompt,
        extractionExperiencesSchema,
        'cv_experiences',
        'experiences',
        TASK_KEY.CV_BRANCH_EXPERIENCES,
        rEx.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rEd.gatewayModelId, rEd.useExtractJson),
        rEd.systemPrompt,
        extractionEducationSchema,
        'cv_education',
        'education',
        TASK_KEY.CV_BRANCH_EDUCATION,
        rEd.gatewayModelId,
      ),
      consumeBranch(
        createGatewayLanguageModel(rSk.gatewayModelId, rSk.useExtractJson),
        rSk.systemPrompt,
        extractionSkillsStrengthsSchema,
        'cv_skills',
        'skills',
        TASK_KEY.CV_BRANCH_SKILLS,
        rSk.gatewayModelId,
      ),
    ]);

    const parsed = extractionSchema.safeParse(acc);
    let object: unknown = acc;
    if (parsed.success) {
      const referenceDate = new Date();
      object = prepareCvForMatchingPrompt(parsed.data, referenceDate);
    }

    if (!parsed.success) {
      console.warn('Extraction schema validation warning:', parsed.error.flatten());
    }

    return {
      object,
      durationMs: Date.now() - parallelStart,
    };
  } finally {
    writer.releaseLock();
  }
}

async function saveResult(
  candidateId: string,
  result: { object: unknown; durationMs: number; orgId: string | null },
) {
  'use step';

  const supabase = getSupabase();
  const resolvedLog = await resolveLlmTask(supabase, {
    taskKey: TASK_KEY.CV_BRANCH_IDENTITY,
    orgId: result.orgId,
    context: {},
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

async function handleWorkflowError(
  recordId: string,
  table: 'candidates' | 'positionings',
  error: unknown,
) {
  'use step';

  const supabase = getSupabase();
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  await supabase
    .from(table)
    .update({
      status: 'error',
      workflow_run_id: null,
    })
    .eq('id', recordId);

  // Write error frame to NDJSON stream so connected clients see it
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  try {
    await writer.write(
      encoder.encode(JSON.stringify({ error: errorMessage }) + '\n'),
    );
  } finally {
    writer.releaseLock();
    await writable.close();
  }
}
handleWorkflowError.maxRetries = 0;

export async function extractCvWorkflow(candidateId: string, jobDescription?: string) {
  'use workflow';

  try {
    const prep = await prepareCvText(candidateId);
    const ext = await parallelExtractAndStream(
      candidateId,
      prep.cvText,
      jobDescription,
      prep.nextChunkIndex,
      prep.orgId,
      prep.workflowRunId,
    );

    const result = {
      object: ext.object,
      durationMs: prep.durationMs + ext.durationMs,
      orgId: prep.orgId,
    };

    await saveResult(candidateId, result);
    await runMissionAnalysesAfterExtract(candidateId);
    return result.object;
  } catch (error) {
    await handleWorkflowError(candidateId, 'candidates', error);
    throw error;
  }
}
