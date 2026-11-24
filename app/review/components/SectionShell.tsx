'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';

type SectionStatus = 'pending' | 'streaming' | 'done';

interface SectionShellProps {
  status: SectionStatus;
  /** Ce que l'IA fait pour cette section (« Analyse des compétences… ») : nom accessible de la région. */
  label: string;
  /**
   * Mode panneau (écran CV, DESIGN.md § Révision v2) : avec `title`, l'attente est un
   * `Panel` au vrai en-tête et aux squelettes dans le corps, et les états `streaming` /
   * `done` rendent `children` tel quel (la section porte son propre panneau et sa pastille).
   * Sans `title`, rendu d'origine (positionnement).
   */
  title?: string;
  icon?: LucideIcon;
  children: ReactNode;
}

/**
 * Enveloppe d'une section pendant un travail de l'IA (DESIGN.md § L'état de l'IA) :
 * - `pending` : un squelette calme, à la place du contenu ;
 * - `streaming` : un filet gauche `primary` et le mot « En cours », le contenu dessous ;
 * - `done` : rien de plus, le contenu est la preuve.
 * Même API pour l'écran CV et le positionnement.
 */
export function SectionShell({ status, label, title, icon, children }: SectionShellProps): React.JSX.Element {
  const panelMode = title != null;

  if (status === 'pending') {
    if (panelMode) {
      return (
        <Panel aria-label={label} aria-busy="true">
          <PanelHeader title={title} icon={icon} />
          <PanelBody className="space-y-2.5">
            <Skeleton className="h-3.5 w-3/4 motion-reduce:animate-none" />
            <Skeleton className="h-3.5 w-1/2 motion-reduce:animate-none" />
            <Skeleton className="h-3.5 w-2/3 motion-reduce:animate-none" />
          </PanelBody>
        </Panel>
      );
    }
    return (
      <section aria-label={label} aria-busy="true" className="space-y-4">
        <div className="border-b border-border pb-2">
          <Skeleton className="h-4 w-36 motion-reduce:animate-none" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-3.5 w-3/4 motion-reduce:animate-none" />
          <Skeleton className="h-3.5 w-1/2 motion-reduce:animate-none" />
          <Skeleton className="h-3.5 w-2/3 motion-reduce:animate-none" />
        </div>
      </section>
    );
  }

  if (status === 'streaming' && !panelMode) {
    return (
      <div aria-busy="true" className="border-l-2 border-primary pl-4">
        <p className="mb-2 text-xs text-muted-foreground">
          En cours
          <span className="sr-only"> · {label}</span>
        </p>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
