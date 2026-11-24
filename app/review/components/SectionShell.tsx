'use client';

import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

type SectionStatus = 'pending' | 'streaming' | 'done';

interface SectionShellProps {
  status: SectionStatus;
  /** Ce que l'IA fait pour cette section (« Analyse des compétences… ») : nom accessible de la région. */
  label: string;
  children: ReactNode;
}

/**
 * Enveloppe d'une section pendant un travail de l'IA (DESIGN.md § L'état de l'IA) :
 * - `pending` : un squelette calme, à la place du contenu ;
 * - `streaming` : un filet gauche `primary` et le mot « En cours », le contenu dessous ;
 * - `done` : rien de plus, le contenu est la preuve.
 * Même API pour l'écran CV et le positionnement.
 */
export function SectionShell({ status, label, children }: SectionShellProps): React.JSX.Element {
  if (status === 'pending') {
    return (
      <section aria-label={label} aria-busy="true" className="space-y-4">
        <div className="border-b border-border pb-2">
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </section>
    );
  }

  if (status === 'streaming') {
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
