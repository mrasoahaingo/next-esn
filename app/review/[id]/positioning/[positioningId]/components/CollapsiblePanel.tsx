'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { Panel } from '@/components/app/panel';
import { cn } from '@/lib/utils';

export type CollapsiblePanelProps = {
  title: ReactNode;
  icon?: LucideIcon;
  /** Compteur en mono à côté du titre (« 3 », « 5 étapes »). */
  count?: ReactNode;
  /** Une phrase sous le titre, 12 px. */
  description?: ReactNode;
  /** Ce qui s'affiche à droite, avant le chevron (une pastille, une durée en mono). */
  aside?: ReactNode;
  defaultOpen?: boolean;
  as?: 'h2' | 'h3';
  id?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Panneau repliable : même grammaire que `PanelHeader` (icône, titre, compteur,
 * description, aside), mais l'en-tête est le `<summary>` d'un `<details>`. Pour
 * ce qui vit replié par défaut (historique, contexte pris en compte, zone d'état
 * d'un workflow terminé). Natif : pas d'état React, pas d'animation de hauteur.
 */
export function CollapsiblePanel({
  title,
  icon: Icon,
  count,
  description,
  aside,
  defaultOpen = false,
  as: Heading = 'h2',
  id,
  className,
  children,
}: CollapsiblePanelProps): React.JSX.Element {
  return (
    <Panel className={className}>
      <details className="group/collapsible" open={defaultOpen}>
        <summary
          className={cn(
            'flex cursor-pointer list-none items-start justify-between gap-4 rounded-xl px-4 py-3 outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring/50 group-open/collapsible:rounded-b-none',
            '[&::-webkit-details-marker]:hidden',
          )}
        >
          <span className="flex min-w-0 items-start gap-2.5">
            {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
            <span className="block min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <Heading id={id} className="truncate text-sm font-semibold text-foreground">
                  {title}
                </Heading>
                {count != null ? (
                  <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                ) : null}
              </span>
              {description ? (
                <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
              ) : null}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {aside}
            <ChevronDown
              className="size-4 transition-transform duration-[220ms] ease-out group-open/collapsible:rotate-180 motion-reduce:transition-none"
              aria-hidden
            />
          </span>
        </summary>
        <div className="border-t border-border">{children}</div>
      </details>
    </Panel>
  );
}
