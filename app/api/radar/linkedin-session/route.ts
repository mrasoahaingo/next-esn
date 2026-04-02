import Browserbase from '@browserbasehq/sdk';
import { NextResponse } from 'next/server';
import { requireOrgAdmin, requireOrgId } from '@/lib/utils/auth';
import { getRadarSettings, saveLinkedInContext } from '@/lib/radar/settings';

export async function GET() {
  try {
    const orgId = await requireOrgId();
    const settings = await getRadarSettings(orgId);
    return NextResponse.json({ connected: Boolean(settings.linkedinContextId) });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('GET /api/radar/linkedin-session:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const { orgId } = await requireOrgAdmin();
    const projectId = process.env.BROWSERBASE_PROJECT_ID!;
    const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY! });

    const context = await bb.contexts.create({ projectId });
    const session = await bb.sessions.create({
      projectId,
      browserSettings: { context: { id: context.id, persist: true } },
    });

    await saveLinkedInContext(orgId, context.id);

    return NextResponse.json({
      liveUrl: `https://www.browserbase.com/sessions/${session.id}`,
    });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('POST /api/radar/linkedin-session:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { orgId } = await requireOrgAdmin();
    await saveLinkedInContext(orgId, null);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    console.error('DELETE /api/radar/linkedin-session:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
