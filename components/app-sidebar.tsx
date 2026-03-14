'use client';

import { FileText, Target, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { useSidebarPanel } from './sidebar-context';

const activeStyles = {
  cvs: 'bg-accent/15 text-accent hover:bg-accent/20 hover:text-accent',
  positionings: 'bg-violet/15 text-violet hover:bg-violet/20 hover:text-violet',
  templates: 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary',
} as const;

export function AppSidebar() {
  const { activePanel, setActivePanel } = useSidebarPanel();

  const navItems = [
    { icon: FileText, label: 'CVs', panel: 'cvs' as const },
    { icon: Target, label: 'Positionnements', panel: 'positionings' as const },
    { icon: Palette, label: 'Templates', panel: 'templates' as const },
  ];

  return (
    <aside className="flex h-screen w-16 flex-col items-center border-r border-border bg-shell py-4">
      <div className="mb-6 flex items-center justify-center">
        <svg
          aria-hidden="true"
          className="h-8 w-8"
          viewBox="125 0 35 35"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M140.648 2.63184C148.825 2.63184 155.483 9.30948 155.484 17.582C155.484 25.8548 148.825 32.5332 140.648 32.5332C132.47 32.533 125.813 25.8547 125.813 17.582C125.813 9.30961 132.47 2.63204 140.648 2.63184Z"
            stroke="white"
            strokeWidth="5.03319"
          />
        </svg>
      </div>

      <Separator className="mx-auto mb-4 w-8" />

      <nav className="flex flex-1 flex-col items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePanel === item.panel;
          return (
            <Tooltip key={item.panel}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActivePanel(item.panel)}
                    className={isActive ? activeStyles[item.panel] : 'text-muted-foreground'}
                  />
                }
              >
                <Icon className="h-5 w-5" />
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
