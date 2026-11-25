import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { cn } from '@/lib/utils';

export type CvSectionStatus = 'pending' | 'streaming' | 'done';

export type CvSectionPanelProps = {
  /** Identifiant du titre, pour `aria-labelledby` sur le panneau. */
  id: string;
  title: string;
  icon: LucideIcon;
  /** Compteur en mono à côté du titre (« 24 », « 3 »). */
  count?: ReactNode;
  /** Action de section à droite de l'en-tête (« Ajouter » en `ghost` `sm`). */
  actions?: ReactNode;
  /** `streaming` : pastille « En cours » dans l'en-tête, filet gauche sur le contenu. */
  status?: CvSectionStatus;
  /** Corps sans padding (listes `divide-y` qui gèrent leur propre `px-4`). */
  flush?: boolean;
  /** Pied de panneau (curseur de marge). */
  footer?: ReactNode;
  /**
   * Dans un panneau parent (onglets du dossier) : en-tête en simple ligne (titre, compteur,
   * pastille, action), corps et pied sans bordure ni fond, pour qu'il n'y ait qu'un contour.
   */
  embedded?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Panneau d'une section du dossier CV (DESIGN.md § Révision v2) : en-tête sur une
 * ligne (icône, titre, compteur, action), corps, pied optionnel. Pendant le flux,
 * la section en cours porte une pastille `info` qui respire et un filet gauche
 * `primary` sur son contenu ; une fois finie, rien de plus : le contenu est là.
 */
export function CvSectionPanel({
  id,
  title,
  icon,
  count,
  actions,
  status = 'done',
  flush = false,
  footer,
  embedded = false,
  className,
  children,
}: CvSectionPanelProps): React.JSX.Element {
  const streaming = status === 'streaming';
  const badge = streaming ? (
    <StatusBadge tone="info" pulse>
      En cours
    </StatusBadge>
  ) : null;
  const body = streaming && !flush ? <div className="border-l-2 border-primary pl-4">{children}</div> : children;

  if (embedded) {
    return (
      <section aria-labelledby={id} aria-busy={streaming || undefined} className={cn('flex min-w-0 flex-col', className)}>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <h3 id={id} className="truncate text-sm font-semibold text-foreground">
              {title}
            </h3>
            {count != null ? (
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {count}
              </span>
            ) : null}
          </div>
          {badge || actions ? (
            <div className="flex shrink-0 items-center gap-1.5">
              {badge}
              {actions}
            </div>
          ) : null}
        </div>
        <div className={cn('min-w-0', flush ? 'border-t border-border' : 'px-4 pb-4', streaming && flush && 'border-l-2 border-primary')}>
          {body}
        </div>
        {footer ? <PanelFooter>{footer}</PanelFooter> : null}
      </section>
    );
  }

  return (
    <Panel aria-labelledby={id} aria-busy={streaming || undefined} className={className}>
      <PanelHeader
        id={id}
        title={title}
        icon={icon}
        count={count}
        actions={
          badge || actions ? (
            <>
              {badge}
              {actions}
            </>
          ) : undefined
        }
      />
      <PanelBody padded={!flush} className={cn(streaming && flush && 'border-l-2 border-primary')}>
        {body}
      </PanelBody>
      {footer ? <PanelFooter>{footer}</PanelFooter> : null}
    </Panel>
  );
}

/** Classe commune des libellés de champs : 0.75 rem, casse de phrase, gris. */
export const FIELD_LABEL_CLASS = 'text-xs font-medium text-muted-foreground';
