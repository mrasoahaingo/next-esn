import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Titre de section du tableau de bord : un `h2` posé sur un filet, avec une
 * méta en mono à droite (compteur, couverture). Pas d'icône, pas de carte.
 */
export function SectionHeading({
  title,
  meta,
  id,
  className,
}: {
  title: string;
  meta?: ReactNode;
  id?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex items-baseline justify-between gap-4 border-b border-border pb-2', className)}>
      <h2 id={id} className="text-[0.9375rem] font-semibold text-foreground">
        {title}
      </h2>
      {meta ? (
        <p className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{meta}</p>
      ) : null}
    </div>
  );
}
