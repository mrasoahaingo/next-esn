'use client';

import { useState, useRef, useMemo, useEffect, type MouseEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ExtractedCV, PositioningAnalysis, JobPostingAnalysis } from '@/lib/schema';
import { MissionJobAnalysis } from '@/components/mission-job-analysis';
import { JobDescriptionMarkdown } from '@/components/job-description-markdown';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import type { CvExtractionStreamMeta } from '@/lib/types/cv-extraction-stream';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import {
  computeCvStepStates,
  computePositioningAnalysisStepStates,
  formatStepSummaryLine,
} from '@/lib/workflow/compute-step-status';
import { getFrenchStepShortLabel } from '@/lib/workflow/workflow-step-labels';
import { queryKeys } from '@/lib/queries/keys';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase,
  Building2,
  Upload,
  Loader2,
  FileText,
  Target,
  User,
  ArrowRight,
  ChevronRight,
  Plus,
  Square,
  Search,
  Check,
  UserPlus,
  Sparkles,
  CheckCircle2,
  GitCompare,
  X,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useMission,
  useUploadCvsForMission,
  useCancelWorkflow,
  useCandidates,
  usePositionExistingCandidates,
} from '@/lib/queries';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PositioningCandidate {
  id: string;
  workflow_run_id?: string | null;
  workflow_last_error?: WorkflowLastError | null;
  extracted_data: {
    personalInfo?: {
      firstName?: string;
      lastName?: string;
      title?: string;
      yearsOfExperience?: string;
      availability?: string;
      location?: string;
    };
    skills?: {
      technologies?: Array<{ name: string; starred?: boolean; added?: boolean }>;
      expertises?: Array<{ name: string; starred?: boolean; added?: boolean }>;
      methodologies?: Array<{ name: string; starred?: boolean; added?: boolean }>;
    };
  } | null;
  original_file_url: string;
  status: string;
}

interface SkillMatch {
  skill: string;
  category: string;
  relevance: 'strong' | 'partial' | 'missing';
  comment: string;
}

interface ExperienceRelevance {
  experience: string;
  relevance: 'high' | 'medium' | 'low';
  comment: string;
}

interface Gap {
  gap: string;
  note: string;
}

interface MissionPositioning {
  id: string;
  candidate_id: string;
  status: string;
  workflow_run_id: string | null;
  workflow_last_error?: WorkflowLastError | null;
  added_via?: 'cv_upload' | 'existing_candidate' | null;
  analysis: {
    matchScore?: number;
    matchSummary?: string;
    skillMatches?: SkillMatch[];
    experienceRelevance?: ExperienceRelevance[];
    gaps?: Gap[];
  } | null;
  created_at: string;
  candidates: PositioningCandidate | null;
}

interface MissionDetail {
  id: string;
  title: string;
  company: string | null;
  job_description: string;
  created_at: string;
  positionings: MissionPositioning[];
  job_analysis?: JobPostingAnalysis | null;
  job_analysis_input_hash?: string | null;
  job_analysis_workflow_run_id?: string | null;
  job_analysis_stale?: boolean;
  workflow_last_error?: WorkflowLastError | null;
  global_skill_keys_understood?: string[];
}

interface CandidateItem {
  id: string;
  extracted_data: {
    personalInfo?: { firstName?: string; lastName?: string; title?: string };
  } | null;
  original_file_url: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** En cours sur la mission : jusqu’à la fin de l’analyse (extract éventuel + analyse). */
const IN_PROGRESS_STATUSES = new Set(['draft', 'analyzing']);
/** Prêts : analyse terminée ; génération manuelle depuis le wizard. */
const READY_STATUSES = new Set(['analyzed', 'generating', 'generated', 'exported']);

const posStatusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'En traitement', variant: 'secondary' },
  analyzing: { label: 'Analyse…', variant: 'outline' },
  analyzed: { label: 'Analyse terminée', variant: 'outline' },
  generating: { label: 'Génération…', variant: 'outline' },
  generated: { label: 'Prêt', variant: 'default' },
  exported: { label: 'Exporté', variant: 'default' },
};

function formatCvExtractionHint(meta: CvExtractionStreamMeta | null): string | null {
  if (!meta?.phase) return null;
  if (meta.phase === 'transcription') {
    const n = meta.transcriptionChars;
    return n != null ? `Transcription du PDF (${n} caractères)` : 'Transcription du PDF';
  }
  if (meta.phase === 'reading') return 'Lecture du document';
  if (meta.phase === 'extracting' && meta.activeBranches?.length) {
    const labels: Record<string, string> = {
      identity: 'Identité',
      experiences: 'Expériences',
      education: 'Formation',
      skills: 'Compétences',
    };
    return `Extraction : ${meta.activeBranches.map((b) => labels[b] ?? b).join(' · ')}`;
  }
  return 'Extraction du CV';
}

function formatAnalysisStreamHint(meta: PositioningAnalysisStreamMeta | null): string | null {
  if (!meta) return null;
  if (meta.phase === 'synthesizing') return 'Synthèse du score…';
  if (meta.activeBranches?.length) {
    const labels: Record<string, string> = {
      skills: 'Compétences',
      experiences: 'Expériences',
      gaps: 'Lacunes',
      questions: 'Questions',
      synthesis: 'Synthèse',
    };
    return `Analyse : ${meta.activeBranches.map((b) => labels[b] ?? b).join(' · ')}`;
  }
  return 'Analyse en cours';
}

function getCandidateName(c: PositioningCandidate | CandidateItem | null) {
  if (!c) return 'Candidat';
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

function getScoreColor(score: number) {
  if (score >= 70) return 'text-neon';
  if (score >= 40) return 'text-amber-400';
  return 'text-destructive';
}

function getScoreBg(score: number) {
  if (score >= 70) return 'bg-neon/15';
  if (score >= 40) return 'bg-amber-400/15';
  return 'bg-destructive/15';
}

// ---------------------------------------------------------------------------
// Modal Tabs
// ---------------------------------------------------------------------------

type ModalTab = 'upload' | 'existing';

function PositionCvsModal({
  open,
  onOpenChange,
  missionId,
  existingCandidateIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: string;
  existingCandidateIds: Set<string>;
}) {
  const [tab, setTab] = useState<ModalTab>('upload');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadCvs = useUploadCvsForMission();
  const positionExisting = usePositionExistingCandidates();
  const { data: candidates = [] } = useCandidates() as { data: CandidateItem[] };

  const isUploading = uploadCvs.isPending;
  const isPositioning = positionExisting.isPending;

  // Candidates that have extracted data and aren't already on this mission
  const eligibleCandidates = useMemo(() => {
    return (candidates as CandidateItem[]).filter(
      (c) =>
        c.extracted_data?.personalInfo &&
        !existingCandidateIds.has(c.id)
    );
  }, [candidates, existingCandidateIds]);

  const filteredCandidates = useMemo(() => {
    if (!search.trim()) return eligibleCandidates;
    const q = search.toLowerCase();
    return eligibleCandidates.filter((c) => {
      const name = getCandidateName(c).toLowerCase();
      const title = c.extracted_data?.personalInfo?.title?.toLowerCase() ?? '';
      return name.includes(q) || title.includes(q);
    });
  }, [eligibleCandidates, search]);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.endsWith('.docx') || f.name.endsWith('.doc')
    );
    if (!fileArray.length) return;

    uploadCvs.mutate(
      { missionId, files: fileArray },
      {
        onSuccess: (data) => {
          const successCount = data.results?.length ?? 0;
          const errorCount = data.errors?.length ?? 0;

          if (successCount > 0) {
            toast.success(`${successCount} CV${successCount > 1 ? 's' : ''} importé${successCount > 1 ? 's' : ''}`, {
              description: errorCount > 0
                ? `Positionnements créés, ${errorCount} fichier${errorCount > 1 ? 's' : ''} en échec.`
                : 'Positionnements créés en brouillon.',
            });
            onOpenChange(false);
          }

          if (errorCount > 0) {
            const firstError = data.errors?.[0];
            toast.error(
              `${errorCount} import${errorCount > 1 ? 's' : ''} en échec`,
              { description: firstError ? `${firstError.fileName}: ${firstError.error}` : undefined },
            );
          }
        },
        onError: () => toast.error("Erreur lors de l'import"),
      }
    );
  };

  const handlePositionExisting = () => {
    if (!selectedIds.size) return;
    positionExisting.mutate(
      { missionId, candidateIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          toast.success(
            `${selectedIds.size} positionnement${selectedIds.size > 1 ? 's' : ''} créé${selectedIds.size > 1 ? 's' : ''}`,
            { description: 'Les candidats ont été ajoutés en brouillon.' }
          );
          setSelectedIds(new Set());
          onOpenChange(false);
        },
        onError: () => toast.error('Erreur lors du positionnement'),
      }
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Positionner des CVs</DialogTitle>
          <DialogDescription>
            Importez de nouveaux CVs ou sélectionnez des candidats déjà extraits.
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex rounded-lg bg-muted/50 border border-border p-0.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setTab('upload')}
            className={`flex-1 gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              tab === 'upload'
                ? 'bg-violet/20 text-violet shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Importer des CVs
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setTab('existing')}
            className={`flex-1 gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              tab === 'existing'
                ? 'bg-violet/20 text-violet shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Candidats existants
            {eligibleCandidates.length > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {eligibleCandidates.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Upload tab */}
        {tab === 'upload' && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
            className={`rounded-xl border-2 border-dashed transition-all ${
              isDragging
                ? 'border-violet bg-violet/5'
                : 'border-overlay/10 hover:border-violet/30 hover:bg-overlay/[0.02]'
            }`}
          >
            <label className="flex cursor-pointer flex-col items-center gap-3 px-6 py-10">
              <Input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files?.length) handleFiles(e.target.files);
                  e.target.value = '';
                }}
                className="hidden"
                accept=".pdf,.docx,.doc"
                disabled={isUploading}
              />
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-violet" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-overlay/10 bg-overlay/[0.03]">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {isUploading ? 'Import en cours...' : 'Glissez-déposez vos CVs ici'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, DOCX — plusieurs fichiers acceptés
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Existing candidates tab */}
        {tab === 'existing' && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher un candidat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {/* Candidate list */}
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg">
              {filteredCandidates.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">
                    {eligibleCandidates.length === 0
                      ? 'Aucun candidat disponible'
                      : 'Aucun résultat'}
                  </p>
                </div>
              ) : (
                filteredCandidates.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  const name = getCandidateName(c);
                  const title = c.extracted_data?.personalInfo?.title;

                  return (
                    <Button
                      key={c.id}
                      type="button"
                      variant="ghost"
                      onClick={() => toggleCandidate(c.id)}
                      className={`h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left font-normal transition-all ${
                        isSelected
                          ? 'bg-violet/10 ring-1 ring-violet/40'
                          : 'hover:bg-overlay/[0.03]'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                          isSelected
                            ? 'border-violet bg-violet text-white'
                            : 'border-overlay/20 bg-overlay/[0.03]'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-medium text-foreground truncate block">
                          {name}
                        </span>
                        {title && (
                          <span className="text-xs text-muted-foreground truncate block">
                            {title}
                          </span>
                        )}
                      </div>
                    </Button>
                  );
                })
              )}
            </div>

            {/* Action bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {selectedIds.size} candidat{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                </span>
                <Button
                  onClick={handlePositionExisting}
                  disabled={isPositioning}
                  size="sm"
                  className="bg-violet hover:bg-violet/90 text-white"
                >
                  {isPositioning ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Positionner ({selectedIds.size})
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Score Ring
// ---------------------------------------------------------------------------

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? 'var(--neon)' : score >= 40 ? '#d97706' : 'var(--destructive)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={size * 0.07} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={size * 0.07}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-bold leading-none" style={{ color, fontSize: size * 0.28 }}>{score}</span>
        <span className="leading-none opacity-50" style={{ color, fontSize: size * 0.13 }}>/100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compare Modal — charts + full-screen layout
// ---------------------------------------------------------------------------

const MAX_COMPARE = 4;

const CANDIDATE_COLORS = [
  { stroke: 'var(--violet)', fill: 'color-mix(in oklch, var(--violet) 18%, transparent)', text: 'var(--violet)' },
  { stroke: 'var(--neon)', fill: 'color-mix(in oklch, var(--neon) 18%, transparent)', text: 'var(--neon)' },
  { stroke: '#d97706', fill: 'color-mix(in oklch, #d97706 18%, transparent)', text: '#d97706' },
  { stroke: '#38bdf8', fill: 'color-mix(in oklch, #38bdf8 18%, transparent)', text: '#38bdf8' },
] as const;

// ── Per-column helpers ─────────────────────────────────────────────────────

function SkillCategoryBar({ matches }: { matches: SkillMatch[] }) {
  const strong = matches.filter((m) => m.relevance === 'strong').length;
  const partial = matches.filter((m) => m.relevance === 'partial').length;
  const missing = matches.filter((m) => m.relevance === 'missing').length;
  const total = matches.length;
  if (!total) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-overlay/[0.08]">
        {strong  > 0 && <div className="h-full bg-neon/60"       style={{ width: `${(strong /total)*100}%` }} />}
        {partial > 0 && <div className="h-full bg-amber-600/60 dark:bg-amber-400/60" style={{ width: `${(partial/total)*100}%` }} />}
        {missing > 0 && <div className="h-full bg-destructive/35" style={{ width: `${(missing/total)*100}%` }} />}
      </div>
      <span className="text-[9px] text-muted-foreground/40 shrink-0 w-12 text-right tabular-nums">
        <span className="text-neon/70">{strong}</span>
        <span className="text-muted-foreground/25 mx-0.5">·</span>
        <span className="text-amber-700/80 dark:text-amber-400/70">{partial}</span>
        <span className="text-muted-foreground/25 mx-0.5">·</span>
        <span className="text-destructive/55">{missing}</span>
      </span>
    </div>
  );
}

function RelevancePip({ level }: { level: 'strong' | 'partial' | 'missing' | 'high' | 'medium' | 'low' }) {
  const map = {
    strong:  { bg: 'bg-neon/10',        text: 'text-neon',        dot: 'bg-neon/70' },
    high:    { bg: 'bg-neon/10',        text: 'text-neon',        dot: 'bg-neon/70' },
    partial: { bg: 'bg-amber-500/15 dark:bg-amber-400/10',   text: 'text-amber-800 dark:text-amber-300',   dot: 'bg-amber-600/70 dark:bg-amber-400/70' },
    medium:  { bg: 'bg-amber-500/15 dark:bg-amber-400/10',   text: 'text-amber-800 dark:text-amber-300',   dot: 'bg-amber-600/70 dark:bg-amber-400/70' },
    missing: { bg: 'bg-destructive/10', text: 'text-destructive',  dot: 'bg-destructive/60' },
    low:     { bg: 'bg-destructive/10', text: 'text-destructive',  dot: 'bg-destructive/60' },
  }[level];
  const labels = { strong: 'Fort', high: 'Élevé', partial: 'Partiel', medium: 'Moyen', missing: 'Absent', low: 'Faible' };
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${map.bg} ${map.text}`}>
      <span className={`h-1 w-1 rounded-full ${map.dot}`} />
      {labels[level]}
    </span>
  );
}

// ── Per-candidate column (full-screen version) ────────────────────────────

function CandidateCompareColumn({
  p,
  colorIndex,
  isWinner,
}: {
  p: MissionPositioning;
  colorIndex: number;
  isWinner: boolean;
}) {
  const candidate = p.candidates;
  const name = getCandidateName(candidate);
  const pi = candidate?.extracted_data?.personalInfo;
  const score = p.analysis?.matchScore;
  const rawSkillMatches = p.analysis?.skillMatches;
  const rawExpRelevance = p.analysis?.experienceRelevance;
  const rawGaps = p.analysis?.gaps;
  const rawTechs = candidate?.extracted_data?.skills?.technologies;
  const color = CANDIDATE_COLORS[colorIndex];

  const byCategory = useMemo(() => {
    const ms = rawSkillMatches ?? [];
    const map = new Map<string, SkillMatch[]>();
    ms.forEach((sm) => {
      if (!map.has(sm.category)) map.set(sm.category, []);
      map.get(sm.category)!.push(sm);
    });
    return Array.from(map.entries()).sort(
      (a, b) => b[1].filter((m) => m.relevance === 'strong').length - a[1].filter((m) => m.relevance === 'strong').length
    );
  }, [rawSkillMatches]);

  const starredTech = useMemo(() => (rawTechs ?? []).filter((t) => t.starred).slice(0, 8), [rawTechs]);

  const skillMatches = rawSkillMatches ?? [];
  const expRelevance = rawExpRelevance ?? [];
  const gaps = rawGaps ?? [];
  const strongMatches = skillMatches.filter((m) => m.relevance === 'strong');
  const partialMatches = skillMatches.filter((m) => m.relevance === 'partial');
  const sortedExps = [...expRelevance].sort(
    (a, b) => (a.relevance === 'high' ? 0 : a.relevance === 'medium' ? 1 : 2) - (b.relevance === 'high' ? 0 : b.relevance === 'medium' ? 1 : 2)
  );

  return (
    <div className="flex flex-col gap-3 min-w-0">

        {/* ── Header card ── */}
      <div
        className="sticky top-0 z-10 rounded-2xl border border-overlay/10 bg-shell p-4 flex flex-col items-center gap-2.5 text-center overflow-hidden shadow-[0_10px_28px_-14px_var(--scrim)]"
        style={{ backgroundImage: `linear-gradient(160deg, ${color.fill}, var(--shell))` }}
      >
        {/* Winner star */}
        {isWinner && (
          <div
            className="absolute top-0 right-0 flex items-center gap-1 rounded-bl-xl rounded-tr-2xl px-2.5 py-1 text-[9px] font-semibold text-amber-400"
            style={{ background: 'rgba(245,158,11,0.12)', borderLeft: '1px solid rgba(245,158,11,0.2)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}
          >
            ★ Meilleur
          </div>
        )}

        {/* Color indicator bar at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: color.stroke }} />

        {score != null ? (
          <ScoreRing score={score} size={80} />
        ) : (
          <div className="h-20 w-20 flex items-center justify-center rounded-full bg-overlay/[0.08]">
            <User className="h-7 w-7 text-muted-foreground/30" />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">{name}</p>
          {pi?.title && (
            <p className="mt-1 text-xs text-muted-foreground/65 leading-snug">{pi.title}</p>
          )}
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap justify-center gap-1.5">
          {pi?.yearsOfExperience && (
            <span className="flex items-center gap-1 rounded-full bg-foreground/[0.06] border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
              <TrendingUp className="h-2.5 w-2.5" />
              {pi.yearsOfExperience}
            </span>
          )}
          {pi?.availability && (
            <span className="flex items-center gap-1 rounded-full bg-foreground/[0.06] border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {pi.availability}
            </span>
          )}
          {pi?.location && (
            <span className="rounded-full bg-foreground/[0.06] border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
              {pi.location}
            </span>
          )}
        </div>
      </div>

      {/* ── Skill categories ── */}
      {byCategory.length > 0 && (
        <div className="glass-panel rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Compétences par catégorie
          </p>
          <div className="space-y-2.5">
            {byCategory.sort((a, b) => a[0].localeCompare(b[0])).map(([cat, matches]) => (
              <div key={cat}>
                <span className="text-[11px] text-foreground/75 font-medium">{cat}</span>
                <div className="mt-1">
                  <SkillCategoryBar matches={matches} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-1.5 border-t border-border/60 text-[9px] text-muted-foreground/30">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-neon/60" />Fort</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-amber-600/60 dark:bg-amber-400/60" />Partiel</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-destructive/40" />Absent</span>
          </div>
        </div>
      )}

      {/* ── Strong matches ── */}
      {strongMatches.length > 0 && (
        <div className="glass-panel rounded-xl p-4 space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-neon" />
            Points forts
            <span className="ml-auto text-[9px] text-neon/50 font-normal">{strongMatches.length}</span>
          </p>
          <div className="space-y-2">
            {strongMatches.sort((a, b) => a.skill.localeCompare(b.skill)).map((m) => (
              <div key={m.skill} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-neon/65" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground/85">{m.skill}</p>
                  {m.comment && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground/45 leading-snug">{m.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Partial matches ── */}
      {partialMatches.length > 0 && (
        <div className="glass-panel rounded-xl p-4 space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-3 w-3 flex items-center justify-center shrink-0">
              <span className="h-2 w-2 rounded-full bg-amber-400/65" />
            </span>
            Compétences partielles
            <span className="ml-auto text-[9px] text-amber-400/50 font-normal">{partialMatches.length}</span>
          </p>
          <div className="space-y-1.5">
            {partialMatches.sort((a, b) => a.skill.localeCompare(b.skill)).map((m) => (
              <div key={m.skill} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/55" />
                <div className="min-w-0">
                  <p className="text-[11px] text-foreground/70">{m.skill}</p>
                  {m.comment && (
                    <p className="text-[10px] text-muted-foreground/40 leading-snug">{m.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Experiences ── */}
      {sortedExps.length > 0 && (
        <div className="glass-panel rounded-xl p-4 space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-violet" />
            Expériences pertinentes
          </p>
          <div className="space-y-2">
            {sortedExps.map((e, i) => (
              <div key={i} className="flex items-start gap-2">
                <RelevancePip level={e.relevance} />
                <p className="text-[11px] text-foreground/75 leading-snug flex-1">{e.experience}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Gaps ── */}
      {gaps.length > 0 && (
        <div className="glass-panel rounded-xl p-4 space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            Points manquants
            <span className="ml-auto text-[9px] text-amber-400/50 font-normal">{gaps.length}</span>
          </p>
          <div className="space-y-1.5">
            {gaps.map((g, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/45" />
                <p className="text-[11px] text-muted-foreground/65 leading-snug">{g.gap}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Starred technologies ── */}
      {starredTech.length > 0 && (
        <div className="glass-panel rounded-xl p-4 space-y-2.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Technologies clés
          </p>
          <div className="flex flex-wrap gap-1.5">
            {starredTech.map((t) => (
              <span
                key={t.name}
                className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                style={{ background: `${color.stroke}16`, color: color.stroke, border: `1px solid ${color.stroke}28` }}
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Full-screen Compare modal ─────────────────────────────────────────────

function CompareCvsModal({
  open,
  onOpenChange,
  positionings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionings: MissionPositioning[];
}) {
  const count = positionings.length;
  const gridCols = count === 2 ? 'grid-cols-1 sm:grid-cols-2' : count === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  const winnerIndex = positionings.reduce((best, p, i) =>
    (p.analysis?.matchScore ?? 0) > (positionings[best]?.analysis?.matchScore ?? 0) ? i : best
  , 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-[calc(100vw-3rem)] !max-w-[1600px] !h-[calc(100dvh-3rem)] !max-h-[1000px] !rounded-2xl !p-0 !gap-0 !ring-1 !ring-border !border-0 bg-shell !flex !flex-col !overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 flex-col gap-3 border-b border-border bg-panel/80 px-6 py-3.5 backdrop-blur-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet/15">
                <GitCompare className="h-4 w-4 text-violet" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold">
                  Comparaison — {count} candidat{count > 1 ? 's' : ''}
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-[11px] text-muted-foreground/45">
                  Vue synthétique et détaillée des profils
                </DialogDescription>
              </div>
            </div>
            {/* Candidate color legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 md:border-t-0 md:border-l md:border-overlay/10 md:pl-6 md:pt-0">
              {positionings.map((p, i) => (
                <span key={p.id} className="flex items-center gap-1.5 text-[11px] text-foreground/55">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: CANDIDATE_COLORS[i].stroke }} />
                  {getCandidateName(p.candidates).split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            className="shrink-0 self-end text-muted-foreground hover:bg-overlay/10 hover:text-foreground sm:self-start"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Candidate columns ── */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-pt-0 px-6 pb-5">
          {count === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Aucun candidat sélectionné</p>
            </div>
          ) : (
            <div className={`grid gap-4 items-start pt-4 ${gridCols}`}>
              {positionings.map((p, i) => (
                <CandidateCompareColumn
                  key={p.id}
                  p={p}
                  colorIndex={i}
                  isWinner={i === winnerIndex && count > 1}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Positioning Row
// ---------------------------------------------------------------------------

function PositioningRow({
  p,
  missionId,
  onNavigate,
  onCancelWorkflow,
  selectable,
  isSelected,
  onToggleSelect,
}: {
  p: MissionPositioning;
  missionId: string;
  /** Cible absolue (ex. /review/id ou /review/id/positioning/pid) */
  onNavigate: (href: string) => void;
  onCancelWorkflow: (args: {
    runId: string;
    table: 'candidates' | 'positionings';
    recordId: string;
    resetStatus: string;
    missionId?: string;
  }) => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const candidate = p.candidates;
  const name = getCandidateName(candidate);
  const title = candidate?.extracted_data?.personalInfo?.title;
  const score = p.analysis?.matchScore;
  const pst = posStatusConfig[p.status] ?? posStatusConfig.draft;
  const addedVia = p.added_via ?? 'existing_candidate';
  const candidateStatus = candidate?.status ?? '';

  const extractActive =
    addedVia === 'cv_upload' &&
    !!candidate?.workflow_run_id &&
    ['uploaded', 'extracting'].includes(candidateStatus);

  const analyzeActive = p.status === 'analyzing' && !!p.workflow_run_id;

  const invalidateMission = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(missionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.list() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const extractStream = useWorkflowStream<Partial<ExtractedCV>, CvExtractionStreamMeta>({
    api: '/api/extract',
    runId: extractActive ? (candidate?.workflow_run_id ?? undefined) : undefined,
    runStatus: extractActive ? 'extracting' : undefined,
    activeStatuses: ['extracting'],
    onFinish: () => {
      invalidateMission();
      toast.success('Extraction terminee avec succes');
    },
  });

  const analysisStream = useWorkflowStream<Partial<PositioningAnalysis>, PositioningAnalysisStreamMeta>({
    api: '/api/positioning/analyze',
    runId: analyzeActive ? (p.workflow_run_id ?? undefined) : undefined,
    runStatus: analyzeActive ? 'analyzing' : undefined,
    activeStatuses: ['analyzing'],
    onFinish: () => {
      invalidateMission();
      toast.success('Analyse terminee avec succes');
    },
  });

  useEffect(() => {
    if (!extractStream.error) return;
    const key = extractStream.errorStepKey ?? candidate?.workflow_last_error?.stepKey;
    const label = key ? getFrenchStepShortLabel('cv', key) : 'Extraction CV';
    toast.error(`${label} : échec. Réessayez ou contactez le support.`, { duration: 8000 });
  }, [extractStream.error, extractStream.errorStepKey, candidate?.workflow_last_error?.stepKey]);

  useEffect(() => {
    if (!analysisStream.error) return;
    const key = analysisStream.errorStepKey ?? p.workflow_last_error?.stepKey;
    const label = key ? getFrenchStepShortLabel('positioningAnalysis', key) : 'Analyse de matching';
    toast.error(`${label} : échec. Réessayez ou contactez le support.`, { duration: 8000 });
  }, [analysisStream.error, analysisStream.errorStepKey, p.workflow_last_error?.stepKey]);

  const extractCancelRunId = candidate?.workflow_run_id ?? extractStream.activeRunId ?? null;
  const analyzeCancelRunId = p.workflow_run_id ?? analysisStream.activeRunId ?? null;

  const analysisComplete = READY_STATUSES.has(p.status);
  const isCandidateReady = ['reviewing', 'ready', 'generated'].includes(candidateStatus);
  const extractionPhaseDone = addedVia === 'existing_candidate' || isCandidateReady;
  /** Extraction fichier en cours → détail sur la fiche CV ; sinon → wizard positionnement */
  const navigateToReviewOnly =
    addedVia === 'cv_upload' && ['uploaded', 'extracting'].includes(candidateStatus);
  const candidateId = p.candidate_id;
  const canNavigate = !!candidateId;

  const extractStepActive = extractActive || extractStream.isLoading;
  const analyzeStepActive =
    p.status === 'analyzing' || analysisStream.isLoading || (p.status === 'draft' && extractionPhaseDone && !analysisComplete);

  const showExtractStepList =
    addedVia === 'cv_upload' && (extractStepActive || candidate?.status === 'error');
  const showAnalysisStepList =
    p.status === 'analyzing' || analysisStream.isLoading || p.status === 'error';

  const missionExtractRows = useMemo(
    () =>
      computeCvStepStates({
        streamMeta: extractStream.streamMeta,
        partialData:
          extractStream.object ?? (candidate?.extracted_data as Partial<ExtractedCV> | null) ?? null,
        isStreaming: extractStream.isLoading,
        errorStepKey: extractStream.errorStepKey,
        persistedError: candidate?.workflow_last_error ?? null,
        workflowFailed: candidate?.status === 'error',
      }),
    [
      extractStream.streamMeta,
      extractStream.object,
      extractStream.isLoading,
      extractStream.errorStepKey,
      candidate?.extracted_data,
      candidate?.workflow_last_error,
      candidate?.status,
    ],
  );

  const missionExtractSummary = useMemo(
    () => formatStepSummaryLine('cv', missionExtractRows),
    [missionExtractRows],
  );

  const missionAnalysisRows = useMemo(
    () =>
      computePositioningAnalysisStepStates({
        streamMeta: analysisStream.streamMeta,
        partialData: analysisStream.object ?? (p.analysis as Partial<PositioningAnalysis> | null) ?? null,
        isStreaming: analysisStream.isLoading,
        errorStepKey: analysisStream.errorStepKey,
        persistedError: p.workflow_last_error ?? null,
        workflowFailed: p.status === 'error',
      }),
    [
      analysisStream.streamMeta,
      analysisStream.object,
      analysisStream.isLoading,
      analysisStream.errorStepKey,
      p.analysis,
      p.workflow_last_error,
      p.status,
    ],
  );

  const missionAnalysisSummary = useMemo(
    () => formatStepSummaryLine('positioningAnalysis', missionAnalysisRows),
    [missionAnalysisRows],
  );

  const streamHint =
    formatCvExtractionHint(extractStream.streamMeta) ?? formatAnalysisStreamHint(analysisStream.streamMeta);

  const showBusy =
    !analysisComplete ||
    extractStepActive ||
    analyzeStepActive ||
    (p.status === 'draft' && addedVia === 'cv_upload' && !isCandidateReady);

  const showCancelExtract = extractStepActive && !!extractCancelRunId && !!candidate?.id;
  const showCancelPositioning =
    (p.status === 'analyzing' || p.status === 'generating' || analysisStream.isLoading) &&
    !!analyzeCancelRunId;

  const handleCancel = (e: MouseEvent) => {
    e.stopPropagation();
    if (showCancelExtract && extractCancelRunId && candidate?.id) {
      extractStream.stop();
      onCancelWorkflow({
        runId: extractCancelRunId,
        table: 'candidates',
        recordId: candidate.id,
        resetStatus: 'uploaded',
        missionId,
      });
      return;
    }
    if (showCancelPositioning && analyzeCancelRunId) {
      analysisStream.stop();
      onCancelWorkflow({
        runId: analyzeCancelRunId,
        table: 'positionings',
        recordId: p.id,
        resetStatus: p.status === 'analyzing' ? 'draft' : 'analyzed',
        missionId,
      });
    }
  };

  const go = () => {
    if (!canNavigate) return;
    if (navigateToReviewOnly) {
      onNavigate(`/review/${candidateId}`);
    } else {
      onNavigate(`/review/${candidateId}/positioning/${p.id}`);
    }
  };

  return (
    <div
      role="button"
      tabIndex={canNavigate ? 0 : -1}
      onClick={go}
      onKeyDown={(e) => {
        if (!canNavigate) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          go();
        }
      }}
      className={`group flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${
        canNavigate
          ? `cursor-pointer ${isSelected ? 'bg-violet/[0.08] ring-1 ring-violet/30' : 'hover:bg-overlay/[0.03]'}`
          : 'cursor-not-allowed opacity-80'
      }`}
    >
      {selectable && (
        <Button
          type="button"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(p.id);
          }}
          className={`h-5 w-5 shrink-0 rounded border p-0 transition-all ${
            isSelected
              ? 'border-violet bg-violet text-white'
              : 'border-overlay/20 bg-overlay/[0.03] opacity-0 group-hover:opacity-100'
          }`}
          title={isSelected ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </Button>
      )}

      {score != null ? (
        <div
          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${getScoreBg(score)}`}
        >
          <span className={`text-base font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className={`text-[7px] font-medium ${getScoreColor(score)} opacity-70`}>/ 100</span>
        </div>
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-overlay/[0.04]">
          {showBusy ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet/60" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
        </div>
        {title && <p className="mt-0.5 text-xs text-muted-foreground truncate">{title}</p>}

        {addedVia === 'cv_upload' && (
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
            <span
              className={`rounded-md px-1.5 py-0.5 ${
                !extractionPhaseDone
                  ? 'bg-violet/20 text-violet ring-1 ring-violet/30'
                  : 'bg-overlay/10 text-muted-foreground'
              }`}
            >
              {!extractionPhaseDone ? '1. Extraction du CV' : '1. CV extrait'}
            </span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40 shrink-0" />
            <span
              className={`rounded-md px-1.5 py-0.5 ${
                p.status === 'analyzing'
                  ? 'bg-sky-400/20 text-sky-200 ring-1 ring-sky-400/30'
                  : analysisComplete
                    ? 'bg-overlay/10 text-muted-foreground'
                    : 'bg-sky-400/10 text-sky-300/90'
              }`}
            >
              {analysisComplete ? '2. Analyse terminée' : p.status === 'analyzing' ? '2. Analyse…' : '2. Analyse de matching'}
            </span>
          </div>
        )}

        {addedVia === 'existing_candidate' && (
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
            <span
              className={`rounded-md px-1.5 py-0.5 ${
                p.status === 'analyzing'
                  ? 'bg-sky-400/20 text-sky-200 ring-1 ring-sky-400/30'
                  : analysisComplete
                    ? 'bg-overlay/10 text-muted-foreground'
                    : 'bg-sky-400/10 text-sky-300/90'
              }`}
            >
              {analysisComplete ? 'Analyse terminée' : p.status === 'analyzing' ? 'Analyse…' : 'Analyse de matching'}
            </span>
          </div>
        )}

        {showExtractStepList && (
          <div className="mt-2 w-full max-w-full" onClick={(e) => e.stopPropagation()}>
            <WorkflowStepList rows={missionExtractRows} summaryLine={missionExtractSummary} />
          </div>
        )}
        {showAnalysisStepList && (
          <div className="mt-2 w-full max-w-full" onClick={(e) => e.stopPropagation()}>
            <WorkflowStepList rows={missionAnalysisRows} summaryLine={missionAnalysisSummary} />
          </div>
        )}
        {streamHint &&
          (extractStepActive || analyzeStepActive) &&
          !showExtractStepList &&
          !showAnalysisStepList && (
          <p className="mt-1 text-[10px] text-violet/80 truncate">{streamHint}</p>
        )}

        {canNavigate && !analysisComplete && (
          <p className="mt-1 text-[10px] text-muted-foreground/70">
            {navigateToReviewOnly
              ? 'Cliquez pour ouvrir la fiche CV — annuler l’extraction ou supprimer le candidat depuis cette page.'
              : 'Cliquez pour ouvrir le positionnement — annuler l’analyse ou agir sur le dossier depuis le détail.'}
          </p>
        )}

        {p.status === 'analyzed' && (
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            La génération e-mail / CV retravaillé se lance depuis le positionnement.
          </p>
        )}

        {p.analysis?.matchSummary && analysisComplete && (
          <Tooltip>
            <TooltipTrigger className="w-full">
              <p className="mt-1 text-[11px] text-muted-foreground/60 w-full truncate cursor-help text-left">
                {p.analysis.matchSummary}
              </p>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-sm text-xs">
              {p.analysis.matchSummary}
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-[10px] text-muted-foreground/50">
          {new Date(p.created_at).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          })}
        </span>
        <Badge variant={pst.variant} className="text-[9px]">
          {pst.label}
        </Badge>

        {(showCancelExtract || showCancelPositioning) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleCancel}
            className="shrink-0 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
            title="Annuler"
          >
            <Square className="h-3 w-3" />
          </Button>
        )}

        {canNavigate && (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 transition group-hover:text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PositionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const missionId = params?.id as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  /** Ouvre la modale « Positionner des CVs » si l’URL contient ?positionner=1 (puis retire le paramètre). */
  useEffect(() => {
    if (searchParams.get('positionner') !== '1') return;
    setIsModalOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete('positionner');
    const qs = next.toString();
    const base = `/positions/${missionId}`;
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  }, [missionId, router, searchParams]);

  const { data: mission, isLoading } = useMission(missionId) as {
    data: MissionDetail | undefined;
    isLoading: boolean;
  };
  const cancelWorkflow = useCancelWorkflow();

  const positionings = useMemo(
    () => mission?.positionings ?? [],
    [mission?.positionings]
  );

  const drafts = positionings.filter((p) => IN_PROGRESS_STATUSES.has(p.status));
  const ready = positionings.filter((p) => READY_STATUSES.has(p.status));

  const existingCandidateIds = useMemo(
    () => new Set(positionings.map((p) => p.candidate_id)),
    [positionings]
  );

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      } else {
        toast.info(`Maximum ${MAX_COMPARE} candidats à la fois`, {
          description: 'Désélectionnez un candidat pour en ajouter un autre.',
        });
      }
      return next;
    });
  };

  const selectedPositionings = useMemo(
    () => ready.filter((p) => compareIds.has(p.id)),
    [ready, compareIds]
  );

  const missionTab = useMemo(() => {
    const t = searchParams.get('tab');
    if (t === 'analysis' || t === 'positionings') return t;
    return (positionings.length > 0 ? 'positionings' : 'analysis') as 'analysis' | 'positionings';
  }, [searchParams, positionings.length]);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        <p className="text-sm">Position introuvable</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 overflow-hidden px-6 py-4">
        {/* Header */}
        <div className="glass-panel shrink-0 rounded-2xl p-4 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet/20 text-violet neon-ring">
              <Briefcase className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold title-gradient">{mission.title}</h1>
              <div className="mt-1 flex items-center gap-3">
                {mission.company && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {mission.company}
                  </span>
                )}
                <span className="text-xs text-muted-foreground/50">
                  Créée le{' '}
                  {new Date(mission.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-violet hover:bg-violet/90 text-white shrink-0"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Positionner des CVs
            </Button>
          </div>
        </div>

        <Tabs
          key={missionId}
          value={missionTab}
          onValueChange={(v) => {
            const next = v as 'analysis' | 'positionings';
            router.replace(`/positions/${missionId}?tab=${next}`);
          }}
          className="flex min-h-0 w-full flex-1 flex-col overflow-hidden"
        >
          <TabsList
            variant="segmented"
            className="mb-3 w-full shrink-0 grid grid-cols-2 sm:max-w-lg"
          >
            <TabsTrigger value="analysis" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              Analyse de la fiche
            </TabsTrigger>
            <TabsTrigger value="positionings" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 shrink-0" />
              CVs positionnés
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 tabular-nums">
                {positionings.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="analysis"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-2 lg:grid-rows-1 lg:gap-6">
              <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-4 md:p-6">
                  <div className="mb-3 flex shrink-0 items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-violet/60" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      Fiche de poste
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <JobDescriptionMarkdown
                      content={mission.job_description}
                      className="text-muted-foreground/80"
                    />
                  </div>
                </div>
              </aside>

              <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                <MissionJobAnalysis
                  missionId={missionId}
                  jobDescription={mission.job_description}
                  job_analysis={mission.job_analysis ?? null}
                  job_analysis_workflow_run_id={mission.job_analysis_workflow_run_id ?? null}
                  job_analysis_stale={mission.job_analysis_stale ?? false}
                  workflow_last_error={mission.workflow_last_error ?? null}
                  global_skill_keys_understood={mission.global_skill_keys_understood ?? []}
                  className="mb-0 flex min-h-0 flex-1 flex-col overflow-hidden"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="positionings"
            className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
          >
            <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl p-4 md:p-6">
              <div className="mb-4 flex shrink-0 flex-wrap items-center gap-2 gap-y-1">
                <Users className="h-4 w-4 shrink-0 text-violet" />
                <h2 className="text-sm font-semibold text-foreground">CVs sur cette mission</h2>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 tabular-nums">
                  {positionings.length}
                </Badge>
                {ready.length >= 2 && (
                  <span className="ml-auto text-[10px] text-muted-foreground/50">
                    Sélectionner les profils prêts pour comparer
                  </span>
                )}
              </div>

              {positionings.length === 0 ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-8 text-muted-foreground">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/50">
                    <Target className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">Aucun CV positionné</p>
                  <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                    Importez des CVs ou sélectionnez des candidats existants pour commencer
                  </p>
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    variant="outline"
                    className="border-violet/30 text-violet hover:bg-violet/10"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Positionner des CVs
                  </Button>
                </div>
              ) : (
                <div className="min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain pr-1">
                  {drafts.length > 0 && (
                    <section aria-labelledby="positionings-in-progress">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Sparkles className="h-4 w-4 text-violet shrink-0" />
                        <h3
                          id="positionings-in-progress"
                          className="text-xs font-semibold text-foreground tracking-tight"
                        >
                          En cours
                        </h3>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-violet/30 text-violet/90">
                          {drafts.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 rounded-xl border border-border bg-muted/40 p-1">
                        {drafts.map((p) => (
                          <PositioningRow
                            key={p.id}
                            p={p}
                            missionId={missionId}
                            onNavigate={(href) => router.push(href)}
                            onCancelWorkflow={(args) => cancelWorkflow.mutate(args)}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {ready.length > 0 && (
                    <section
                      aria-labelledby="positionings-ready"
                      className={drafts.length > 0 ? 'border-t border-border pt-8' : ''}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <CheckCircle2 className="h-4 w-4 text-neon shrink-0" />
                        <h3
                          id="positionings-ready"
                          className="text-xs font-semibold text-foreground tracking-tight"
                        >
                          Analysés et prêts
                        </h3>
                        <Badge variant="default" className="text-[9px] px-1.5 py-0 bg-neon/20 text-neon border-0">
                          {ready.length}
                        </Badge>
                      </div>
                      <div className="space-y-1 rounded-xl border border-border bg-muted/40 p-1">
                        {ready.map((p) => (
                          <PositioningRow
                            key={p.id}
                            p={p}
                            missionId={missionId}
                            onNavigate={(href) => router.push(href)}
                            onCancelWorkflow={(args) => cancelWorkflow.mutate(args)}
                            selectable={ready.length >= 2}
                            isSelected={compareIds.has(p.id)}
                            onToggleSelect={toggleCompare}
                          />
                        ))}
                      </div>
                    </section>
                  )}

                  {drafts.length > 0 && ready.length === 0 && (
                    <p className="text-xs text-muted-foreground/80 text-center py-2">
                      Aucun profil prêt pour l’instant — les lignes ci-dessus passent ici une fois l’analyse terminée.
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Modals */}
        <PositionCvsModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          missionId={missionId}
          existingCandidateIds={existingCandidateIds}
        />

        <CompareCvsModal
          open={isCompareOpen}
          onOpenChange={(open) => {
            setIsCompareOpen(open);
            if (!open) setCompareIds(new Set());
          }}
          positionings={selectedPositionings}
        />
      </div>

      {/* Floating compare bar */}
      {compareIds.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-violet/30 bg-shell/95 px-5 py-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              {selectedPositionings.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-violet/40 bg-violet/20 text-[9px] font-bold text-violet"
                >
                  {getCandidateName(p.candidates).charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">
              {compareIds.size} candidat{compareIds.size > 1 ? 's' : ''} sélectionné{compareIds.size > 1 ? 's' : ''}
            </span>
          </div>

          <div className="h-4 w-px bg-overlay/[0.08]" />

          <Button
            type="button"
            variant="link"
            onClick={() => setCompareIds(new Set())}
            className="h-auto p-0 text-xs text-muted-foreground"
          >
            Effacer
          </Button>

          <Button
            onClick={() => setIsCompareOpen(true)}
            size="sm"
            className="bg-violet hover:bg-violet/90 text-white gap-2"
          >
            <GitCompare className="h-3.5 w-3.5" />
            Comparer
          </Button>
        </div>
      )}
    </div>
  );
}
