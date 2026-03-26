'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useCandidates, usePositionings, useMissions, useUploadCv, useCancelWorkflow, useCreateMission } from '@/lib/queries';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { JobDescriptionInput } from '@/components/job-description-input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarSeparator,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Upload,
  Loader2,
  User,
  Briefcase,
  Plus,
  ChevronRight,
  Target,
  Palette,
  Square,
  Building2,
  ShieldCheck,
  Users,
  GraduationCap,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDemoModeStore } from '@/lib/stores/demo-mode.store';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { useOrgRole } from '@/lib/hooks/useOrgRole';
import { useOrgBranding } from '@/components/org-branding-provider';

const isProduction = process.env.NODE_ENV === 'production';

interface Candidate {
  id: string;
  status: string;
  workflow_run_id: string | null;
  extracted_data: {
    personalInfo?: { firstName?: string; lastName?: string; title?: string };
    experiences?: { role?: string; company?: string }[];
  } | null;
  created_at: string;
  original_file_url: string;
}

interface Positioning {
  id: string;
  candidate_id: string;
  mission_id: string | null;
  job_description: string;
  status: string;
  workflow_run_id: string | null;
  analysis: {
    matchScore?: number;
    matchSummary?: string;
  } | null;
  missions: {
    id: string;
    title: string;
    company: string | null;
  } | null;
  created_at: string;
}

interface Mission {
  id: string;
  title: string;
  company: string | null;
  positioning_count: number;
  created_at: string;
}

const cvStatusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  uploaded: { label: 'Uploadé', variant: 'secondary' },
  extracting: { label: 'Extraction...', variant: 'outline' },
  reviewing: { label: 'En revue', variant: 'outline' },
  ready: { label: 'Prêt', variant: 'default' },
  generated: { label: 'Généré', variant: 'default' },
};

const posStatusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  analyzing: { label: 'Analyse...', variant: 'outline' },
  analyzed: { label: 'Analysé', variant: 'outline' },
  generating: { label: 'Génération...', variant: 'outline' },
  generated: { label: 'Généré', variant: 'default' },
  exported: { label: 'Exporté', variant: 'default' },
};

export function UnifiedSidebar() {
  const { isSignedIn, isLoaded } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar();
  const [expandedCvs, setExpandedCvs] = useState<Set<string>>(new Set());
  const [showNewMission, setShowNewMission] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const { isDemoMode, toggleDemoMode } = useDemoModeStore();
  const { isSuperAdmin } = useSuperAdmin();
  const { isOrgAdmin } = useOrgRole();
  const canManageTeam = isOrgAdmin || isSuperAdmin;
  const { displayName, appLogoUrl } = useOrgBranding();

  const {
    data: candidatesData,
    isLoading: isLoadingCandidates,
    isFetching: isFetchingCandidates,
    refetch: refetchCandidates,
  } = useCandidates();
  const {
    data: positioningsData,
    isLoading: isLoadingPositionings,
    isFetching: isFetchingPositionings,
    refetch: refetchPositionings,
  } = usePositionings();
  const {
    data: missionsData,
    isLoading: isLoadingMissions,
    isFetching: isFetchingMissions,
    refetch: refetchMissions,
  } = useMissions();

  const isRefreshingLists =
    isFetchingCandidates || isFetchingPositionings || isFetchingMissions;
  const handleRefreshLists = () => {
    void Promise.all([refetchCandidates(), refetchPositionings(), refetchMissions()]);
  };
  const uploadCv = useUploadCv();
  const isUploading = uploadCv.isPending;
  const cancelWorkflow = useCancelWorkflow();
  const createMission = useCreateMission();

  const candidates: Candidate[] = useMemo(
    () => (isDemoMode ? [] : (Array.isArray(candidatesData) ? candidatesData : [])),
    [isDemoMode, candidatesData]
  );
  const positionings: Positioning[] = useMemo(
    () => (isDemoMode ? [] : (Array.isArray(positioningsData) ? positioningsData : [])),
    [isDemoMode, positioningsData]
  );
  const missions: Mission[] = useMemo(
    () => (isDemoMode ? [] : (Array.isArray(missionsData) ? missionsData : [])),
    [isDemoMode, missionsData]
  );
  const isLoading = !isDemoMode && (isLoadingCandidates || isLoadingPositionings || isLoadingMissions);

  const activeCvId = params?.id as string | undefined;
  const activePositioningId = params?.positioningId as string | undefined;
  const isOnPositions = pathname.startsWith('/positions');
  const activePositionId = isOnPositions ? (params?.id as string | undefined) : undefined;

  // Derive expanded set: always include the active CV
  const effectiveExpandedCvs = useMemo(() => {
    if (!activeCvId) return expandedCvs;
    if (expandedCvs.has(activeCvId)) return expandedCvs;
    const next = new Set(expandedCvs);
    next.add(activeCvId);
    return next;
  }, [expandedCvs, activeCvId]);

  // Group positionings by candidate
  const positioningsByCandidate = useMemo(() => {
    const map = new Map<string, Positioning[]>();
    for (const p of positionings) {
      const existing = map.get(p.candidate_id) ?? [];
      existing.push(p);
      map.set(p.candidate_id, existing);
    }
    return map;
  }, [positionings]);

  /** Navigate and close sidebar on mobile */
  const navigate = (href: string) => {
    router.push(href);
    if (isMobile) setOpenMobile(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    uploadCv.mutate(e.target.files[0], {
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

  const getCandidateName = (c: Candidate) => {
    const pi = c.extracted_data?.personalInfo;
    if (pi?.firstName || pi?.lastName) {
      return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
    }
    const fileName = c.original_file_url.split('/').pop() ?? '';
    return fileName
      .replace(/^\d+_/, '')
      .replace(/\.[^.]+$/, '')
      .replace(/_/g, ' ');
  };

  const getCandidateTitle = (c: Candidate) =>
    c.extracted_data?.personalInfo?.title ?? null;

  const toggleExpand = (id: string) => {
    setExpandedCvs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateMission = () => {
    if (!newTitle.trim() || !newJobDescription.trim()) return;
    createMission.mutate(
      { title: newTitle, company: newCompany || null, jobDescription: newJobDescription },
      {
        onSuccess: (mission) => {
          setShowNewMission(false);
          setNewTitle('');
          setNewCompany('');
          setNewJobDescription('');
          if (mission.id) {
            navigate(`/positions/${mission.id}?tab=analysis`);
          }
        },
      }
    );
  };

  const isOnTemplates = pathname.startsWith('/templates');
  const activeTab = pathname.startsWith('/positions') ? 'positions' : 'cvs';

  if (!isLoaded || !isSignedIn) return null;

  return (
    <>
      <Sidebar className="border-r border-violet/10 bg-panel">
        {/* Header */}
        <SidebarHeader className="p-0">
          <Link
            href="/"
            className="flex items-center px-4 py-10 transition-opacity hover:opacity-90"
            onClick={() => { if (isMobile) setOpenMobile(false); }}
          >
            {appLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL dynamique (Supabase public)
              <img
                src={appLogoUrl}
                alt={displayName}
                className="max-h-8 max-w-[200px] object-contain object-left"
              />
            ) : (
              <EsneoFullLogo
                className="max-h-8 w-30 max-w-full object-contain object-left"
                title={displayName}
              />
            )}
          </Link>

          {/* Demo mode toggle */}
          {!isProduction && (
            <div className="mx-3 mb-2 flex items-center justify-between rounded-lg bg-overlay/[0.03] px-3 py-2">
              <Label htmlFor="demo-mode" className="text-[11px] font-medium text-muted-foreground cursor-pointer">
                Mode démo
              </Label>
              <Switch
                id="demo-mode"
                checked={isDemoMode}
                onCheckedChange={toggleDemoMode}
                className="scale-75"
              />
            </div>
          )}
        </SidebarHeader>

        <SidebarSeparator className="mx-0 w-full" />

        {/* Scrollable content */}
        <SidebarContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              const target = v === 'cvs' ? '/' : '/positions';
              if (pathname === target) return;
              router.push(target);
            }}
            className="flex min-h-0 min-w-0 flex-1 flex-col px-3 pt-3"
          >
            <div className="mb-2 flex shrink-0 items-center gap-1">
              <TabsList
                variant="segmented"
                className="min-h-8 min-w-0 flex-1 max-w-full grid grid-cols-2"
              >
                <TabsTrigger value="cvs" className="min-w-0 text-xs">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">CVs</span>
                </TabsTrigger>
                <TabsTrigger value="positions" className="min-w-0 text-xs">
                  <Briefcase className="h-3 w-3 shrink-0" />
                  <span className="truncate">Positions</span>
                </TabsTrigger>
              </TabsList>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleRefreshLists}
                disabled={isDemoMode}
                title="Rafraîchir les listes"
                aria-label="Rafraîchir les listes"
              >
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5',
                    isRefreshingLists && !isLoading && 'animate-spin',
                  )}
                />
              </Button>
            </div>

            <div className="min-h-0 min-w-0 flex-1 px-2 pb-2">
              <TabsContent value="cvs" className="mt-0 focus-visible:outline-none">
                <>
                {/* Upload */}
                <div className="px-1 py-2">
                  <label className="relative block cursor-pointer">
                    <Input
                      type="file"
                      onChange={handleFileChange}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      accept=".pdf,.docx,.doc"
                      disabled={isUploading}
                    />
                    <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-overlay/12 bg-overlay/[0.03] px-3 py-2 text-sm text-muted-foreground transition hover:border-accent/40 hover:bg-accent/5 hover:text-accent">
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span className="text-xs font-medium">
                        {isUploading ? 'Upload en cours...' : 'Importer un CV'}
                      </span>
                    </div>
                  </label>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="text-xs">Chargement...</span>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/50">
                      <Upload className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium text-foreground">Aucun CV</p>
                    <p className="mt-0.5 text-[10px]">Importe un CV pour commencer</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {candidates.map((c) => {
                      const name = getCandidateName(c);
                      const title = getCandidateTitle(c);
                      const st = cvStatusConfig[c.status] ?? cvStatusConfig.uploaded;
                      const isActive = c.id === activeCvId && !activePositioningId && !isOnPositions;
                      const isExpanded = effectiveExpandedCvs.has(c.id);
                      const cvPositionings = positioningsByCandidate.get(c.id) ?? [];
                      const hasPositionings = cvPositionings.length > 0;

                      return (
                        <div key={c.id}>
                          {/* CV item */}
                          <div className="group flex items-center gap-1">
                            {/* Expand toggle */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => toggleExpand(c.id)}
                              className="shrink-0 text-muted-foreground/50 hover:text-foreground"
                              aria-expanded={isExpanded}
                              aria-label={isExpanded ? 'Réduire la liste' : 'Développer la liste'}
                            >
                              <ChevronRight
                                className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              />
                            </Button>

                            {/* CV button */}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(`/review/${c.id}`)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') navigate(`/review/${c.id}`);
                              }}
                              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left transition cursor-pointer ${
                                isActive
                                  ? 'bg-accent/10 text-foreground'
                                  : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                              }`}
                            >
                              <div
                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                  isActive
                                    ? 'bg-accent/15 text-accent'
                                    : 'bg-card/50 text-muted-foreground'
                                }`}
                              >
                                <User className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-xs font-medium">{name}</span>
                                  <Badge
                                    variant={st.variant}
                                    className="shrink-0 text-[9px] px-1 py-0 leading-tight"
                                  >
                                    {st.label}
                                  </Badge>
                                </div>
                                {title && (
                                  <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                                    <Briefcase className="h-2.5 w-2.5 shrink-0" />
                                    {title}
                                  </p>
                                )}
                              </div>

                              {/* Cancel extraction button */}
                              {c.status === 'extracting' && c.workflow_run_id && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelWorkflow.mutate({
                                      runId: c.workflow_run_id!,
                                      table: 'candidates',
                                      recordId: c.id,
                                      resetStatus: 'uploaded',
                                    });
                                  }}
                                  className="shrink-0 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                                  title="Annuler l'extraction"
                                >
                                  <Square className="h-3 w-3" />
                                </Button>
                              )}

                              {/* Positioning count badge */}
                              {hasPositionings && (
                                <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-violet/15 px-1 text-[9px] font-semibold text-violet">
                                  {cvPositionings.length}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Nested positionings */}
                          {isExpanded && (
                            <div className="ml-6 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-border/60 pl-2">
                              {cvPositionings.map((p) => {
                                const label = p.missions?.title ?? p.job_description.trim().split('\n')[0].slice(0, 40);
                                const pst = posStatusConfig[p.status] ?? { label: 'Brouillon', variant: 'secondary' as const };
                                const matchScore = p.analysis?.matchScore;
                                const isPosActive = p.id === activePositioningId;

                                return (
                                  <div
                                    key={p.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      navigate(`/review/${c.id}/positioning/${p.id}`)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') navigate(`/review/${c.id}/positioning/${p.id}`);
                                    }}
                                    className={`group/pos flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition cursor-pointer ${
                                      isPosActive
                                        ? 'bg-violet/10 text-foreground'
                                        : 'text-muted-foreground hover:bg-card/40 hover:text-foreground'
                                    }`}
                                  >
                                    <div
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${
                                        isPosActive
                                          ? 'bg-violet/20 text-violet'
                                          : 'text-muted-foreground/60'
                                      }`}
                                    >
                                      {matchScore != null ? (
                                        <span
                                          className={`text-[9px] font-bold ${
                                            matchScore >= 70
                                              ? 'text-neon'
                                              : matchScore >= 40
                                                ? 'text-amber-400'
                                                : 'text-destructive'
                                          }`}
                                        >
                                          {matchScore}%
                                        </span>
                                      ) : (
                                        <Target className="h-3 w-3" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate text-[11px]">{label}</span>
                                        <Badge
                                          variant={pst.variant}
                                          className="shrink-0 text-[8px] px-1 py-0 leading-tight"
                                        >
                                          {pst.label}
                                        </Badge>
                                      </div>
                                    </div>
                                    {/* Cancel workflow button */}
                                    {(p.status === 'analyzing' || p.status === 'generating') && p.workflow_run_id && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          cancelWorkflow.mutate({
                                            runId: p.workflow_run_id!,
                                            table: 'positionings',
                                            recordId: p.id,
                                            resetStatus: p.status === 'analyzing' ? 'draft' : 'analyzed',
                                          });
                                        }}
                                        className="shrink-0 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                                        title="Annuler"
                                      >
                                        <Square className="h-2.5 w-2.5" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Add positioning button */}
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => navigate(`/review/${c.id}/positioning`)}
                                className="h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5 text-[11px] font-normal text-muted-foreground/50 hover:text-violet"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Nouveau positionnement</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
              </TabsContent>

              <TabsContent value="positions" className="mt-0 focus-visible:outline-none">
                <>
                {/* Create position button */}
                <div className="px-1 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewMission(true)}
                    className="w-full gap-2 rounded-lg border-dashed border-overlay/12 bg-overlay/[0.03] py-2 text-sm text-muted-foreground hover:border-violet/40 hover:bg-violet/5 hover:text-violet"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="text-xs font-medium">Nouvelle position</span>
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span className="text-xs">Chargement...</span>
                  </div>
                ) : missions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/50">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium text-foreground">Aucune position</p>
                    <p className="mt-0.5 text-[10px]">Créez une position pour commencer</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {missions.map((m) => {
                      const isActive = m.id === activePositionId;

                      return (
                        <div
                          key={m.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate(`/positions/${m.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') navigate(`/positions/${m.id}`);
                          }}
                          className={`group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition cursor-pointer ${
                            isActive
                              ? 'bg-violet/10 text-foreground'
                              : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                              isActive
                                ? 'bg-violet/15 text-violet'
                                : 'bg-card/50 text-muted-foreground'
                            }`}
                          >
                            <Briefcase className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-medium">{m.title}</span>
                            </div>
                            {m.company && (
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                                <Building2 className="h-2.5 w-2.5 shrink-0" />
                                {m.company}
                              </p>
                            )}
                          </div>
                          {m.positioning_count > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-violet/15 px-1 text-[9px] font-semibold text-violet">
                              {m.positioning_count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
              </TabsContent>
            </div>
          </Tabs>
        </SidebarContent>

        {/* Bottom: Templates + Team + Admin */}
        <SidebarSeparator className="mx-0 w-full" />
        <SidebarFooter className="p-0">
          <SidebarGroup className="gap-0.5">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={isOnTemplates}
                  onClick={() => navigate('/templates')}
                  className={cn(
                    'text-xs',
                    isOnTemplates && 'bg-primary/10 text-foreground'
                  )}
                >
                  <Palette className="h-4 w-4" />
                  <span className="font-medium">Templates</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname.startsWith('/settings/profile')}
                  onClick={() => navigate('/settings/profile')}
                  className={cn(
                    'text-xs',
                    pathname.startsWith('/settings/profile') && 'bg-neon/10 text-neon'
                  )}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span className="font-medium">Mes technos</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {canManageTeam && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/settings/organization')}
                      onClick={() => navigate('/settings/organization')}
                      className={cn(
                        'text-xs',
                        pathname.startsWith('/settings/organization') && 'bg-violet/10 text-violet'
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                      <span className="font-medium">Organisation</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/settings/team') && !pathname.startsWith('/settings/team/skills')}
                      onClick={() => navigate('/settings/team')}
                      className={cn(
                        'text-xs',
                        pathname.startsWith('/settings/team') && !pathname.startsWith('/settings/team/skills') && 'bg-violet/10 text-violet'
                      )}
                    >
                      <Users className="h-4 w-4" />
                      <span className="font-medium">Équipe</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname.startsWith('/settings/team/skills')}
                      onClick={() => navigate('/settings/team/skills')}
                      className={cn(
                        'text-xs',
                        pathname.startsWith('/settings/team/skills') && 'bg-violet/10 text-violet'
                      )}
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span className="font-medium">Compétences équipe</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={pathname.startsWith('/admin')}
                    onClick={() => navigate('/admin')}
                    className={cn(
                      'text-xs',
                      pathname.startsWith('/admin')
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'text-muted-foreground hover:text-amber-400'
                    )}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span className="font-medium">Administration</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      {/* New mission dialog */}
      <Dialog open={showNewMission} onOpenChange={setShowNewMission}>
        <DialogContent className="sm:max-w-2xl bg-panel border-overlay/10">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/20 text-violet">
              <Plus className="h-4 w-4" />
            </div>
            Nouvelle position
          </DialogTitle>

          <div className="mt-2 flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sidebar-mission-title">Intitulé du poste *</Label>
                <Input
                  id="sidebar-mission-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Développeur Full-Stack Senior"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sidebar-mission-company">Entreprise / Client</Label>
                <Input
                  id="sidebar-mission-company"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Ex: BNP Paribas"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="sidebar-mission-desc">Fiche de poste *</Label>
              <JobDescriptionInput
                id="sidebar-mission-desc"
                value={newJobDescription}
                onChange={setNewJobDescription}
                initialMode="upload"
                placeholder="Saisissez ou collez l’intégralité de la fiche de poste…"
                textareaClassName="min-h-[300px] max-h-[60vh] text-sm"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowNewMission(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateMission}
                disabled={!newTitle.trim() || !newJobDescription.trim() || createMission.isPending}
                className="bg-violet hover:bg-violet/90"
              >
                {createMission.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Créer la position
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
