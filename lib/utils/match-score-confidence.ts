import type { PositioningAnalysis } from '@/lib/schema';

export type MatchScoreConfidenceLevel = NonNullable<PositioningAnalysis['matchScoreConfidence']>;

export function matchScoreConfidenceShortLabel(
  c: MatchScoreConfidenceLevel | null | undefined,
): string {
  if (c === 'low') return 'Faible';
  if (c === 'medium') return 'Moyenne';
  if (c === 'high') return 'Élevée';
  return 'Non évaluée';
}

export function matchScoreConfidenceBadgeClass(
  c: MatchScoreConfidenceLevel | null | undefined,
): string {
  if (c === 'high') return 'border-neon/30 bg-neon/10 text-neon';
  if (c === 'medium') return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200';
  if (c === 'low') return 'border-destructive/35 bg-destructive/10 text-destructive';
  return 'border-border bg-muted/40 text-muted-foreground';
}
