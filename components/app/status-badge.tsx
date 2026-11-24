import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type StatusTone = 'ok' | 'warn' | 'err' | 'info' | 'neutral';

const TONE_CLASS: Record<StatusTone, string> = {
  ok: 'border-success/30 bg-success/10 text-success',
  warn: 'border-warning/30 bg-warning/10 text-warning',
  err: 'border-destructive/30 bg-destructive/10 text-destructive',
  info: 'border-primary/30 bg-primary/10 text-primary',
  neutral: 'border-border bg-muted text-muted-foreground',
};

const DOT_CLASS: Record<StatusTone, string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  err: 'bg-destructive',
  info: 'bg-primary',
  neutral: 'bg-muted-foreground',
};

/**
 * Pastille de statut de l'UI produit : un point coloré et un mot (« Validé »,
 * « En relecture », « Échec »). Même pastille partout : tableau de bord, liste des
 * CV, barre latérale, positionnement. `pulse` marque un travail en cours (point
 * qui respire lentement, coupé en mouvement réduit) : c'est le seul mouvement admis.
 */
export function StatusBadge({
  tone = 'neutral',
  pulse = false,
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone?: StatusTone; pulse?: boolean }): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-xs font-medium',
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          DOT_CLASS[tone],
          pulse && 'animate-pulse motion-reduce:animate-none',
        )}
        aria-hidden
      />
      {children}
    </span>
  );
}
