import type { ReactNode } from 'react';
import { Upload, Workflow } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { cvStatus } from '@/components/cvs/cv-status';
import { cn } from '@/lib/utils';
import type { PipelineStage } from './dashboard-stats';
import { PanelEmpty } from './panel-empty';

/** Une clarté de `primary` par étape, dans l'ordre du flux : plus le CV avance, plus la barre est pleine. */
const STAGE_FILL = ['bg-primary/30', 'bg-primary/45', 'bg-primary/60', 'bg-primary/80', 'bg-primary'] as const;

/**
 * Pipeline des CV dans un panneau : pastille de statut → compteur en mono, une
 * barre par statut. La pastille « En extraction » respire quand un CV y est.
 */
export function CvPipeline({
  stages,
  totalCvs,
  emptyAction,
}: {
  stages: PipelineStage[];
  totalCvs: number;
  /** La zone de dépôt, affichée dans l'état vide. */
  emptyAction: ReactNode;
}): React.JSX.Element {
  return (
    <Panel aria-labelledby="cv-pipeline-title">
      <PanelHeader
        id="cv-pipeline-title"
        icon={Workflow}
        title="Pipeline des CV"
        count={totalCvs > 0 ? totalCvs : undefined}
      />
      <PanelBody padded={totalCvs > 0}>
        {totalCvs === 0 ? (
          <PanelEmpty
            icon={Upload}
            title="Aucun CV importé."
            description="Les CV importés avancent ici, de l’extraction au PDF."
            action={emptyAction}
          />
        ) : (
          <ol className="space-y-3">
            {stages.map((stage, index) => {
              const meta = cvStatus(stage.key);
              return (
                <li key={stage.key}>
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge tone={meta.tone} pulse={meta.pulse && stage.count > 0}>
                      {meta.label}
                    </StatusBadge>
                    <span className="font-mono text-sm tabular-nums text-foreground">{stage.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div
                      className={cn('h-full rounded-full', STAGE_FILL[index] ?? 'bg-primary')}
                      style={{ width: `${stage.pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </PanelBody>
    </Panel>
  );
}
