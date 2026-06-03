import { getWritable } from 'workflow';
import { streamText, Output, type FlexibleSchema, type LanguageModel, type LanguageModelUsage } from 'ai';
import { getSupabase } from '@/lib/utils/supabase';
import { triggerMissionAnalysesAfterExtract } from '@/lib/services/positioning-analyze-trigger';
import { createGatewayLanguageModel, llmExtractionSettings } from '@/lib/ai';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY, type TaskKey } from '@/lib/llm/task-keys';
import { logAiUsage, insertAiUsageStart, updateAiUsageEnd } from '@/lib/services/ai-usage.service';
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
import type { CvExtractionModelsSnapshot } from '@/lib/types/cv-extraction-snapshot-payload';
import { logCvExtractionSnapshot } from '@/lib/services/cv-extraction-snapshot-log';
import { workflowLastErrorSchema } from '@/lib/types/workflow-last-error';
import { attachWorkflowStepKey, readWorkflowStepKey } from '@/lib/utils/workflow-step-error';
import mammoth from 'mammoth';

type PrepareCvTextResult = {
  cvText: string;
  orgId: string | null;
  workflowRunId: string | null;
  /** Modèle gateway utilisé pour la transcription PDF (absent si DOCX / texte mammoth). */
  transcriptionModelId?: string;
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
      throw attachWorkflowStepKey(downloadError, 'transcription');
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = storagePath.split('.').pop()?.toLowerCase();
    const isPdf = ext === 'pdf';

    let cvText: string;
    let transcriptionUsage: LanguageModelUsage | undefined;

    if (isPdf) {
      try {
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
      const txLogId = await insertAiUsageStart(supabase, {
        operation: 'extraction',
        candidateId,
        orgId: orgId ?? undefined,
        aiModel: resolvedTx.gatewayModelId,
        taskKey: TASK_KEY.CV_TRANSCRIPTION,
        workflowRunId,
        inputPayload: {
          kind: 'pdf_attachment',
          mediaType: 'application/pdf',
          byteLength: buffer.length,
          system: resolvedTx.systemPrompt,
          userText: "Transcris l'intégralité du CV ci-joint.",
        },
      });

      const result = streamText({
        ...llmExtractionSettings,
        model: txModel,
        system: resolvedTx.systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: "Transcris l'intégralité du CV ci-joint." },
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

      await updateAiUsageEnd(supabase, txLogId, {
        durationMs: txDurationMs,
        usage: transcriptionUsage,
        outputPayload: { text: cvText },
      });

      return {
        cvText,
        orgId,
        workflowRunId,
        transcriptionModelId: resolvedTx.gatewayModelId,
        transcriptionUsage,
        durationMs: Date.now() - startTime,
        nextChunkIndex: chunkIndex,
      };
    } catch (e) {
      throw attachWorkflowStepKey(e, 'transcription');
    }
    }

    try {
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
    } catch (e) {
      throw attachWorkflowStepKey(e, 'reading');
    }
  } finally {
    writer.releaseLock();
  }
}

type ParallelExtractResult = {
  object: unknown;
  durationMs: number;
  modelsSnapshot: CvExtractionModelsSnapshot;
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
  const completedBranches = new Set<CvExtractionBranch>();

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
      completedBranches: [...completedBranches],
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
    /** Timeout en ms pour cette branche (défaut 45 000). La branche experiences utilise 90 000
     *  car elle produit le plus de tokens (10+ expériences × 10 champs + description[]) et cumule
     *  le plus de temps de réflexion Gemini 2.5 Flash avant le premier token JSON. */
    timeoutMs = 45_000,
  ): Promise<void> {
    const branchStart = Date.now();
    const logId = await insertAiUsageStart(supabase, {
      operation: 'extraction',
      candidateId,
      orgId: orgId ?? undefined,
      aiModel: gatewayModelId,
      taskKey,
      workflowRunId,
      branch,
      inputPayload: { system, messages: [{ role: 'user', content: userContent }] },
    });

    const branchAbort = new AbortController();
    const branchTimeout = setTimeout(() => branchAbort.abort(), timeoutMs);

    try {
      const result = streamText({
        ...llmExtractionSettings,
        model: languageModel,
        system,
        messages: [{ role: 'user', content: userContent }],
        output: Output.object({ schema, name: outputName }),
        abortSignal: branchAbort.signal,
      });

      await runLocked(async () => {
        activeBranches.add(branch);
        await emit();
      });

      try {
        for await (const partial of result.partialOutputStream) {
          await runLocked(async () => {
            mergeExtractedPartial(acc, partial as Partial<ExtractedCV>);
            await emit();
          });
        }
        const usage = await result.usage;
        const output = await result.output;
        await updateAiUsageEnd(supabase, logId, {
          durationMs: Date.now() - branchStart,
          usage,
          outputPayload: output,
        });
      } catch (streamError) {
        if (!branchAbort.signal.aborted) {
          await updateAiUsageEnd(supabase, logId, {
            durationMs: Date.now() - branchStart,
            callStatus: 'failed',
          }).catch(() => {});
          throw attachWorkflowStepKey(streamError, branch);
        }
        // Timeout : branche terminée sans données, l'utilisateur peut saisir manuellement
        console.warn(`[extract-cv] branch=${branch} timed out after ${timeoutMs / 1000}s — marking complete with partial data`);
        await updateAiUsageEnd(supabase, logId, {
          durationMs: Date.now() - branchStart,
          callStatus: 'failed',
        }).catch(() => {});
      }

      await runLocked(async () => {
        activeBranches.delete(branch);
        completedBranches.add(branch);
        await emit();
      });
    } finally {
      clearTimeout(branchTimeout);
    }
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
        90_000, // experiences branch needs more time: largest output + longest thinking overhead
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

    // Defensive defaults: array fields may be undefined if their branch timed out.
    // Set them to [] so the schema validates and the saved record stays usable.
    if (acc.experiences === undefined) acc.experiences = [];
    if (acc.education === undefined) acc.education = [];

    const parsed = extractionSchema.safeParse(acc);
    let object: unknown = acc;
    if (parsed.success) {
      const referenceDate = new Date();
      object = prepareCvForMatchingPrompt(parsed.data, referenceDate);
    }

    if (!parsed.success) {
      console.warn('Extraction schema validation warning:', parsed.error.flatten());
    }

    const modelsSnapshot: CvExtractionModelsSnapshot = {
      byTask: {
        [TASK_KEY.CV_BRANCH_IDENTITY]: rId.gatewayModelId,
        [TASK_KEY.CV_BRANCH_EXPERIENCES]: rEx.gatewayModelId,
        [TASK_KEY.CV_BRANCH_EDUCATION]: rEd.gatewayModelId,
        [TASK_KEY.CV_BRANCH_SKILLS]: rSk.gatewayModelId,
      },
      uniqueModels: Array.from(
        new Set([
          rId.gatewayModelId,
          rEx.gatewayModelId,
          rEd.gatewayModelId,
          rSk.gatewayModelId,
        ]),
      ).sort((a, b) => a.localeCompare(b)),
    };

    return {
      object,
      durationMs: Date.now() - parallelStart,
      modelsSnapshot,
    };
  } finally {
    writer.releaseLock();
  }
}

async function saveResult(
  candidateId: string,
  result: {
    object: unknown;
    durationMs: number;
    orgId: string | null;
    modelsSnapshot: CvExtractionModelsSnapshot;
    workflowRunId: string | null;
  },
) {
  'use step';

  const supabase = getSupabase();

  if (result.object) {
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        extracted_data: result.object,
        status: 'reviewing',
        ai_extraction_duration_ms: result.durationMs,
        ai_extraction_models: result.modelsSnapshot,
        workflow_run_id: null,
        workflow_last_error: null,
      })
      .eq('id', candidateId);

    if (updateError) {
      throw new Error(`saveResult DB update failed: ${updateError.message}`);
    }

    if (result.orgId) {
      await logCvExtractionSnapshot(supabase, {
        candidateId,
        orgId: result.orgId,
        reason: 'workflow_completed',
        extractedData: result.object,
        aiModels: result.modelsSnapshot,
        durationMs: result.durationMs,
        workflowRunId: result.workflowRunId,
      });
    }
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
  ctx?: { stepKey?: string },
) {
  'use step';

  const supabase = getSupabase();
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const stepKey = ctx?.stepKey ?? readWorkflowStepKey(error) ?? 'unknown';
  const workflowLastError = workflowLastErrorSchema.parse({
    stepKey,
    message: errorMessage,
  });

  await supabase
    .from(table)
    .update({
      status: 'error',
      workflow_run_id: null,
      workflow_last_error: workflowLastError,
    })
    .eq('id', recordId);

  // Write error frame to NDJSON stream so connected clients see it
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  try {
    await writer.write(
      encoder.encode(
        JSON.stringify({
          error: errorMessage,
          ...(stepKey !== 'unknown' ? { stepKey } : {}),
        }) + '\n',
      ),
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

    const byTask: Record<string, string> = { ...ext.modelsSnapshot.byTask };
    if (prep.transcriptionModelId) {
      byTask[TASK_KEY.CV_TRANSCRIPTION] = prep.transcriptionModelId;
    }
    const uniqueModels = Array.from(
      new Set([
        ...ext.modelsSnapshot.uniqueModels,
        ...(prep.transcriptionModelId ? [prep.transcriptionModelId] : []),
      ]),
    ).sort((a, b) => a.localeCompare(b));

    const result = {
      object: ext.object,
      durationMs: prep.durationMs + ext.durationMs,
      orgId: prep.orgId,
      modelsSnapshot: { byTask, uniqueModels } satisfies CvExtractionModelsSnapshot,
      workflowRunId: prep.workflowRunId,
    };

    await saveResult(candidateId, result);
    await runMissionAnalysesAfterExtract(candidateId);
    return result.object;
  } catch (error) {
    await handleWorkflowError(candidateId, 'candidates', error);
    throw error;
  }
}
