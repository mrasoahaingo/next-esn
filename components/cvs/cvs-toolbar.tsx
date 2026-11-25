'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CV_FILTERS, cvFilterLabel, type CvFilter } from './cvs-list';

/**
 * Barre d'outils de la liste des CV : recherche sur le nom et le titre, chips
 * de filtre par statut avec compteurs. Les deux se combinent.
 */
export function CvsToolbar({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  counts,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  filter: CvFilter;
  onFilterChange: (value: CvFilter) => void;
  counts: Record<CvFilter, number>;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Nom, titre…"
          aria-label="Rechercher un candidat"
          className="bg-panel pl-8"
        />
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par statut">
        {CV_FILTERS.map((f) => {
          const active = f === filter;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={active}
              onClick={() => onFilterChange(f)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none',
                active
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-panel text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {cvFilterLabel(f)}
              <span className={cn('font-mono tabular-nums', active ? 'text-primary/80' : 'text-muted-foreground/80')}>
                {counts[f]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
