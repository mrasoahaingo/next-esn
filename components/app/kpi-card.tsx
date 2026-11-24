import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Carte de chiffre clé (DESIGN.md § Révision v2) : libellé, valeur en mono,
 * une sous-ligne. Quatre par rangée sur le tableau de bord. Pas d'icône dans un
 * carré coloré : l'icône, si elle est là, est à côté du libellé, en gris.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  valueClassName,
  className,
}: {
  label: ReactNode;
  /** La valeur, ou « — » sans donnée. */
  value: ReactNode;
  /** Sous-ligne : tendance, détail, formule (12 px, gris). */
  hint?: ReactNode;
  icon?: LucideIcon;
  valueClassName?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-panel p-4 shadow-sm dark:shadow-none',
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          'font-mono text-2xl font-semibold tabular-nums tracking-[-0.01em] text-foreground',
          valueClassName,
        )}
      >
        {value}
      </div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
