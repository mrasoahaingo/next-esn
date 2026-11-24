import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Titre de section du formulaire (DESIGN.md § L'établi) : un `h2` 0.9375 rem / 600
 * posé sur un filet, l'action de section (« Ajouter une formation ») à droite.
 * Pas de carte, pas d'icône.
 */
export function SectionHeading({
  id,
  title,
  action,
  className,
}: {
  /** Identifiant du `h2`, pour `aria-labelledby` sur la `section`. */
  id?: string;
  title: string;
  action?: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-3 border-b border-border pb-2', className)}>
      <h2 id={id} className="text-[0.9375rem] font-semibold leading-6 text-foreground">
        {title}
      </h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Classe commune des libellés de champs : 0.75 rem, casse de phrase, gris. */
export const FIELD_LABEL_CLASS = 'text-xs font-medium text-muted-foreground';
