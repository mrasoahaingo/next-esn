import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ProspectListItem } from '@/lib/radar/schemas';
import {
  detectVelocity,
  formatRelativeTime,
  getCompanyInitials,
  HEAT_LABELS,
  HEAT_STYLES,
  SOURCE_LABELS,
  SOURCE_STYLES,
} from '@/lib/radar/ui';

export function ProspectCard({ prospect }: { prospect: ProspectListItem }) {
  const pills = Object.entries(prospect.breakdown)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 4);

  const isVelocity = detectVelocity(prospect.breakdown, prospect.latestSignalAt);

  return (
    <Link href={`/radar/${prospect.companyId}`} className="block">
      <div className="rounded-lg border border-border/70 bg-card/80 p-4 shadow-sm transition-colors hover:border-border hover:bg-card backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium',
              HEAT_STYLES[prospect.heat],
            )}
          >
            {getCompanyInitials(prospect.companyName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <p className="truncate text-sm font-medium">{prospect.companyName}</p>
              {isVelocity ? (
                <span title="Plusieurs signaux détectés cette semaine" className="shrink-0 text-xs">
                  🔥
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {[prospect.sector, prospect.city].filter(Boolean).join(' · ') || 'Secteur non renseigné'}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div
              className={cn(
                'font-mono text-lg font-semibold tabular-nums',
                prospect.heat === 'burning'
                  ? 'text-red-700 dark:text-red-400'
                  : prospect.heat === 'hot'
                    ? 'text-orange-700 dark:text-orange-400'
                    : prospect.heat === 'warm'
                      ? 'text-amber-700 dark:text-amber-400'
                      : 'text-muted-foreground',
              )}
            >
              {prospect.score}
            </div>
            <div className="text-xs text-muted-foreground">
              {prospect.latestSignalAt ? formatRelativeTime(prospect.latestSignalAt) : 'score'}
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className={cn('inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium', HEAT_STYLES[prospect.heat])}>
            {HEAT_LABELS[prospect.heat].toLowerCase()}
          </span>
          {pills.map(([key, value]) => (
            <span
              key={key}
              className={cn(
                'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
                SOURCE_STYLES[key] ?? 'bg-muted text-muted-foreground',
              )}
            >
              {SOURCE_LABELS[key] ?? key} {value}
            </span>
          ))}
          {prospect.convergenceBonus > 0 ? (
            <span className={cn('inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium', SOURCE_STYLES.convergence)}>
              +{prospect.convergenceBonus} convergence
            </span>
          ) : null}
          {Object.keys(prospect.breakdown).length > 4 ? (
            <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              +{Object.keys(prospect.breakdown).length - 4}
            </span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {prospect.technologies.slice(0, 4).map((technology) => (
            <span
              key={technology}
              className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {technology}
            </span>
          ))}
          {prospect.technologies.length > 4 ? (
            <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              +{prospect.technologies.length - 4}
            </span>
          ) : null}
          {prospect.technologies.length === 0 ? (
            <span className="text-xs text-muted-foreground">Aucune techno remontée</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
