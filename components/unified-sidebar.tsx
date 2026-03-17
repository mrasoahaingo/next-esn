'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCandidates, usePositionings, useUploadCv } from '@/lib/queries';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Upload,
  Loader2,
  User,
  Briefcase,
  Plus,
  ChevronRight,
  Target,
  Palette,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDemoModeStore } from '@/lib/stores/demo-mode.store';

interface Candidate {
  id: string;
  status: string;
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
  const [expandedCvs, setExpandedCvs] = useState<Set<string>>(new Set());
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { isDemoMode, toggleDemoMode } = useDemoModeStore();

  const { data: candidatesData, isLoading: isLoadingCandidates } = useCandidates();
  const { data: positioningsData, isLoading: isLoadingPositionings } = usePositionings();
  const uploadCv = useUploadCv();
  const isUploading = uploadCv.isPending;

  const candidates: Candidate[] = isDemoMode ? [] : (Array.isArray(candidatesData) ? candidatesData : []);
  const positionings: Positioning[] = isDemoMode ? [] : (Array.isArray(positioningsData) ? positioningsData : []);
  const isLoading = !isDemoMode && (isLoadingCandidates || isLoadingPositionings);

  const activeCvId = params?.id as string | undefined;
  const activePositioningId = params?.positioningId as string | undefined;

  // Auto-expand the active CV
  useEffect(() => {
    if (activeCvId) {
      setExpandedCvs((prev) => new Set(prev).add(activeCvId));
    }
  }, [activeCvId]);

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

  const getPositioningLabel = (p: Positioning) => {
    if (p.missions?.title) return p.missions.title;
    const firstLine = p.job_description.trim().split('\n')[0];
    return firstLine.length > 40 ? firstLine.slice(0, 37) + '...' : firstLine;
  };

  const toggleExpand = (id: string) => {
    setExpandedCvs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isOnTemplates = pathname.startsWith('/templates');

  return (
    <aside className="flex h-screen w-[280px] flex-col border-r border-violet/10 bg-panel">
      {/* Header */}
      <Link href="/" className="flex items-center gap-3 px-4 py-4">
        <svg
          aria-hidden="true"
          className="h-5 w-auto shrink-0"
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
        <span className="text-sm font-semibold text-foreground tracking-wide">HIMEO</span>
      </Link>

      {/* Demo mode toggle */}
      <div className="mx-3 mb-2 flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
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

      <Separator />

      {/* Upload */}
      <div className="px-3 py-3">
        <label className="relative block cursor-pointer">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            accept=".pdf,.docx,.doc"
            disabled={isUploading}
          />
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/12 bg-white/[0.03] px-3 py-2.5 text-sm text-muted-foreground transition hover:border-accent/40 hover:bg-accent/5 hover:text-accent">
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

      {/* CV list with nested positionings */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
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
              const isActive = c.id === activeCvId && !activePositioningId;
              const isExpanded = expandedCvs.has(c.id);
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
                    <button
                      onClick={() => router.push(`/review/${c.id}`)}
                      className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2 text-left transition ${
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

                      {/* Positioning count badge */}
                      {hasPositionings && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-violet/15 px-1 text-[9px] font-semibold text-violet">
                          {cvPositionings.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Nested positionings */}
                  {isExpanded && (
                    <div className="ml-6 mt-0.5 mb-1 space-y-0.5 border-l border-white/[0.06] pl-2">
                      {cvPositionings.map((p) => {
                        const label = getPositioningLabel(p);
                        const pst = posStatusConfig[p.status] ?? posStatusConfig.draft;
                        const matchScore = p.analysis?.matchScore;
                        const isPosActive = p.id === activePositioningId;

                        return (
                          <button
                            key={p.id}
                            onClick={() =>
                              router.push(`/review/${c.id}/positioning/${p.id}`)
                            }
                            className={`group/pos flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition ${
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
                          </button>
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
      </div>

      {/* Bottom: Templates */}
      <Separator />
      <div className="px-2 py-2">
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
      </div>
    </aside>
  );
}
