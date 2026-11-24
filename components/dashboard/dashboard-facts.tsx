'use client';

import { ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDurationMs, formatDurationSeconds, formatTimeSaved, plural } from './dashboard-format';
import { MINUTES_SAVED_PER_CV, type DashboardStats } from './dashboard-stats';

const NO_VALUE = '—';

/**
 * Ligne de faits du tableau de bord : une `dl` horizontale entre deux filets,
 * quatre chiffres en mono. « Temps gagné » garde la formule dans son
 * info-bulle ; le détail par opération vit dans un `<details>` dessous.
 */
export function DashboardFacts({ stats }: { stats: DashboardStats }): React.JSX.Element {
  const { timeByOperation: time } = stats;

  return (
    <div>
      <dl className="grid grid-cols-2 gap-x-6 border-y border-border sm:flex sm:gap-0 sm:divide-x sm:divide-border">
        <Fact label="CV analysés" value={String(stats.totalCvs)} />
        <Fact label="Positionnements" value={String(stats.totalPositionings)} />
        <Fact
          label="Score moyen"
          value={stats.avgScore == null ? NO_VALUE : `${stats.avgScore} %`}
          hint={stats.avgScore == null ? 'Aucun positionnement analysé' : undefined}
        />
        <Fact
          label={
            <Tooltip>
              <TooltipTrigger className="cursor-help rounded-sm underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                Temps gagné
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {stats.timeSavedMinutes == null ? (
                  <p>
                    Aucun CV extrait pour l&rsquo;instant. Formule&nbsp;: {MINUTES_SAVED_PER_CV}&nbsp;min
                    d&rsquo;édition manuelle estimée par CV extrait.
                  </p>
                ) : (
                  <p>
                    {stats.extractedCvs} {plural(stats.extractedCvs, 'CV extrait')} × {MINUTES_SAVED_PER_CV}
                    &nbsp;min = {formatTimeSaved(stats.timeSavedMinutes)}. Compte les CV en relecture, prêts ou
                    générés.
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          }
          value={stats.timeSavedMinutes == null ? NO_VALUE : formatTimeSaved(stats.timeSavedMinutes)}
        />
      </dl>

      {time.totalMinutes > 0 ? (
        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm font-mono text-xs tabular-nums text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-3.5 transition-transform duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            Temps par opération · total {formatTimeSaved(time.totalMinutes)}
          </summary>
          <dl className="mt-3 max-w-md divide-y divide-border text-sm">
            <TimeRow label="Extraction IA" value={time.aiExtractionMs > 0 ? formatDurationMs(time.aiExtractionMs) : null} />
            <TimeRow label="Analyse IA" value={time.aiAnalysisMs > 0 ? formatDurationMs(time.aiAnalysisMs) : null} />
            <TimeRow
              label="Génération IA"
              value={time.aiGenerationMs > 0 ? formatDurationMs(time.aiGenerationMs) : null}
            />
            <TimeRow
              label="Relecture des CV"
              value={time.userReviewSeconds > 0 ? formatDurationSeconds(time.userReviewSeconds) : null}
            />
            <TimeRow
              label="Édition des positionnements"
              value={time.userPositioningSeconds > 0 ? formatDurationSeconds(time.userPositioningSeconds) : null}
            />
          </dl>
        </details>
      ) : null}
    </div>
  );
}

function Fact({
  label,
  value,
  hint,
}: {
  label: React.ReactNode;
  value: string;
  hint?: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-col-reverse gap-1 py-4 sm:px-6 sm:first:pl-0 sm:last:pr-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-mono text-2xl font-semibold tabular-nums tracking-[-0.01em]',
          value === NO_VALUE ? 'text-muted-foreground' : 'text-foreground',
        )}
        title={hint}
      >
        {value}
      </dd>
    </div>
  );
}

function TimeRow({ label, value }: { label: string; value: string | null }): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('font-mono text-xs tabular-nums', value ? 'text-foreground' : 'text-muted-foreground')}>
        {value ?? NO_VALUE}
      </dd>
    </div>
  );
}
