'use client';

/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H4 E4 S4 R4 V3 · v2 */

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import {
  BarChart3,
  Briefcase,
  Building2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LayoutTemplate,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCandidates, useMissions, useUploadCv } from '@/lib/queries';
import { useDemoModeStore } from '@/lib/stores/demo-mode.store';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { useOrgRole } from '@/lib/hooks/useOrgRole';
import { useOrgBranding } from '@/components/org-branding-provider';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { CommandPalette } from '@/components/command-palette';
import { NewMissionDialog } from '@/components/new-mission-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

const isProduction = process.env.NODE_ENV === 'production';

type NavEntry = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Compteur en mono à droite (candidats, missions). */
  count?: number;
  /** Entrée active : le chemin exact ou un de ses enfants, sauf `exclude`. */
  exclude?: string;
};

const ACTIVE_CLASS =
  'data-active:bg-primary/10 data-active:text-primary data-active:hover:bg-primary/15 data-active:hover:text-primary';

function isActivePath(pathname: string, entry: NavEntry): boolean {
  if (entry.exclude && pathname.startsWith(entry.exclude)) return false;
  return pathname === entry.href || pathname.startsWith(`${entry.href}/`);
}

function NavMenu({
  entries,
  pathname,
  onNavigate,
}: {
  entries: NavEntry[];
  pathname: string;
  onNavigate: () => void;
}): React.JSX.Element {
  return (
    <SidebarMenu className="gap-0.5">
      {entries.map((entry) => {
        const active = isActivePath(pathname, entry);
        return (
          <SidebarMenuItem key={entry.href}>
            <SidebarMenuButton
              isActive={active}
              tooltip={entry.label}
              className={cn('text-sm', ACTIVE_CLASS)}
              render={<Link href={entry.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} />}
            >
              <entry.icon aria-hidden />
              <span>{entry.label}</span>
            </SidebarMenuButton>
            {entry.count != null && entry.count > 0 ? (
              <SidebarMenuBadge
                className={cn(
                  'font-mono text-xs font-normal text-muted-foreground',
                  active && 'text-primary peer-hover/menu-button:text-primary',
                )}
              >
                {entry.count}
              </SidebarMenuBadge>
            ) : null}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function UnifiedSidebar(): React.JSX.Element | null {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showNewMission, setShowNewMission] = useState(false);

  const { isDemoMode, toggleDemoMode } = useDemoModeStore();
  const { isSuperAdmin } = useSuperAdmin();
  const { isOrgAdmin } = useOrgRole();
  const canManageTeam = isOrgAdmin || isSuperAdmin;
  const { displayName, appLogoUrl } = useOrgBranding();

  const { data: candidatesData } = useCandidates();
  const { data: missionsData } = useMissions();
  const uploadCv = useUploadCv();
  const isUploading = uploadCv.isPending;

  const candidateCount = useMemo(
    () => (isDemoMode ? 0 : Array.isArray(candidatesData) ? candidatesData.length : 0),
    [isDemoMode, candidatesData],
  );
  const missionCount = useMemo(
    () => (isDemoMode ? 0 : Array.isArray(missionsData) ? missionsData.length : 0),
    [isDemoMode, missionsData],
  );

  const collapsed = state === 'collapsed' && !isMobile;

  /** Referme le volet sur mobile après une navigation. */
  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const navigate = (href: string) => {
    router.push(href);
    closeMobile();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    uploadCv.mutate(file, {
      onSuccess: (data) => {
        toast.success('CV uploadé', {
          description: 'Extraction automatique en cours...',
        });
        navigate(`/review/${data.id}`);
      },
      onError: () => {
        toast.error("Erreur lors de l'upload", {
          description: 'Vérifie le fichier et réessaie.',
        });
      },
    });
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const mainEntries: NavEntry[] = [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { href: '/cvs', label: 'CVs', icon: FileText, count: candidateCount },
    { href: '/positions', label: 'Missions', icon: Briefcase, count: missionCount },
    ...(isSuperAdmin ? [{ href: '/templates', label: 'Modèles', icon: LayoutTemplate }] : []),
  ];

  const settingsEntries: NavEntry[] = [
    { href: '/settings/profile', label: 'Mes technos', icon: GraduationCap },
    ...(canManageTeam
      ? [
          { href: '/settings/organization', label: 'Organisation', icon: Building2 },
          { href: '/settings/team', label: 'Équipe', icon: Users, exclude: '/settings/team/skills' },
          { href: '/settings/team/skills', label: 'Compétences équipe', icon: BarChart3 },
        ]
      : []),
    ...(isSuperAdmin ? [{ href: '/admin', label: 'Administration', icon: ShieldCheck }] : []),
  ];

  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Utilisateur';

  if (!isLoaded || !isSignedIn) return null;

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border">
        <SidebarHeader className="gap-3 p-3 group-data-[collapsible=icon]:p-2">
          <Link
            href="/dashboard"
            onClick={closeMobile}
            aria-label={displayName}
            className="flex h-8 items-center overflow-hidden rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:px-0"
          >
            {appLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL dynamique (Supabase public)
              <img
                src={appLogoUrl}
                alt={displayName}
                className="max-h-8 max-w-[200px] shrink-0 object-contain object-left"
              />
            ) : (
              <EsneoFullLogo
                className="max-h-8 w-30 max-w-none shrink-0 object-contain object-left"
                title={displayName}
              />
            )}
          </Link>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={handleFileChange}
            disabled={isUploading}
          />

          {/* Action principale : importer, et le « + » pour le reste */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"
              onClick={openFilePicker}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Upload />}
              <span className="truncate">{isUploading ? 'Import en cours…' : 'Importer un CV'}</span>
            </Button>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Créer"
                          className="shrink-0"
                        />
                      }
                    />
                  }
                >
                  <Plus />
                </TooltipTrigger>
                <TooltipContent side="right" hidden={!collapsed}>
                  Créer
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" side={collapsed ? 'right' : 'bottom'} className="w-52">
                <DropdownMenuItem onClick={openFilePicker} disabled={isUploading}>
                  <Upload />
                  Importer un CV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowNewMission(true)}>
                  <Briefcase />
                  Nouvelle mission
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Recherche : un bouton qui ressemble à un champ, ouvre la palette ⌘K */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaletteOpen(true)}
                  aria-label="Rechercher (⌘K)"
                  className="w-full justify-start gap-2 font-normal text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                />
              }
            >
              <Search aria-hidden />
              <span className="flex-1 truncate text-left group-data-[collapsible=icon]:hidden">Rechercher…</span>
              <kbd className="rounded-sm border border-border bg-muted px-1 font-mono text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                ⌘K
              </kbd>
            </TooltipTrigger>
            <TooltipContent side="right" hidden={!collapsed}>
              Rechercher
            </TooltipContent>
          </Tooltip>
        </SidebarHeader>

        <SidebarContent className="px-1">
          <SidebarGroup>
            <SidebarGroupContent>
              <NavMenu entries={mainEntries} pathname={pathname} onNavigate={closeMobile} />
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Réglages</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavMenu entries={settingsEntries} pathname={pathname} onNavigate={closeMobile} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator className="mx-0 w-full" />

        <SidebarFooter className="gap-2 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          {!isProduction ? (
            <div className="flex h-8 items-center justify-between gap-2 px-1 group-data-[collapsible=icon]:hidden">
              <Label htmlFor="demo-mode" className="cursor-pointer text-xs text-muted-foreground">
                Mode démo
              </Label>
              <Switch id="demo-mode" size="sm" checked={isDemoMode} onCheckedChange={toggleDemoMode} />
            </div>
          ) : null}

          <div className="flex min-w-0 items-center gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1">
            <UserButton
              afterSwitchSessionUrl="/"
              appearance={{
                elements: {
                  rootBox: 'flex shrink-0',
                  avatarBox: 'h-8 w-8',
                },
              }}
            />
            <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-medium text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">{displayName}</p>
            </div>
            <ThemeToggle />
          </div>
        </SidebarFooter>
      </Sidebar>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <NewMissionDialog open={showNewMission} onOpenChange={setShowNewMission} onCreated={closeMobile} />
    </>
  );
}
