import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChartEmpty } from './chart-empty';
import { formatShortDate, plural } from './dashboard-format';
import type { PipelineStage, ToReviewItem } from './dashboard-stats';
import { SectionHeading } from './section-heading';

/** Une clarté de `primary` par étape, dans l'ordre du flux : plus le CV avance, plus la barre est pleine. */
const STAGE_FILL = ['bg-primary/30', 'bg-primary/45', 'bg-primary/60', 'bg-primary/80', 'bg-primary'] as const;

/**
 * Pipeline des CV (statut → compteur, une barre par statut), suivi de la liste
 * « À reprendre » quand des CV ou des positionnements sont en cours ou en échec.
 */
export function CvPipeline({
  stages,
  totalCvs,
  toReview,
}: {
  stages: PipelineStage[];
  totalCvs: number;
  toReview: ToReviewItem[];
}): React.JSX.Element {
  return (
    <div className="space-y-8">
      <section aria-labelledby="cv-pipeline-title">
        <SectionHeading
          id="cv-pipeline-title"
          title="Pipeline des CV"
          meta={totalCvs > 0 ? `${totalCvs} CV` : undefined}
        />
        {totalCvs === 0 ? (
          <ChartEmpty title="Aucun CV importé." description="Les CV importés avancent ici, de l’extraction au PDF." />
        ) : (
          <ol className="mt-3 space-y-3">
            {stages.map((stage, index) => (
              <li key={stage.key}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-foreground">{stage.label}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{stage.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div
                    className={cn('h-full rounded-full', STAGE_FILL[index] ?? 'bg-primary')}
                    style={{ width: `${stage.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {toReview.length > 0 ? (
        <section aria-labelledby="to-review-title">
          <SectionHeading
            id="to-review-title"
            title="À reprendre"
            meta={`${toReview.length} ${plural(toReview.length, 'élément')}`}
          />
          <ul className="divide-y divide-border">
            {toReview.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={item.href}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">
                      {item.kind === 'cv' ? 'CV' : 'Positionnement'}
                      {item.candidateName ? ` · ${item.candidateName}` : ''}
                    </span>
                    <span
                      className={cn(
                        'block text-xs',
                        item.tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
                      )}
                    >
                      {item.reason}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {formatShortDate(item.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
