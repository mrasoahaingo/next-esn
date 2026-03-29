import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SOURCE_LABELS, SOURCE_STYLES } from '@/lib/radar/ui';

export function ScoreBreakdown({
  breakdown,
  convergenceBonus,
}: {
  breakdown: Record<string, number>;
  convergenceBonus: number;
}) {
  const entries: Array<[string, number]> = Object.entries(breakdown).sort(([, left], [, right]) => right - left);
  const subtotal = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
          Score breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map(([label, value], index) => (
          <div key={label} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm">
            <span className="truncate text-muted-foreground">{SOURCE_LABELS[label] ?? label}</span>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 ease-out',
                  SOURCE_STYLES[label]?.split(' ')[0] ?? 'bg-muted-foreground/40',
                )}
                style={{
                  width: `${Math.min(100, (value / 25) * 100)}%`,
                  transitionDelay: `${index * 50}ms`,
                }}
              />
            </div>
            <span className="text-right font-mono text-sm tabular-nums">{value}</span>
          </div>
        ))}

        <div className="border-t border-border/70 pt-3" />
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Sous-total: {subtotal} pts</span>
          <span className="inline-flex items-center rounded-md bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-200">
            Bonus convergence: +{convergenceBonus} pts
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
