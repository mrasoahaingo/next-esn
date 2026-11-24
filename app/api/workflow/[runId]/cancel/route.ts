import { getWorld } from 'workflow/runtime';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/utils/supabase';
import { requireOrgId } from '@/lib/utils/auth';
import { logSupabaseWriteError } from '@/lib/utils/supabase-write-error';

const ALLOWED_TABLES = ['candidates', 'positionings', 'missions'] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    await requireOrgId();
    const { runId } = await params;
    const body = await request.json().catch(() => ({}));
    const { table, recordId, resetStatus } = body as {
      table?: string;
      recordId?: string;
      resetStatus?: string;
    };

    if (table && !ALLOWED_TABLES.includes(table as AllowedTable)) {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    const world = getWorld();
    const run = await world.runs.get(runId, { resolveData: 'none' });
    const runStatus = await run.status;

    const isTerminal =
      runStatus === 'completed' || runStatus === 'failed' || runStatus === 'cancelled';

    if (!isTerminal) {
      try {
        await world.events.create(runId, {
          eventType: 'run_cancelled',
          specVersion: run.specVersion ?? 1,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const httpStatus = (e as { status?: number }).status;
        const alreadyTerminal =
          httpStatus === 409 ||
          msg.includes('terminal') ||
          msg.includes('Cannot transition');
        if (!alreadyTerminal) {
          throw e;
        }
      }
    }

    const supabase = getSupabase();

    // Analyse fiche de poste (mission) : pas de colonne status
    // À ce stade le run workflow a déjà été annulé côté runtime. Une erreur levée ci-dessous
    // signale donc que LA LIGNE n'a pas été réinitialisée — pas que l'annulation du run a
    // échoué. Relancer l'annulation est idempotent : le bloc `isTerminal` / `alreadyTerminal`
    // ci-dessus absorbe le second passage. Sans ce contrôle, supabase-js renverrait son
    // `{ error }` dans le vide et le handler confirmerait `{ status: 'cancelled' }` au client
    // alors que la ligne reste bloquée sur son ancien statut.
    if (table === 'missions' && recordId) {
      const { error } = await supabase
        .from('missions')
        .update({ job_analysis_workflow_run_id: null })
        .eq('id', recordId);

      if (error) {
        logSupabaseWriteError({
          table: 'missions',
          recordId,
          operation: 'workflow.cancel.missions',
          supabaseError: error,
        });
        throw new Error(
          'Annulation effectuée mais la mission n’a pas pu être réinitialisée : ' + error.message,
        );
      }
    } else if (table && recordId && resetStatus) {
      const { error } = await supabase
        .from(table)
        .update({ status: resetStatus, workflow_run_id: null })
        .eq('id', recordId);

      if (error) {
        logSupabaseWriteError({
          table,
          recordId,
          operation: 'workflow.cancel.reset-status',
          supabaseError: error,
        });
        throw new Error(
          'Annulation effectuée mais la ligne n’a pas pu être réinitialisée : ' + error.message,
        );
      }
    }

    return NextResponse.json({ status: 'cancelled' });
  } catch (error: unknown) {
    if (error instanceof NextResponse) return error;
    console.error('Workflow cancel error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
