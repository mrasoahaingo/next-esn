'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type SidebarPanel = 'cvs' | 'positionings' | 'templates';

interface SidebarContextValue {
  activePanel: SidebarPanel;
}

const SidebarContext = createContext<SidebarContextValue>({
  activePanel: 'cvs',
});

function derivePanel(pathname: string): SidebarPanel {
  if (pathname.startsWith('/templates')) return 'templates';
  if (pathname.includes('/positioning/') && pathname.split('/positioning/')[1]) return 'positionings';
  return 'cvs';
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activePanel = derivePanel(pathname);

  const value = useMemo(() => ({ activePanel }), [activePanel]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarPanel() {
  return useContext(SidebarContext);
}
