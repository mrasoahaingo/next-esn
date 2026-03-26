import { streamText } from 'ai';
import mammoth from 'mammoth';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createGatewayLanguageModel } from '@/lib/ai';
import { resolveLlmTask } from '@/lib/llm/resolve-task';
import { TASK_KEY } from '@/lib/llm/task-keys';
import { logAiUsage } from '@/lib/services/ai-usage.service';

const USER_PROMPT_PDF =
  'Transcris l’intégralité de la fiche de poste ci-jointe en texte brut fidèle, sans commentaire.';

export async function extractJobPostingTextFromFile(
  supabase: SupabaseClient,
  options: {
    buffer: Buffer;
    fileName: string;
    mimeType: string;
    orgId: string;
  },
): Promise<{ text: string; usedLlm: boolean }> {
  const { buffer, fileName, mimeType, orgId } = options;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx';
  const isDoc = mimeType === 'application/msword' || ext === 'doc';

  if (isPdf) {
    const resolvedTx = await resolveLlmTask(supabase, {
      taskKey: TASK_KEY.MISSION_JOB_POSTING_TRANSCRIPTION,
      orgId,
      context: {},
    });
    const txModel = createGatewayLanguageModel(
      resolvedTx.gatewayModelId,
      resolvedTx.useExtractJson,
    );
    const txStart = Date.now();
    const result = streamText({
      model: txModel,
      system: resolvedTx.systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: USER_PROMPT_PDF },
            { type: 'file', mediaType: 'application/pdf', data: buffer },
          ],
        },
      ],
    });

    let accumulated = '';
    for await (const delta of result.textStream) {
      accumulated += delta;
    }

    const transcriptionUsage = await result.totalUsage;
    const txDurationMs = Date.now() - txStart;
    const text = accumulated.trim();

    if (!text) {
      throw new Error('Extraction vide après transcription du PDF');
    }

    if (!transcriptionUsage) {
      throw new Error('Transcription PDF : usage modèle indisponible');
    }

    await logAiUsage(supabase, {
      operation: 'extraction',
      orgId,
      aiModel: resolvedTx.gatewayModelId,
      taskKey: TASK_KEY.MISSION_JOB_POSTING_TRANSCRIPTION,
      durationMs: txDurationMs,
      usage: transcriptionUsage,
      inputPayload: {
        kind: 'pdf_attachment',
        mediaType: 'application/pdf',
        byteLength: buffer.length,
        system: resolvedTx.systemPrompt,
        userText: USER_PROMPT_PDF,
      },
      outputPayload: { text },
    });

    return { text, usedLlm: true };
  }

  if (isDocx || isDoc) {
    const { value } = await mammoth.extractRawText({ buffer });
    const text = (value ?? '').trim();
    if (!text) {
      throw new Error(
        isDoc
          ? 'Document Word illisible ou vide. Utilisez un fichier .docx ou collez le texte.'
          : 'Document Word vide après extraction',
      );
    }
    return { text, usedLlm: false };
  }

  throw new Error('Type de fichier non pris en charge (PDF ou Word .doc/.docx)');
}
