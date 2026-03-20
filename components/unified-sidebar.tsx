'use client';

import { useState, useMemo } from 'react';
import { useCandidates, usePositionings, useMissions, useUploadCv, useCancelWorkflow, useCreateMission } from '@/lib/queries';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { useAuth, UserButton, OrganizationSwitcher } from '@clerk/nextjs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Label as SwitchLabel } from '@/components/ui/label';
import { useDemoModeStore } from '@/lib/stores/demo-mode.store';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { useOrgRole } from '@/lib/hooks/useOrgRole';

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
  const [activeTab, setActiveTab] = useState<'cvs' | 'positions'>('cvs');
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

  const { data: candidatesData, isLoading: isLoadingCandidates } = useCandidates();
  const { data: positioningsData, isLoading: isLoadingPositionings } = usePositionings();
  const { data: missionsData, isLoading: isLoadingMissions } = useMissions();
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    uploadCv.mutate(e.target.files[0], {
      onSuccess: (data) => {
        toast.success('CV uploadé', {
          description: 'Extraction automatique en cours...',
        });
        router.push(`/review/${data.id}`);
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
            router.push(`/positions/${mission.id}`);
          }
        },
      }
    );
  };

  const isOnTemplates = pathname.startsWith('/templates');

  if (!isLoaded || !isSignedIn) return null;

  return (
    <aside className="flex h-screen w-[280px] flex-col border-r border-violet/10 bg-panel">
      {/* Header */}
      <Link
        href="/"
        className="flex items-center px-4 py-3.5 transition-opacity hover:opacity-90"
      >
        <Image
          src="/esneo-full.svg"
          alt="Esneo"
          width={120}
          height={30}
          className="max-w-full object-contain object-left"
          priority
          unoptimized
        />
      </Link>

      {/* Demo mode toggle */}
      {!isProduction && (
        <div className="mx-3 mb-2 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
          <SwitchLabel htmlFor="demo-mode" className="text-[11px] font-medium text-muted-foreground cursor-pointer">
            Mode démo
          </SwitchLabel>
          <Switch
            id="demo-mode"
            checked={isDemoMode}
            onCheckedChange={toggleDemoMode}
            className="scale-75"
          />
        </div>
      )}

      <Separator />

      {/* Tab switcher */}
      <div className="mx-3 mt-3 mb-2 flex rounded-lg bg-white/[0.03] p-0.5">
        <button
          onClick={() => setActiveTab('cvs')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            activeTab === 'cvs'
              ? 'bg-accent/15 text-accent'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-3 w-3" />
          CVs
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            activeTab === 'positions'
              ? 'bg-violet/15 text-violet'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Briefcase className="h-3 w-3" />
          Positions
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {activeTab === 'cvs' ? (
          /* ─── CVs Tab ──────────────────────────────────── */
          <>
            {/* Upload */}
            <div className="px-1 py-2">
              <label className="relative block cursor-pointer">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  accept=".pdf,.docx,.doc"
                  disabled={isUploading}
                />
                <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/12 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground transition hover:border-accent/40 hover:bg-accent/5 hover:text-accent">
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
              <div className="space-y-0.5">
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
                        <button
                          onClick={() => toggleExpand(c.id)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground/50 transition hover:text-foreground"
                        >
                          <ChevronRight
                            className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </button>

                        {/* CV button */}
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/review/${c.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') router.push(`/review/${c.id}`);
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                cancelWorkflow.mutate({
                                  runId: c.workflow_run_id!,
                                  table: 'candidates',
                                  recordId: c.id,
                                  resetStatus: 'uploaded',
                                });
                              }}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive"
                              title="Annuler l'extraction"
                            >
                              <Square className="h-3 w-3" />
                            </button>
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
                        <div className="ml-6 mt-0.5 mb-1 space-y-0.5 border-l border-white/[0.06] pl-2">
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
                                  router.push(`/review/${c.id}/positioning/${p.id}`)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') router.push(`/review/${c.id}/positioning/${p.id}`);
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      cancelWorkflow.mutate({
                                        runId: p.workflow_run_id!,
                                        table: 'positionings',
                                        recordId: p.id,
                                        resetStatus: p.status === 'analyzing' ? 'draft' : 'analyzed',
                                      });
                                    }}
                                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive"
                                    title="Annuler"
                                  >
                                    <Square className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          {/* Add positioning button */}
                          <button
                            onClick={() => router.push(`/review/${c.id}/positioning`)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] text-muted-foreground/50 transition hover:text-violet"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Nouveau positionnement</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* ─── Positions Tab ────────────────────────────── */
          <>
            {/* Create position button */}
            <div className="px-1 py-2">
              <button
                onClick={() => setShowNewMission(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/12 bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground transition hover:border-violet/40 hover:bg-violet/5 hover:text-violet"
              >
                <Plus className="h-4 w-4" />
                <span className="text-xs font-medium">Nouvelle position</span>
              </button>
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
              <div className="space-y-0.5">
                {missions.map((m) => {
                  const isActive = m.id === activePositionId;

                  return (
                    <div
                      key={m.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/positions/${m.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') router.push(`/positions/${m.id}`);
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
        )}
      </div>

      {/* Bottom: Templates + Team + Admin */}
      <Separator />
      <div className="px-2 py-2 space-y-0.5">
        <button
          onClick={() => router.push('/templates')}
          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
            isOnTemplates
              ? 'bg-primary/10 text-foreground'
              : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span className="font-medium">Templates</span>
        </button>
        {canManageTeam && (
          <button
            onClick={() => router.push('/settings/team')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
              pathname.startsWith('/settings/team')
                ? 'bg-violet/10 text-violet'
                : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="font-medium">Équipe</span>
          </button>
        )}
        {isSuperAdmin && (
          <button
            onClick={() => router.push('/admin')}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
              pathname.startsWith('/admin')
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-muted-foreground hover:bg-card/60 hover:text-amber-400'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="font-medium">Administration</span>
          </button>
        )}
      </div>

      {/* User & Organization */}
      <Separator />
      <div className="flex items-center justify-between px-3 py-3">
        <OrganizationSwitcher
          hidePersonal
          afterSelectOrganizationUrl="/"
          afterCreateOrganizationUrl="/"
          appearance={{
            elements: {
              rootBox: 'flex-1 min-w-0',
              organizationSwitcherTrigger:
                'w-full justify-between rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:bg-card/60 hover:text-foreground border-0',
            },
          }}
        />
        <UserButton
          afterSwitchSessionUrl="/"
          appearance={{
            elements: {
              avatarBox: 'h-7 w-7',
            },
          }}
        />
      </div>

      {/* New mission dialog */}
      <Dialog open={showNewMission} onOpenChange={setShowNewMission}>
        <DialogContent className="sm:max-w-2xl bg-panel border-white/10">
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/20 text-violet">
              <Plus className="h-4 w-4" />
            </div>
            Nouvelle position
          </DialogTitle>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sidebar-mission-title">Intitulé du poste *</Label>
                <Input
                  id="sidebar-mission-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Développeur Full-Stack Senior"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sidebar-mission-company">Entreprise / Client</Label>
                <Input
                  id="sidebar-mission-company"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Ex: BNP Paribas"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sidebar-mission-desc">Description du poste *</Label>
              <Textarea
                id="sidebar-mission-desc"
                value={newJobDescription}
                onChange={(e) => setNewJobDescription(e.target.value)}
                placeholder="Collez ici la fiche de poste complète..."
                className="min-h-[300px] max-h-[60vh] text-sm"
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
    </aside>
  );
}
