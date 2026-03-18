'use client';

import { useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Building2,
  Upload,
  Loader2,
  FileText,
  Target,
  User,
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

const DRAFT_STATUSES = new Set(['draft', 'analyzing', 'analyzed', 'generating']);
const READY_STATUSES = new Set(['generated', 'exported']);

const posStatusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  analyzing: { label: 'Analyse...', variant: 'outline' },
  analyzed: { label: 'Analysé', variant: 'outline' },
  generating: { label: 'Génération...', variant: 'outline' },
  generated: { label: 'Prêt', variant: 'default' },
  exported: { label: 'Exporté', variant: 'default' },
};

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
          const count = data.results?.length ?? 0;
          toast.success(`${count} CV${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''}`, {
            description: 'Positionnements créés en brouillon.',
          });
          onOpenChange(false);
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
        <div className="flex rounded-lg bg-black/20 border border-white/[0.06] p-0.5">
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all ${
              tab === 'upload'
                ? 'bg-violet/20 text-violet shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            Importer des CVs
          </button>
          <button
            onClick={() => setTab('existing')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-all ${
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
          </button>
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
                : 'border-white/10 hover:border-violet/30 hover:bg-white/[0.02]'
            }`}
          >
            <label className="flex cursor-pointer flex-col items-center gap-3 px-6 py-10">
              <input
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
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
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
                    <button
                      key={c.id}
                      onClick={() => toggleCandidate(c.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                        isSelected
                          ? 'bg-violet/10 ring-1 ring-violet/40'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
                          isSelected
                            ? 'border-violet bg-violet text-white'
                            : 'border-white/20 bg-white/[0.03]'
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
                    </button>
                  );
                })
              )}
            </div>

            {/* Action bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
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
  const color = score >= 70 ? 'var(--color-neon, #39d353)' : score >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ display: 'block' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.07} />
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
  { stroke: '#8b5cf6', fill: 'rgba(139,92,246,0.14)', text: '#8b5cf6' },
  { stroke: '#39d353', fill: 'rgba(57,211,83,0.14)',  text: '#39d353' },
  { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.14)', text: '#f59e0b' },
  { stroke: '#38bdf8', fill: 'rgba(56,189,248,0.14)', text: '#38bdf8' },
] as const;

// ── Score horizontal bars ──────────────────────────────────────────────────

function ScoreComparisonChart({ positionings }: { positionings: MissionPositioning[] }) {
  const winner = positionings.reduce((best, p) =>
    (p.analysis?.matchScore ?? 0) > (best.analysis?.matchScore ?? 0) ? p : best
  , positionings[0]);

  return (
    <div className="flex flex-col h-full gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
        Scores de matching
      </p>
      <div className="flex flex-col justify-around flex-1 gap-3">
        {positionings.map((p, i) => {
          const score = p.analysis?.matchScore ?? 0;
          const name = getCandidateName(p.candidates);
          const color = CANDIDATE_COLORS[i];
          const isWinner = p.id === winner.id && positionings.length > 1;
          return (
            <div key={p.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color.stroke }} />
                  <span className="text-xs truncate text-foreground/75">{name}</span>
                  {isWinner && <span className="text-[10px] text-amber-400 shrink-0" title="Meilleur score">★</span>}
                </div>
                <span className="text-base font-bold shrink-0 tabular-nums" style={{ color: color.stroke }}>{score}</span>
              </div>
              <div className="relative h-3 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${score}%`, backgroundColor: color.stroke, opacity: 0.8 }}
                />
                {/* Score ticks at 25/50/75 */}
                {[25, 50, 75].map((t) => (
                  <div key={t} className="absolute top-0 h-full w-px bg-white/10" style={{ left: `${t}%` }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 text-[9px] text-muted-foreground/35 pt-1 border-t border-white/5">
        <span>0</span>
        <span className="ml-auto">50</span>
        <span>100</span>
      </div>
    </div>
  );
}

// ── Per-column helpers ─────────────────────────────────────────────────────

function SkillCategoryBar({ matches }: { matches: SkillMatch[] }) {
  const strong = matches.filter((m) => m.relevance === 'strong').length;
  const partial = matches.filter((m) => m.relevance === 'partial').length;
  const missing = matches.filter((m) => m.relevance === 'missing').length;
  const total = matches.length;
  if (!total) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/5">
        {strong  > 0 && <div className="h-full bg-neon/60"       style={{ width: `${(strong /total)*100}%` }} />}
        {partial > 0 && <div className="h-full bg-amber-400/60" style={{ width: `${(partial/total)*100}%` }} />}
        {missing > 0 && <div className="h-full bg-destructive/35" style={{ width: `${(missing/total)*100}%` }} />}
      </div>
      <span className="text-[9px] text-muted-foreground/40 shrink-0 w-12 text-right tabular-nums">
        <span className="text-neon/70">{strong}</span>
        <span className="text-muted-foreground/25 mx-0.5">·</span>
        <span className="text-amber-400/70">{partial}</span>
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
    partial: { bg: 'bg-amber-400/10',   text: 'text-amber-400',   dot: 'bg-amber-400/70' },
    medium:  { bg: 'bg-amber-400/10',   text: 'text-amber-400',   dot: 'bg-amber-400/70' },
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
        className="sticky top-0 z-10 rounded-2xl p-5 flex flex-col items-center gap-3 text-center relative overflow-hidden bg-shell"
        style={{ backgroundImage: `linear-gradient(160deg, ${color.fill}, transparent)`, border: `1px solid ${color.stroke}28` }}
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
          <ScoreRing score={score} size={96} />
        ) : (
          <div className="h-24 w-24 flex items-center justify-center rounded-full bg-white/5">
            <User className="h-8 w-8 text-muted-foreground/30" />
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
            <span className="flex items-center gap-1 rounded-full bg-black/25 border border-white/8 px-2.5 py-1 text-[10px] text-muted-foreground">
              <TrendingUp className="h-2.5 w-2.5" />
              {pi.yearsOfExperience}
            </span>
          )}
          {pi?.availability && (
            <span className="flex items-center gap-1 rounded-full bg-black/25 border border-white/8 px-2.5 py-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {pi.availability}
            </span>
          )}
          {pi?.location && (
            <span className="rounded-full bg-black/25 border border-white/8 px-2.5 py-1 text-[10px] text-muted-foreground">
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
          <div className="flex gap-3 pt-1.5 border-t border-white/5 text-[9px] text-muted-foreground/30">
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-neon/60" />Fort</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded bg-amber-400/60" />Partiel</span>
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
  const gridCols = count === 2 ? 'grid-cols-2' : count === 3 ? 'grid-cols-3' : 'grid-cols-4';

  const winnerIndex = positionings.reduce((best, p, i) =>
    (p.analysis?.matchScore ?? 0) > (positionings[best]?.analysis?.matchScore ?? 0) ? i : best
  , 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-[calc(100vw-3rem)] !max-w-[1600px] !h-[calc(100dvh-3rem)] !max-h-[1000px] !rounded-2xl !p-0 !gap-0 !ring-1 !ring-white/[0.08] !border-0 bg-shell !flex !flex-col !overflow-hidden"
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center justify-between px-6 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/15">
              <GitCompare className="h-4 w-4 text-violet" />
            </div>
            <div>
              <DialogTitle className="text-sm font-semibold">
                Comparaison — {count} candidat{count > 1 ? 's' : ''}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground/45">
                Vue synthétique et détaillée des profils
              </DialogDescription>
            </div>
            {/* Candidate color legend */}
            <div className="flex items-center gap-4 ml-5 pl-5 border-l border-white/8">
              {positionings.map((p, i) => (
                <span key={p.id} className="flex items-center gap-1.5 text-[11px] text-foreground/55">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CANDIDATE_COLORS[i].stroke }} />
                  {getCandidateName(p.candidates).split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Candidate columns ── */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {count === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <p className="text-sm">Aucun candidat sélectionné</p>
            </div>
          ) : (
            <div className={`grid gap-4 items-start ${gridCols}`}>
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
  onNavigate,
  onCancel,
  selectable,
  isSelected,
  onToggleSelect,
}: {
  p: MissionPositioning;
  onNavigate: () => void;
  onCancel: () => void;
  selectable?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const candidate = p.candidates;
  const name = getCandidateName(candidate);
  const title = candidate?.extracted_data?.personalInfo?.title;
  const score = p.analysis?.matchScore;
  const pst = posStatusConfig[p.status] ?? posStatusConfig.draft;
  const isProcessing = p.status === 'analyzing' || p.status === 'generating';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate();
        }
      }}
      className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3.5 text-left transition ${
        isSelected ? 'bg-violet/[0.08] ring-1 ring-violet/30' : 'hover:bg-white/[0.03]'
      }`}
    >
      {/* Checkbox (selectable mode only) */}
      {selectable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.(p.id);
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${
            isSelected
              ? 'border-violet bg-violet text-white'
              : 'border-white/20 bg-white/[0.03] opacity-0 group-hover:opacity-100'
          }`}
          title={isSelected ? 'Retirer de la comparaison' : 'Ajouter à la comparaison'}
        >
          {isSelected && <Check className="h-3 w-3" />}
        </button>
      )}

      {/* Score or placeholder */}
      {score != null ? (
        <div
          className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg ${getScoreBg(score)}`}
        >
          <span className={`text-base font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className={`text-[7px] font-medium ${getScoreColor(score)} opacity-70`}>
            / 100
          </span>
        </div>
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet/60" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      )}

      {/* Candidate info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
        </div>
        {title && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{title}</p>
        )}
        {p.analysis?.matchSummary && (
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

      {/* Status + date */}
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

        {/* Cancel button for in-progress workflows */}
        {isProcessing && p.workflow_run_id && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-destructive/70 transition hover:bg-destructive/10 hover:text-destructive"
            title="Annuler"
          >
            <Square className="h-3 w-3" />
          </button>
        )}

        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 transition group-hover:text-muted-foreground" />
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
  const missionId = params?.id as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const { data: mission, isLoading } = useMission(missionId) as {
    data: MissionDetail | undefined;
    isLoading: boolean;
  };
  const cancelWorkflow = useCancelWorkflow();

  const positionings = useMemo(
    () => mission?.positionings ?? [],
    [mission?.positionings]
  );

  const drafts = positionings.filter((p) => DRAFT_STATUSES.has(p.status));
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Position introuvable</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="glass-panel rounded-2xl p-6 mb-6">
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

          {/* Job description preview */}
          <div className="mt-4 rounded-xl bg-black/20 border border-white/[0.04] p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3.5 w-3.5 text-violet/60" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Fiche de poste
              </span>
            </div>
            <p className="text-xs text-muted-foreground/80 whitespace-pre-wrap line-clamp-8">
              {mission.job_description}
            </p>
          </div>
        </div>

        {/* Empty state */}
        {positionings.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/50">
                <Target className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Aucun positionnement</p>
              <p className="text-xs text-muted-foreground mb-4">
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
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6">
            {/* En cours section */}
            <div className="glass-panel rounded-2xl p-6 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-violet" />
                <h2 className="text-sm font-semibold text-foreground">En cours</h2>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 ml-1">
                  {drafts.length}
                </Badge>
              </div>

              {drafts.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p className="text-xs">
                    Tous les positionnements sont prêts
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {drafts.map((p) => (
                    <PositioningRow
                      key={p.id}
                      p={p}
                      onNavigate={() =>
                        router.push(`/review/${p.candidate_id}/positioning/${p.id}`)
                      }
                      onCancel={() =>
                        cancelWorkflow.mutate({
                          runId: p.workflow_run_id!,
                          table: 'positionings',
                          recordId: p.id,
                          resetStatus: p.status === 'analyzing' ? 'draft' : 'analyzed',
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Prêts section */}
            {ready.length > 0 && (
              <div className="glass-panel rounded-2xl p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-neon" />
                  <h2 className="text-sm font-semibold text-foreground">Prêts</h2>
                  <Badge variant="default" className="text-[9px] px-1.5 py-0 ml-1">
                    {ready.length}
                  </Badge>
                  {ready.length >= 2 && (
                    <span className="ml-auto text-[10px] text-muted-foreground/50">
                      Sélectionner pour comparer
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {ready.map((p) => (
                    <PositioningRow
                      key={p.id}
                      p={p}
                      onNavigate={() =>
                        router.push(`/review/${p.candidate_id}/positioning/${p.id}`)
                      }
                      onCancel={() => {}}
                      selectable={ready.length >= 2}
                      isSelected={compareIds.has(p.id)}
                      onToggleSelect={toggleCompare}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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

          <div className="h-4 w-px bg-white/[0.08]" />

          <button
            onClick={() => setCompareIds(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Effacer
          </button>

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
