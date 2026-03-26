import { start, getRun } from 'workflow/api';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { positioningGenerateWorkflow } from '@/workflows/positioning-generate';
import type { PositioningGenerateMode } from '@/lib/types/positioning-generate-stream';

export async function POST(req: NextRequest) {
  try {
    await requireOrgId();
    const body = await req.json();
    const { positioningId, answers } = body;
    const rawMode = body.generateMode as string | undefined;
    const generateMode: PositioningGenerateMode =
      rawMode === 'cv' || rawMode === 'emails' || rawMode === 'all' ? rawMode : 'all';
    if (!positioningId) throw new Error('positioningId is required');

    const supabase = getSupabase();
    const { data: positioning, error: positioningError } = await supabase
      .from('positionings')
      .select('id, status, workflow_run_id, analysis, candidate_id, candidates(status, extracted_data)')
      .eq('id', positioningId)
      .single();

    if (positioningError || !positioning) {
      throw new Error('Positioning not found');
    }

    /** Comme POST /api/positioning/analyze : ne pas démarrer un second workflow si un run est déjà actif. */
    if (positioning.status === 'generating' && positioning.workflow_run_id) {
      const run = getRun(positioning.workflow_run_id as string);
      if (await run.exists) {
        const st = await run.status;
        if (st !== 'completed' && st !== 'failed' && st !== 'cancelled') {
          return new Response(run.getReadable({ startIndex: 0 }), {
            headers: {
              'Content-Type': 'application/x-ndjson',
              'x-workflow-run-id': positioning.workflow_run_id as string,
            },
          });
        }
      }
    }

    const candidate = positioning.candidates as { status?: string; extracted_data?: Record<string, unknown> | null } | null;
    const hasExtractedData = !!candidate?.extracted_data && Object.keys(candidate.extracted_data).length > 0;
    const canGenerate = !!candidate?.status && ['reviewing', 'ready', 'generated'].includes(candidate.status);
    const hasAnalysis = !!positioning.analysis;

    if (!canGenerate || !hasExtractedData) {
      return NextResponse.json(
        { error: "Le CV est en cours d'extraction. La génération est en attente." },
        { status: 409 },
      );
    }

    if (!hasAnalysis) {
      return NextResponse.json(
        { error: "L'analyse du positionnement n'est pas encore terminée." },
        { status: 409 },
      );
    }

    if (positioning.status === 'generating') {
      return NextResponse.json(
        { error: 'Génération en cours ou état incohérent. Rafraîchissez la page.' },
        { status: 409 },
      );
    }

    const run = await start(positioningGenerateWorkflow, [positioningId, answers ?? {}, generateMode]);

    await supabase
      .from('positionings')
      .update({ workflow_run_id: run.runId, status: 'generating' })
      .eq('id', positioningId);

    return new Response(run.readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'x-workflow-run-id': run.runId,
      },
    });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Positioning generate error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
