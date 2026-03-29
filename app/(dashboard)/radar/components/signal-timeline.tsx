import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProspectSignal } from '@/lib/radar/schemas';
import { cn } from '@/lib/utils';
import { formatRelativeTime, getSignalSummary, SOURCE_SHORT_LABELS, SOURCE_STYLES } from '@/lib/radar/ui';

export function SignalTimeline({ signals }: { signals: ProspectSignal[] }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
          Signal timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {signals.map((signal) => (
          <div
            key={signal.id}
            className="flex gap-3 border-b border-border/60 py-3 last:border-0"
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-medium',
                SOURCE_STYLES[signal.source],
              )}
            >
              {SOURCE_SHORT_LABELS[signal.source] ?? signal.source.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{signal.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {getSignalSummary(signal) || signal.rawContent?.slice(0, 120) || 'Signal detecte'}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-sm font-medium">+{signal.weight} pts</div>
              <div className="text-xs text-muted-foreground">{formatRelativeTime(signal.detectedAt)}</div>
            </div>
          </div>
        ))}
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun signal actif.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
