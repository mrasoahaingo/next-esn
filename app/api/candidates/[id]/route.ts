import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { logSupabaseWriteError } from '@/lib/utils/supabase-write-error';
import {
  CANDIDATE_STORAGE_BUCKETS,
  collectCandidateStorageObjects,
} from '@/lib/utils/candidate-storage';
import {
  reconcileWorkflowRecord,
  type WorkflowReconcileRow,
} from '@/lib/services/workflow-reconcile';

const updateCandidateSchema = z.object({
  extracted_data: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['uploaded', 'extracting', 'reviewing', 'ready', 'generated']).optional(),
}).strict();

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireOrgId();
    const params = await props.params;
    const { id } = params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Garde-fou anti-zombie : la lecture est le moment où l’utilisateur regarde l’état.
    if ((data.status === 'uploaded' || data.status === 'extracting') && data.workflow_run_id) {
      const decision = await reconcileWorkflowRecord({
        supabase,
        table: 'candidates',
        row: data as WorkflowReconcileRow,
      });
      if (decision.action === 'settle') {
        return NextResponse.json({
          ...data,
          status: decision.status,
          workflow_run_id: null,
          workflow_last_error: null,
        });
      }
      if (decision.action === 'fail') {
        return NextResponse.json({
          ...data,
          status: 'error',
          workflow_run_id: null,
          workflow_last_error: decision.workflowLastError,
        });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireOrgId();
    const params = await props.params;
    const { id } = params;
    const supabase = getSupabase();

    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('id, original_file_url, formatted_file_url')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!candidate) return NextResponse.json({ error: 'Candidat introuvable' }, { status: 404 });

    const { data: positioningFiles, error: positioningFilesError } = await supabase
      .from('positionings')
      .select('tailored_file_url')
      .eq('candidate_id', id)
      .eq('org_id', orgId);

    if (positioningFilesError) throw positioningFilesError;

    // Droit à l'effacement : les fichiers partent AVANT les lignes. Si le stockage échoue, rien
    // n'est supprimé et l'erreur remonte (l'utilisateur peut réessayer : effacer un objet déjà
    // absent ne lève pas). L'ordre inverse laisserait des PDF orphelins que plus rien ne référence.
    const storageObjects = collectCandidateStorageObjects({
      orgId,
      candidate,
      positionings: positioningFiles ?? [],
    });
    for (const bucket of CANDIDATE_STORAGE_BUCKETS) {
      const paths = storageObjects[bucket];
      if (paths.length === 0) continue;
      const { error: storageError } = await supabase.storage.from(bucket).remove(paths);
      if (storageError) {
        logSupabaseWriteError({
          table: `storage:${bucket}`,
          recordId: id,
          operation: 'candidate.delete.removeFiles',
          supabaseError: storageError,
        });
        throw new Error('Impossible d’effacer les fichiers du candidat. Rien n’a été supprimé, réessayez.');
      }
    }

    // Best-effort assumé : si cette purge échoue, la suppression du candidat juste après
    // échouera elle aussi (contrainte FK) ou laissera des positionnements orphelins. Le log est
    // le seul signal — supabase-js ne lève pas.
    const { error: cascadeError } = await supabase
      .from('positionings')
      .delete()
      .eq('candidate_id', id)
      .eq('org_id', orgId);

    if (cascadeError) {
      logSupabaseWriteError({
        table: 'positionings',
        recordId: id,
        operation: 'candidate.delete.cascadePositionings',
        supabaseError: cascadeError,
      });
    }

    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = await requireOrgId();
    const params = await props.params;
    const { id } = params;
    const parsed = updateCandidateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('candidates')
      .update(parsed.data)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof NextResponse) return error;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
