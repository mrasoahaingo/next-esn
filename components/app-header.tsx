'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs';
import { ChevronRight, Menu, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useMobileNav } from '@/components/mobile-nav-context';
import { cn } from '@/lib/utils';

type Crumb = { label: string; href?: string };

function buildBreadcrumbs(pathname: string, params: ReturnType<typeof useParams>): Crumb[] {
  if (pathname === '/') {
    return [{ label: 'Tableau de bord' }];
  }

  if (pathname.startsWith('/templates')) {
    const id = params?.id as string | undefined;
    if (pathname === '/templates') {
      return [{ label: 'Accueil', href: '/' }, { label: 'Templates' }];
    }
    return [
      { label: 'Accueil', href: '/' },
      { label: 'Templates', href: '/templates' },
      { label: id ? `Template` : 'Détail' },
    ];
  }

  if (pathname.startsWith('/positions')) {
    if (pathname === '/positions') {
      return [{ label: 'Accueil', href: '/' }, { label: 'Positions' }];
    }
    return [{ label: 'Accueil', href: '/' }, { label: 'Positions', href: '/positions' }, { label: 'Mission' }];
  }

  if (pathname.startsWith('/review/')) {
    const id = params?.id as string | undefined;
    const positioningId = params?.positioningId as string | undefined;
    const cvHref = id ? `/review/${id}` : '/';

    if (positioningId) {
      return [
        { label: 'Accueil', href: '/' },
        { label: 'CV', href: cvHref },
        { label: 'Positionnement' },
      ];
    }
    if (pathname.endsWith('/positioning')) {
      return [
        { label: 'Accueil', href: '/' },
        { label: 'CV', href: cvHref },
        { label: 'Nouveau positionnement' },
      ];
    }
    return [{ label: 'Accueil', href: '/' }, { label: 'Édition CV' }];
  }

  if (pathname.startsWith('/settings/')) {
    if (pathname.startsWith('/settings/profile')) {
      return [{ label: 'Accueil', href: '/' }, { label: 'Mes technos' }];
    }
    if (pathname.startsWith('/settings/organization')) {
      return [{ label: 'Accueil', href: '/' }, { label: 'Organisation' }];
    }
    if (pathname.startsWith('/settings/team/skills')) {
      return [{ label: 'Accueil', href: '/' }, { label: 'Équipe', href: '/settings/team' }, { label: 'Compétences' }];
    }
    if (pathname.startsWith('/settings/team')) {
      return [{ label: 'Accueil', href: '/' }, { label: 'Équipe' }];
    }
    return [{ label: 'Accueil', href: '/' }, { label: 'Paramètres' }];
  }

  if (pathname.startsWith('/admin')) {
    return [{ label: 'Accueil', href: '/' }, { label: 'Administration' }];
  }

  return [{ label: 'Accueil', href: '/' }, { label: 'Application' }];
}

export function AppHeader() {
  const pathname = usePathname();
  const params = useParams();
  const { openMobileNav } = useMobileNav();
  const crumbs = buildBreadcrumbs(pathname, params);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-border/60 bg-shell/90 px-3 py-2.5 backdrop-blur-md md:px-5'
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 md:hidden"
        onClick={openMobileNav}
        aria-label="Ouvrir le menu de navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <nav aria-label="Fil d&apos;Ariane" className="flex min-w-0 flex-1 items-center gap-1 text-sm">
        <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary md:flex">
          <PanelLeft className="h-3.5 w-3.5" />
        </div>
        <ol className="flex min-w-0 flex-wrap items-center gap-1">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden />
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="truncate text-muted-foreground transition hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      'truncate font-medium',
                      isLast ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {crumb.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/"
          afterCreateOrganizationUrl="/"
          appearance={{
            elements: {
              rootBox: 'flex shrink-0',
              organizationSwitcherTrigger: cn(
                'rounded-lg border border-border bg-background/60 px-2 py-1.5 text-xs text-foreground',
                'shadow-none hover:bg-muted/80 hover:text-foreground',
                'max-w-[9rem] sm:max-w-[11rem] md:max-w-[14rem]'
              ),
              organizationSwitcherPopoverCard: 'bg-popover text-popover-foreground border border-border shadow-lg',
            },
          }}
        />
        <ThemeToggle />
        <UserButton
          afterSwitchSessionUrl="/"
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8',
            },
          }}
        />
      </div>
    </header>
  );
}
