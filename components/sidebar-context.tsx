'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type SidebarPanel = 'cvs' | 'positionings' | 'templates';

interface SidebarContextValue {
  activePanel: SidebarPanel;
  setActivePanel: (panel: SidebarPanel) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  activePanel: 'cvs',
  setActivePanel: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<SidebarPanel>('cvs');
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith('/templates')) {
      setActivePanel('templates');
    } else if (pathname.includes('/positioning/') && pathname.split('/positioning/')[1]) {
      setActivePanel('positionings');
    } else {
      setActivePanel('cvs');
    }
  }, [pathname]);

  return (
    <SidebarContext.Provider value={{ activePanel, setActivePanel }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarPanel() {
  return useContext(SidebarContext);
}
