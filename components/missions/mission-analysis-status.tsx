'use client';

import { Sparkles, XCircle } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { Button } from '@/components/ui/button';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import { WorkflowFailureAlert } from '@/components/workflow/WorkflowFailureAlert';
import { CollapsiblePanel } from '@/app/review/[id]/positioning/[positioningId]/components/CollapsiblePanel';
import type { MissionJobAnalysisState } from './use-mission-job-analysis';

function stepsCount(rows: MissionJobAnalysisState['rows']): string {
  const done = rows.filter((r) => r.status === 'done').length;
  return `${done} / ${rows.length} étapes`;
}

/**
 * Zone `status` de l'en-tête de mission (DESIGN.md § L'état de l'IA, matière v2) :
 * l'analyse de la fiche, et rien d'autre. En cours : étapes, pastille qui
 * respire, « Annuler ». En échec : l'alerte avec l'étape fautive et « Relancer ».
 * Terminée : une ligne repliée (étapes dans le `<details>`), avec « Fiche
 * modifiée » quand l'analyse ne correspond plus au texte. À analyser : rien
 * (l'action est dans l'en-tête, la synthèse invite à lancer).
 */
export function MissionAnalysisStatus({ state }: { state: MissionJobAnalysisState }): React.JSX.Element | null {
  const { phase, rows, summaryLine, failureMessage, analyze, canAnalyze, cancel, isCancelling } = state;

  if (phase === 'todo') return null;

  if (phase === 'done' || phase === 'stale') {
    return (
      <CollapsiblePanel
        icon={Sparkles}
        title="Analyse de la fiche"
        count={`${rows.length} étape${rows.length > 1 ? 's' : ''}`}
        aside={
          phase === 'stale' ? (
            <StatusBadge tone="warn">Fiche modifiée</StatusBadge>
          ) : (
            <StatusBadge tone="ok">Terminée</StatusBadge>
          )
        }
      >
        <PanelBody>
          <WorkflowStepList rows={rows} summaryLine={summaryLine} />
        </PanelBody>
      </CollapsiblePanel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        icon={Sparkles}
        title="Analyse de la fiche"
        count={stepsCount(rows)}
        actions={
          phase === 'failed' ? (
            <StatusBadge tone="err">Échec</StatusBadge>
          ) : (
            <>
              {cancel ? (
                <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={isCancelling}>
                  <XCircle data-icon="inline-start" />
                  Annuler l’analyse
                </Button>
              ) : null}
              <StatusBadge tone="info" pulse>
                En cours
              </StatusBadge>
            </>
          )
        }
      />
      <PanelBody>
        {phase === 'failed' ? (
          <WorkflowFailureAlert
            title="L’analyse de la fiche n’a pas abouti"
            message={failureMessage ?? 'L’analyse de la fiche a échoué.'}
            rows={rows}
            summaryLine={summaryLine}
            onRetry={analyze}
            retryLabel="Relancer l’analyse"
            retryDisabled={!canAnalyze}
          />
        ) : (
          <WorkflowStepList rows={rows} summaryLine={summaryLine} />
        )}
      </PanelBody>
    </Panel>
  );
}
