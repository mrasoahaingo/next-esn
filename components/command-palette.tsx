'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LayoutTemplate,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useCandidates, useMissions } from '@/lib/queries';
import { useDemoModeStore } from '@/lib/stores/demo-mode.store';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { useOrgRole } from '@/lib/hooks/useOrgRole';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { InitialsAvatar } from '@/components/app/initials-avatar';

type CandidateRow = {
  id: string;
  original_file_url: string;
  extracted_data: {
    personalInfo?: { firstName?: string; lastName?: string; title?: string };
  } | null;
};

type MissionRow = {
  id: string;
  title: string;
  company: string | null;
};

type PaletteItem = {
  id: string;
  kind: 'page' | 'cv' | 'mission';
  label: string;
  detail?: string;
  href: string;
  icon?: LucideIcon;
};

type PaletteGroup = {
  value: string;
  label: string;
  items: PaletteItem[];
};

/** Nom affiché d'un candidat : état civil extrait, sinon le nom du fichier. */
export function candidateDisplayName(c: CandidateRow): string {
  const pi = c.extracted_data?.personalInfo;
  if (pi?.firstName || pi?.lastName) {
    return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
  }
  const fileName = c.original_file_url.split('/').pop() ?? '';
  return fileName
    .replace(/^\d+_/, '')
    .replace(/\.[^.]+$/, '')
    .replace(/_/g, ' ');
}

const itemToString = (itemValue: unknown): string => {
  const item = itemValue as PaletteItem;
  return item.detail ? `${item.label} ${item.detail}` : item.label;
};

/**
 * Palette ⌘K de la coque : CV, missions et pages, ouverte depuis la barre latérale
 * ou par ⌘K / Ctrl+K. Une entrée navigue et referme la palette (et le volet mobile).
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const { isDemoMode } = useDemoModeStore();
  const { isSuperAdmin } = useSuperAdmin();
  const { isOrgAdmin } = useOrgRole();
  const canManageTeam = isOrgAdmin || isSuperAdmin;
  const { data: candidatesData } = useCandidates();
  const { data: missionsData } = useMissions();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const groups = useMemo<PaletteGroup[]>(() => {
    const candidates: CandidateRow[] = isDemoMode
      ? []
      : Array.isArray(candidatesData)
        ? candidatesData
        : [];
    const missions: MissionRow[] = isDemoMode
      ? []
      : Array.isArray(missionsData)
        ? missionsData
        : [];

    const pages: PaletteItem[] = [
      { id: 'page-dashboard', kind: 'page', label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
      { id: 'page-cvs', kind: 'page', label: 'CVs', href: '/cvs', icon: FileText },
      { id: 'page-positions', kind: 'page', label: 'Missions', href: '/positions', icon: Briefcase },
    ];
    if (isSuperAdmin) {
      pages.push({ id: 'page-templates', kind: 'page', label: 'Modèles', href: '/templates', icon: LayoutTemplate });
    }
    pages.push({ id: 'page-profile', kind: 'page', label: 'Mes technos', href: '/settings/profile', icon: GraduationCap });
    if (canManageTeam) {
      pages.push(
        { id: 'page-organization', kind: 'page', label: 'Organisation', href: '/settings/organization', icon: Building2 },
        { id: 'page-team', kind: 'page', label: 'Équipe', href: '/settings/team', icon: Users },
        { id: 'page-team-skills', kind: 'page', label: 'Compétences équipe', href: '/settings/team/skills', icon: BarChart3 },
      );
    }
    if (isSuperAdmin) {
      pages.push({ id: 'page-admin', kind: 'page', label: 'Administration', href: '/admin', icon: ShieldCheck });
    }

    return [
      {
        value: 'cvs',
        label: 'CV',
        items: candidates.map((c) => ({
          id: `cv-${c.id}`,
          kind: 'cv' as const,
          label: candidateDisplayName(c),
          detail: c.extracted_data?.personalInfo?.title ?? undefined,
          href: `/review/${c.id}`,
        })),
      },
      {
        value: 'missions',
        label: 'Missions',
        items: missions.map((m) => ({
          id: `mission-${m.id}`,
          kind: 'mission' as const,
          label: m.title,
          detail: m.company ?? undefined,
          href: `/positions/${m.id}`,
          icon: Briefcase,
        })),
      },
      { value: 'pages', label: 'Pages', items: pages },
    ];
  }, [candidatesData, missionsData, isDemoMode, isSuperAdmin, canManageTeam]);

  const go = (href: string) => {
    onOpenChange(false);
    if (isMobile) setOpenMobile(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command items={groups} itemToStringValue={itemToString}>
        <CommandInput placeholder="Rechercher un CV, une mission, une page…" autoFocus />
        <CommandList>
          {(group: PaletteGroup) => (
            <CommandGroup key={group.value} items={group.items} heading={group.label}>
              <CommandCollection>
                {(item: PaletteItem) => (
                  <CommandItem key={item.id} value={item} onClick={() => go(item.href)}>
                    {item.kind === 'cv' ? (
                      <InitialsAvatar name={item.label} size="sm" />
                    ) : item.icon ? (
                      <item.icon className="text-muted-foreground" aria-hidden />
                    ) : null}
                    <span className="truncate">{item.label}</span>
                    {item.detail ? (
                      <span className="ml-auto truncate text-xs text-muted-foreground">{item.detail}</span>
                    ) : null}
                  </CommandItem>
                )}
              </CommandCollection>
            </CommandGroup>
          )}
        </CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
      </Command>
    </CommandDialog>
  );
}
