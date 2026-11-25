import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * En-tête de page de l'UI produit (voir DESIGN.md § « UI produit »).
 *
 * Un seul `h1` par page, en Geist 600, sans surtitre, sans icône lumineuse,
 * sans dégradé. Le fil d'Ariane de la coque (`AppHeader`) dit déjà où l'on est :
 * l'en-tête de page dit *quoi* (le titre), *en un mot* (la description), et
 * *quoi faire* (les actions, une seule primaire). La zone `status` est l'endroit
 * fixe où l'état d'un travail de l'IA s'affiche (`WorkflowStepList`, `Alert`),
 * toujours sous le titre, jamais ailleurs dans la page.
 */
export type PageHeaderProps = {
  /** Titre de la page : le nom de l'objet (candidat, mission) quand il existe. */
  title: ReactNode;
  /** Une phrase, en français, sous le titre. */
  description?: ReactNode;
  /** Faits courts en chiffres (date, fichier, durée), rendus en Geist Mono. */
  meta?: ReactNode;
  /** Boutons alignés à droite : une seule variante `default`, les autres `outline` ou `ghost`. */
  actions?: ReactNode;
  /** État du travail en cours (IA, sauvegarde) : pleine largeur, sous le titre. */
  status?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  meta,
  actions,
  status,
  className,
}: PageHeaderProps): React.JSX.Element {
  return (
    <header className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
          {meta ? (
            <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{meta}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {status ? <div className="min-w-0">{status}</div> : null}
    </header>
  );
}
