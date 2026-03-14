'use client';

import { useSidebarPanel } from './sidebar-context';
import { CvListSidebar } from './cv-list-sidebar';
import { PositioningListSidebar } from './positioning-list-sidebar';
import { TemplateListSidebar } from './template-list-sidebar';

export function SecondarySidebar() {
  const { activePanel } = useSidebarPanel();

  if (activePanel === 'positionings') {
    return <PositioningListSidebar />;
  }

  if (activePanel === 'templates') {
    return <TemplateListSidebar />;
  }

  return <CvListSidebar />;
}
