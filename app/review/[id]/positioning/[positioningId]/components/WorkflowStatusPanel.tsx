'use client';

import { Sparkles } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import { WorkflowFailureAlert } from '@/components/workflow/WorkflowFailureAlert';
import type { StepStateRow } from '@/lib/workflow/compute-step-status';
import { formatDuration } from '@/lib/utils/format';
import { CollapsiblePanel } from './CollapsiblePanel';

export type WorkflowStatusPanelProps = {
  kind: 'analysis' | 'generation';
  state: 'running' | 'failed' | 'done';
  rows: StepStateRow[];
  summaryLine: string | null;
  /** En échec : titre, message présentable et relance. */
  failure?: {
    title: string;
    message: string;
    onRetry?: () => void;
    retryLabel?: string;
    retryDisabled?: boolean;
  };
  /** Terminé : durée persistée en ms. Sans elle, pas de durée affichée (aucun chiffre inventé). */
  durationMs?: number | null;
};

const TITLE: Record<WorkflowStatusPanelProps['kind'], string> = {
  analysis: 'Analyse du matching',
  generation: 'Génération',
};

const DONE_LABEL: Record<WorkflowStatusPanelProps['kind'], string> = {
  analysis: 'Terminée',
  generation: 'Terminée',
};

function stepsCount(rows: StepStateRow[]): string {
  const done = rows.filter((r) => r.status === 'done').length;
  return `${done} / ${rows.length} étapes`;
}

/**
 * Zone d'état de l'IA (DESIGN.md § L'état de l'IA, matière v2) : un panneau compact
 * sous l'en-tête de page. En cours : étapes et pastille qui respire ; en échec :
 * l'alerte avec « Réessayer » ; terminé : replié en une ligne (durée en mono), le
 * détail des étapes dans le `<details>`. Un seul `WorkflowStepList` par travail.
 */
export function WorkflowStatusPanel({
  kind,
  state,
  rows,
  summaryLine,
  failure,
  durationMs,
}: WorkflowStatusPanelProps): React.JSX.Element {
  const title = TITLE[kind];

  if (state === 'done') {
    return (
      <CollapsiblePanel
        icon={Sparkles}
        title={title}
        count={`${rows.length} étape${rows.length > 1 ? 's' : ''}`}
        aside={
          <>
            {durationMs != null && durationMs > 0 ? (
              <span className="font-mono tabular-nums">{formatDuration(durationMs)}</span>
            ) : null}
            <StatusBadge tone="ok">{DONE_LABEL[kind]}</StatusBadge>
          </>
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
        title={title}
        count={stepsCount(rows)}
        actions={
          state === 'failed' ? (
            <StatusBadge tone="err">Échec</StatusBadge>
          ) : (
            <StatusBadge tone="info" pulse>
              En cours
            </StatusBadge>
          )
        }
      />
      <PanelBody>
        {state === 'failed' && failure ? (
          <WorkflowFailureAlert
            title={failure.title}
            message={failure.message}
            rows={rows}
            summaryLine={summaryLine}
            onRetry={failure.onRetry}
            retryLabel={failure.retryLabel}
            retryDisabled={failure.retryDisabled}
          />
        ) : (
          <WorkflowStepList rows={rows} summaryLine={summaryLine} />
        )}
      </PanelBody>
    </Panel>
  );
}
