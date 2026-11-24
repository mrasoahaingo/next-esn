'use client';

import { useMemo } from 'react';
import type { PositioningAnalysis } from '@/lib/schema';
import { Skeleton } from '@/components/ui/skeleton';
import { computeCategoryCoverage, type CategoryCoverage } from './matching-readout';

interface MatchingReadoutProps {
  analysis: Partial<PositioningAnalysis> | null;
  isAnalyzing: boolean;
}

const SEGMENTS: ReadonlyArray<{
  key: 'strong' | 'partial' | 'missing';
  label: string;
  className: string;
}> = [
  { key: 'strong', label: 'Fort', className: 'bg-primary' },
  { key: 'partial', label: 'Partiel', className: 'bg-primary/60' },
  { key: 'missing', label: 'Manquant', className: 'bg-primary/30' },
];

function describeRow(row: CategoryCoverage): string {
  return `${row.category} : ${row.strong} fort${row.strong > 1 ? 's' : ''}, ${row.partial} partiel${
    row.partial > 1 ? 's' : ''
  }, ${row.missing} manquant${row.missing > 1 ? 's' : ''} sur ${row.total}`;
}

function CoverageBar({ row }: { row: CategoryCoverage }) {
  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm text-foreground">{row.category}</span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {row.coveragePercent} %
        </span>
      </div>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={describeRow(row)}
      >
        {SEGMENTS.map((seg) => {
          const count = row[seg.key];
          if (count === 0) return null;
          return (
            <span
              key={seg.key}
              className={seg.className}
              style={{ width: `${(count / row.total) * 100}%` }}
            />
          );
        })}
      </div>
    </li>
  );
}

/**
 * Panneau de droite de l'étape 1 : une barre par catégorie de compétence, une seule
 * teinte (`primary`) dont la clarté dit le niveau. Rien d'autre : lacunes et
 * expériences restent dans la colonne de gauche.
 */
export function MatchingReadout({ analysis, isAnalyzing }: MatchingReadoutProps) {
  const rows = useMemo(
    () => computeCategoryCoverage(analysis?.skillMatches ?? []),
    [analysis?.skillMatches],
  );

  return (
    <section
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
      aria-labelledby="matching-readout-heading"
    >
      <div className="flex flex-col gap-1">
        <h2 id="matching-readout-heading" className="text-[0.9375rem] font-semibold text-foreground">
          Lecture du matching
        </h2>
        <p className="text-xs text-muted-foreground">
          Couverture des compétences attendues, par catégorie.
        </p>
      </div>

      {rows.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <CoverageBar key={row.category} row={row} />
          ))}
        </ul>
      ) : isAnalyzing ? (
        <ul className="flex flex-col gap-4" aria-busy="true" aria-label="Analyse des compétences en cours">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-1/3 animate-none" />
              <Skeleton className="h-2 w-full animate-none rounded-full" />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Les barres apparaîtront après l’analyse.</p>
      )}

      {rows.length > 0 ? (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
          {SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <dt className="sr-only">{seg.label}</dt>
              <span className={`inline-block h-2 w-4 rounded-full ${seg.className}`} aria-hidden />
              <dd>{seg.label}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
