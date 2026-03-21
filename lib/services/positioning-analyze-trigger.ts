import { start, getRun } from 'workflow/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import { positioningAnalyzeWorkflow } from '@/workflows/positioning-analyze';

type PositioningRow = {
  id: string;
  status: string | null;
  mission_id: string | null;
  workflow_run_id: string | null;
  candidate_id: string;
  candidates: {
    status?: string | null;
    extracted_data?: Record<string, unknown> | null;
  } | null;
};

function candidateReadyForAnalysis(
  candidate: PositioningRow['candidates'],
): candidate is NonNullable<PositioningRow['candidates']> {
  if (!candidate?.status) return false;
  if (!['reviewing', 'ready', 'generated'].includes(candidate.status)) return false;
  const ed = candidate.extracted_data;
  return !!ed && typeof ed === 'object' && Object.keys(ed).length > 0;
}

/** Démarre l’analyse pour un positioning mission en brouillon (CV prêt). */
export async function triggerMissionPositioningAnalysis(
  supabase: SupabaseClient,
  positioningId: string,
): Promise<void> {
  const { data: p, error } = await supabase
    .from('positionings')
    .select('id, status, mission_id, candidate_id, candidates(status, extracted_data)')
    .eq('id', positioningId)
    .single();

  if (error || !p) return;
  const row = p as unknown as PositioningRow;
  if (!row.mission_id || row.status !== 'draft') return;
  if (!candidateReadyForAnalysis(row.candidates)) return;

  const run = await start(positioningAnalyzeWorkflow, [positioningId]);
  await supabase
    .from('positionings')
    .update({ workflow_run_id: run.runId, status: 'analyzing' })
    .eq('id', positioningId);
}

/** Après extraction : lancer l’analyse pour tous les positionnements mission encore en draft pour ce candidat. */
export async function triggerMissionAnalysesAfterExtract(
  supabase: SupabaseClient,
  candidateId: string,
): Promise<void> {
  const { data: rows } = await supabase
    .from('positionings')
    .select('id')
    .eq('candidate_id', candidateId)
    .not('mission_id', 'is', null)
    .eq('status', 'draft');

  for (const row of rows ?? []) {
    await triggerMissionPositioningAnalysis(supabase, row.id as string);
  }
}

/** Réponse HTTP pour POST /api/positioning/analyze : rattachement au run en cours ou démarrage. */
export async function respondPositioningAnalyzePost(
  supabase: SupabaseClient,
  positioningId: string,
): Promise<Response> {
  const { data: positioning, error: positioningError } = await supabase
    .from('positionings')
    .select('id, status, workflow_run_id, candidate_id, candidates(status, extracted_data)')
    .eq('id', positioningId)
    .single();

  if (positioningError || !positioning) {
    return Response.json({ error: 'Positioning not found' }, { status: 404 });
  }

  const row = positioning as unknown as PositioningRow;
  const candidate = row.candidates;

  if (row.status === 'analyzed') {
    return Response.json({ error: 'Ce positionnement est déjà analysé.' }, { status: 409 });
  }

  if (row.status === 'analyzing' && row.workflow_run_id) {
    const run = getRun(row.workflow_run_id);
    if (await run.exists) {
      const st = await run.status;
      if (st !== 'completed' && st !== 'failed' && st !== 'cancelled') {
        return new Response(run.getReadable({ startIndex: 0 }), {
          headers: {
            'Content-Type': 'application/x-ndjson',
            'x-workflow-run-id': row.workflow_run_id,
          },
        });
      }
    }
  }

  if (!candidateReadyForAnalysis(candidate)) {
    return Response.json(
      { error: "Le CV est en cours d'extraction. L'analyse du positionnement est en attente." },
      { status: 409 },
    );
  }

  const run = await start(positioningAnalyzeWorkflow, [positioningId]);

  await supabase
    .from('positionings')
    .update({ workflow_run_id: run.runId, status: 'analyzing' })
    .eq('id', positioningId);

  return new Response(run.readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'x-workflow-run-id': run.runId,
    },
  });
}
