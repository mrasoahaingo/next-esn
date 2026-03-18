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
    personalInfo?: { firstName?: string; lastName?: string; title?: string };
  } | null;
  original_file_url: string;
  status: string;
}

interface MissionPositioning {
  id: string;
  candidate_id: string;
  status: string;
  workflow_run_id: string | null;
  analysis: {
    matchScore?: number;
    matchSummary?: string;
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
// Positioning Row
// ---------------------------------------------------------------------------

function PositioningRow({
  p,
  onNavigate,
  onCancel,
}: {
  p: MissionPositioning;
  onNavigate: () => void;
  onCancel: () => void;
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
      className="group flex w-full cursor-pointer items-center gap-4 rounded-xl px-4 py-3.5 text-left transition hover:bg-white/[0.03]"
    >
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
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        <PositionCvsModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          missionId={missionId}
          existingCandidateIds={existingCandidateIds}
        />
      </div>
    </div>
  );
}
