'use client';

/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H4 E4 S4 R5 V3 · v2 */

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { OrganizationSwitcher } from '@clerk/nextjs';
import { ChevronRight, CircleHelp } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOnboarding } from '@/lib/hooks/use-onboarding';
import { buildBreadcrumbs, type CrumbParams } from '@/components/app-breadcrumbs';
import { cn } from '@/lib/utils';

/**
 * En-tête de la coque : bascule de la barre (rail sur bureau, volet sur mobile),
 * fil d'Ariane, sélecteur d'organisation, aide. Le thème et l'utilisateur vivent
 * en bas de la barre latérale.
 */
export function AppHeader(): React.JSX.Element {
  const pathname = usePathname();
  const params = useParams() as CrumbParams | null;
  const { reset: openOnboarding } = useOnboarding();
  const crumbs = buildBreadcrumbs(pathname, params);

  return (
    <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-shell px-3 md:px-4">
      <Tooltip>
        <TooltipTrigger render={<SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Afficher ou replier le menu" />} />
        <TooltipContent side="bottom">Menu (⌘B)</TooltipContent>
      </Tooltip>

      <nav aria-label="Fil d'Ariane" className="flex min-w-0 flex-1 items-center text-sm">
        <ol className="flex min-w-0 items-center gap-1">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
                {i > 0 ? (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                ) : null}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="truncate rounded-sm text-muted-foreground outline-none transition-colors duration-[120ms] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isLast ? 'page' : undefined}
                    className={cn('truncate', isLast ? 'font-medium text-foreground' : 'text-muted-foreground')}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/"
          afterCreateOrganizationUrl="/"
          appearance={{
            elements: {
              rootBox: 'flex shrink-0',
              organizationSwitcherTrigger: cn(
                'h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground',
                'shadow-none hover:bg-muted hover:text-foreground',
                'max-w-[9rem] sm:max-w-[11rem] md:max-w-[14rem]',
              ),
              organizationSwitcherPopoverCard:
                'bg-popover text-popover-foreground border border-border shadow-lg',
            },
          }}
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openOnboarding}
                aria-label="Guide d'utilisation"
                className="text-muted-foreground hover:text-foreground"
              />
            }
          >
            <CircleHelp />
          </TooltipTrigger>
          <TooltipContent side="bottom">Guide d’utilisation</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
