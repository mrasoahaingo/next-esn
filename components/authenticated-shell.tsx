'use client';

import { RedirectToSignIn, useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { UnifiedSidebar } from '@/components/unified-sidebar';
import { OrgBrandingProvider } from '@/components/org-branding-provider';
import { MobileNavProvider } from '@/components/mobile-nav-context';
import { AppHeader } from '@/components/app-header';
import { OnboardingModal } from '@/components/onboarding-modal';

const PUBLIC_PREFIXES = ['/sign-in', '/sign-up', '/org-selection'] as const;

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const pathname = usePathname();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-shell text-muted-foreground text-sm">
        Chargement…
      </div>
    );
  }

  if (!userId) {
    if (isPublicPath(pathname)) {
      return (
        <div className="flex h-screen overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      );
    }
    return <RedirectToSignIn />;
  }

  return (
    <OrgBrandingProvider>
      <MobileNavProvider>
        <div className="flex h-screen overflow-hidden">
          <UnifiedSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
          </div>
        </div>
        <OnboardingModal />
      </MobileNavProvider>
    </OrgBrandingProvider>
  );
}
