import { convertToModelMessages, type UIMessage } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';
import { generateBriefStream, RADAR_BRIEF_MODEL_ID, type BriefChannel, type BriefPersona } from '@/lib/radar/brief';
import { getProspectDetail } from '@/lib/radar/queries';
import { logAiUsage } from '@/lib/services/ai-usage.service';
import { requireOrgContext } from '@/lib/utils/auth';

const BriefRequestSchema = z.object({
  companyId: z.string().uuid(),
  persona: z.enum(['dsi', 'drh', 'ceo', 'daf', 'directeur_technique', 'auto']).default('auto'),
  channel: z.enum(['email_froid', 'relance_linkedin', 'appel', 'relance_email', 'auto']).default('auto'),
  messages: z.array(z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const { orgId, userId } = await requireOrgContext();
    const rawBody = await request.json();
    const parsed = BriefRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Paramètres invalides', details: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;

    const prospect = await getProspectDetail(orgId, body.companyId);
    if (!prospect) {
      return NextResponse.json({ error: 'Prospect introuvable' }, { status: 404 });
    }

    const messages = (body.messages ?? []) as UIMessage[];
    const result = generateBriefStream({
      companyName: prospect.company.name,
      signals: prospect.signals,
      matches: prospect.matches,
      actions: prospect.actions.map((action) => ({
        action: action.action,
        outcome: action.outcome,
        notes: action.notes,
        performedAt: action.performedAt,
      })),
      persona: body.persona as BriefPersona,
      channel: body.channel as BriefChannel,
      promptOverride: messages.at(-1)?.parts
        ?.map((part) => ('text' in part ? part.text : ''))
        .join('\n')
        .trim(),
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      onFinish: async ({ responseMessage, isAborted }) => {
        try {
          const usage = await result.totalUsage;
          await logAiUsage(getSupabase(), {
            operation: 'generation',
            orgId,
            aiModel: RADAR_BRIEF_MODEL_ID,
            taskKey: 'radar.brief.generate',
            durationMs: 0,
            usage,
            inputPayload: {
              companyId: body.companyId,
              userId,
              persona: body.persona,
              channel: body.channel,
              messages: await convertToModelMessages(messages),
            },
            outputPayload: responseMessage,
            callStatus: isAborted ? 'cancelled' : 'completed',
          });
          await getSupabase().from('radar_actions').insert({
            org_id: orgId,
            user_id: userId,
            company_id: body.companyId,
            action: 'brief_generated',
            outcome: 'pending',
          });
        } catch (error) {
          console.error('radar brief logging:', error);
        }
      },
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/brief:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
