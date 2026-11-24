import { cn } from '@/lib/utils';

/**
 * État vide d'un bloc du tableau de bord (liste, graphique) : une ligne qui
 * nomme ce qui manque, une phrase sur ce qui le remplira. Sur le papier, sans
 * icône ni fond quadrillé.
 */
export function ChartEmpty({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('py-6 text-sm', className)}>
      <p className="font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
