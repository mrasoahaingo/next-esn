'use client';

import { RedirectToSignIn, useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { UnifiedSidebar } from '@/components/unified-sidebar';
import { OrgBrandingProvider } from '@/components/org-branding-provider';
import { AppHeader } from '@/components/app-header';
import { OnboardingModal } from '@/components/onboarding-modal';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

const PUBLIC_PREFIXES = ['/sign-in', '/sign-up', '/org-selection'] as const;

function isPublicPath(pathname: string) {
  // The root path is the public marketing landing page.
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <div className="flex h-svh items-center justify-center bg-shell text-muted-foreground text-sm">
        Chargement…
      </div>
    );
  }

  // The root path is the public marketing landing — always render it bare,
  // whether or not the user is signed in. Window-scroll (no inner container)
  // so GSAP ScrollTrigger, which observes the window, fires correctly.
  if (pathname === '/') {
    return <>{children}</>;
  }

  if (!userId) {
    if (isPublicPath(pathname)) {
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
