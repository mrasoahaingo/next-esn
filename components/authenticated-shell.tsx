'use client';

import { RedirectToSignIn, useAuth } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { UnifiedSidebar } from '@/components/unified-sidebar';

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
    <div className="flex h-screen overflow-hidden">
      <UnifiedSidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
