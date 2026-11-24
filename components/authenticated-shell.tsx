'use client';

import { RedirectToSignIn, useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { UnifiedSidebar } from '@/components/unified-sidebar';
import { OrgBrandingProvider } from '@/components/org-branding-provider';
import { AppHeader } from '@/components/app-header';
import { OnboardingModal } from '@/components/onboarding-modal';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { isAppPath, matchesPrefix, ORG_SELECTION_PREFIX } from '@/lib/config/app-routes';

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const pathname = usePathname();

  // Pages publiques (landing, connexion, inscription, 404 d'un chemin inconnu) :
  // rendues tout de suite, côté serveur comme sans JavaScript, sans attendre
  // Clerk. Elles portent leur propre `main` et défilent normalement.
  if (!isAppPath(pathname)) {
    return <>{children}</>;
  }

  if (!isLoaded) {
    return (
      <div className="flex h-svh items-center justify-center bg-shell text-muted-foreground text-sm">
        Chargement…
      </div>
    );
  }

  if (!userId) {
    if (matchesPrefix(pathname, ORG_SELECTION_PREFIX)) {
      return (
        <div className="flex h-svh overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      );
    }
    return <RedirectToSignIn />;
  }

  return (
    <OrgBrandingProvider>
      <SidebarProvider>
        <UnifiedSidebar />
        <SidebarInset className="flex flex-col overflow-hidden">
          <AppHeader />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
        </SidebarInset>
        <OnboardingModal />
      </SidebarProvider>
    </OrgBrandingProvider>
  );
}
