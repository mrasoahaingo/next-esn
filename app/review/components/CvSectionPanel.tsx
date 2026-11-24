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
  className,
  children,
}: CvSectionPanelProps): React.JSX.Element {
  const streaming = status === 'streaming';
  return (
    <Panel aria-labelledby={id} aria-busy={streaming || undefined} className={className}>
      <PanelHeader
        id={id}
        title={title}
        icon={icon}
        count={count}
        actions={
          streaming || actions ? (
            <>
              {streaming ? (
                <StatusBadge tone="info" pulse>
                  En cours
                </StatusBadge>
              ) : null}
              {actions}
            </>
          ) : undefined
        }
      />
      <PanelBody padded={!flush} className={cn(streaming && (flush ? 'border-l-2 border-primary' : undefined))}>
        {streaming && !flush ? <div className="border-l-2 border-primary pl-4">{children}</div> : children}
      </PanelBody>
      {footer ? <PanelFooter>{footer}</PanelFooter> : null}
    </Panel>
  );
}

/** Classe commune des libellés de champs : 0.75 rem, casse de phrase, gris. */
export const FIELD_LABEL_CLASS = 'text-xs font-medium text-muted-foreground';
