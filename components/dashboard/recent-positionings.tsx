import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { scoreToneText } from '@/lib/utils/score-tone';
import { cn } from '@/lib/utils';
import { ChartEmpty } from './chart-empty';
import { candidateDisplayName, formatShortDate, jobTitleFromDescription, plural } from './dashboard-format';
import { POSITIONING_STATUS_LABEL, type DashboardPositioning } from './dashboard-stats';
import { SectionHeading } from './section-heading';

/**
 * Derniers positionnements analysés, en liste sur le papier. Chaque ligne est
 * un lien entier : score en mono coloré par `scoreTone()`, « Candidat →
 * Mission », date courte, statut.
 */
export function RecentPositionings({
  items,
  analyzedCount,
}: {
  items: DashboardPositioning[];
  analyzedCount: number;
}): React.JSX.Element {
  return (
    <section aria-labelledby="recent-positionings-title">
      <SectionHeading
        id="recent-positionings-title"
        title="Derniers positionnements"
        meta={analyzedCount > 0 ? `${analyzedCount} ${plural(analyzedCount, 'analysé')}` : undefined}
      />
      {items.length === 0 ? (
        <ChartEmpty
          title="Aucun positionnement analysé."
          description="Créez un positionnement depuis la fiche d’un candidat : il apparaîtra ici avec son score."
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((p) => {
            const score = p.analysis?.matchScore ?? 0;
            const name = p.candidates ? candidateDisplayName(p.candidates.extracted_data) : 'Candidat';
            const status = POSITIONING_STATUS_LABEL[p.status] ?? POSITIONING_STATUS_LABEL.draft;
            return (
              <li key={p.id}>
                <Link
                  href={`/review/${p.candidate_id}/positioning/${p.id}`}
                  className="-mx-2 flex items-center gap-4 rounded-md px-2 py-3 transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  <span
                    className={cn(
                      'w-9 shrink-0 font-mono text-lg font-semibold tabular-nums',
                      scoreToneText(score),
                    )}
                  >
                    <span className="sr-only">Score </span>
                    {score}
                    <span className="sr-only"> sur 100</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {name}
                      <span className="font-normal text-muted-foreground"> → {jobTitleFromDescription(p.job_description)}</span>
                    </span>
                    <span className="mt-0.5 block font-mono text-xs tabular-nums text-muted-foreground">
                      {formatShortDate(p.created_at)}
                    </span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {status}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
