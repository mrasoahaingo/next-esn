import type { ComponentProps, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Panneau de l'UI produit (DESIGN.md § Révision v2) : la brique de toute page de l'app.
 * Un bloc de contenu = un panneau sur la toile (`bg-shell`), avec un en-tête sur une
 * ligne (icône, titre, compteur, action à droite) et un corps. Un seul niveau : pas
 * de panneau dans un panneau.
 */
export function Panel({ className, ...props }: ComponentProps<'section'>): React.JSX.Element {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-border bg-panel shadow-sm dark:shadow-none',
        className,
      )}
      {...props}
    />
  );
}

export type PanelHeaderProps = {
  title: ReactNode;
  /** Icône lucide, 16 px, en `muted-foreground`. */
  icon?: LucideIcon;
  /** Compteur ou précision courte, en mono à côté du titre (« 23 », « 3 en cours »). */
  count?: ReactNode;
  /** Une phrase sous le titre, 12 px. */
  description?: ReactNode;
  /** Action(s) à droite : `Button` `ghost` / `outline` `sm`, ou un lien. */
  actions?: ReactNode;
  /** Niveau du titre (h2 par défaut). */
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
};

export function PanelHeader({
  title,
  icon: Icon,
  count,
  description,
  actions,
  as: Heading = 'h2',
  id,
  className,
}: PanelHeaderProps): React.JSX.Element {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-4 border-b border-border px-4 py-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <Heading id={id} className="truncate text-sm font-semibold text-foreground">
              {title}
            </Heading>
            {count != null ? (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {count}
              </span>
            ) : null}
          </div>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </header>
  );
}

export function PanelBody({
  className,
  padded = true,
  ...props
}: ComponentProps<'div'> & { padded?: boolean }): React.JSX.Element {
  return <div className={cn('min-w-0 flex-1', padded && 'p-4', className)} {...props} />;
}

/** Pied de panneau optionnel : une ligne de méta ou un lien « Voir tout ». */
export function PanelFooter({ className, ...props }: ComponentProps<'div'>): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-t border-border px-4 py-2.5 text-xs text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
