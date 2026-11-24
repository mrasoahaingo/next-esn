/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H5 E4 S4 R4 V4 · v2 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Briefcase, ChevronDown, Plus } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { JobDescriptionInput } from '@/components/job-description-input';
import { JobDescriptionMarkdown } from '@/components/job-description-markdown';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/app/page-header';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge, type StatusTone } from '@/components/app/status-badge';
import { PositioningMissionAnalysisInline } from '@/components/positioning-mission-analysis-inline';
import {
  useMissions,
  useMission,
  useCreateMission,
  useCreatePositioning,
  useCandidate,
} from '@/lib/queries';
import {
  getPositioningMatchingCtaState,
  hasPersistedJobAnalysis,
} from '@/lib/utils/mission-positioning-gate';
import type { ExtractedCV } from '@/lib/schema';
import { cn } from '@/lib/utils';

interface Mission {
  id: string;
  title: string;
  company: string | null;
  job_description: string;
  positioning_count: number;
  created_at: string;
  /** `GET /api/missions` renvoie toutes les colonnes : l'état de l'analyse de la fiche est dedans. */
  job_analysis?: unknown;
  job_analysis_workflow_run_id?: string | null;
  workflow_last_error?: unknown;
}

const SHORT_DATE = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });

function formatShortDate(iso: string): string {
  try {
    return SHORT_DATE.format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatPositioningCount(count: number): string {
  if (count <= 0) return 'Aucun positionnement';
  return `${count} positionnement${count > 1 ? 's' : ''}`;
}

/** État de l'analyse de la fiche, dérivé des seuls champs serveur de la liste. */
function missionAnalysisStatus(mission: Mission): { tone: StatusTone; label: string; pulse?: boolean } {
  if (mission.workflow_last_error) return { tone: 'err', label: 'Analyse échouée' };
  if (mission.job_analysis_workflow_run_id) return { tone: 'info', label: 'Analyse en cours', pulse: true };
  if (hasPersistedJobAnalysis(mission.job_analysis ?? null)) return { tone: 'ok', label: 'Analysée' };
  return { tone: 'neutral', label: 'À analyser' };
}

export default function PositioningNewPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.id as string;

  const { data: missionsData, isLoading: isLoadingMissions } = useMissions();
  const missions: Mission[] = Array.isArray(missionsData) ? missionsData : [];

  const { data: candidateData } = useCandidate(candidateId);
  const candidateDisplayName = useMemo(() => {
    const pi = (candidateData?.extracted_data as ExtractedCV | null | undefined)?.personalInfo;
    if (!pi) return null;
    const name = [pi.firstName, pi.lastName].filter(Boolean).join(' ').trim();
    return name || null;
  }, [candidateData?.extracted_data]);

  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

  const { data: missionDetail, isLoading: isMissionDetailLoading } = useMission(
    selectedMissionId ?? '',
  );

  // New mission dialog
  const [showNewMission, setShowNewMission] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');

  const createMission = useCreateMission();
  const createPositioning = useCreatePositioning();
  const isCreatingMission = createMission.isPending;
  const isCreating = createPositioning.isPending;

  // FLOW-01 / D-01 D-02: Ne pas rediriger vers /positions/[id] après création de mission depuis cet écran.
  // Sélection locale uniquement (setSelectedMissionId). Lien « fiche mission » = action secondaire explicite utilisateur, pas parcours nominal.
  const handleCreateMission = async () => {
    if (!newTitle.trim() || !newJobDescription.trim()) return;
    createMission.mutate(
      { title: newTitle, company: newCompany || null, jobDescription: newJobDescription },
      {
        onSuccess: (mission) => {
          if (mission.id) {
            setSelectedMissionId(mission.id);
            setShowNewMission(false);
            setNewTitle('');
            setNewCompany('');
            setNewJobDescription('');
          }
        },
      }
    );
  };

  const handleStartPositioning = async () => {
    if (!selectedMissionId) return;
    createPositioning.mutate(
      { candidateId, missionId: selectedMissionId },
      {
        onSuccess: (data) => {
          if (data.id) {
            router.push(`/review/${candidateId}/positioning/${data.id}`);
          }
        },
      }
    );
  };

  return (
    <div className="min-h-full bg-shell text-foreground">
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-6">
        <PageHeader
          title="Nouveau positionnement"
          description={candidateDisplayName ? `Pour ${candidateDisplayName}` : 'Pour ce candidat'}
        />

        <Panel aria-labelledby="missions-heading">
          <PanelHeader
            id="missions-heading"
            icon={Briefcase}
            title="Fiches de mission"
            count={isLoadingMissions ? undefined : missions.length}
            description="Choisissez la fiche à laquelle comparer ce CV."
            actions={
              <Button variant="outline" size="sm" onClick={() => setShowNewMission(true)}>
                <Plus data-icon="inline-start" />
                Nouvelle mission
              </Button>
            }
          />

          {isLoadingMissions ? (
            <PanelBody
              padded={false}
              className="divide-y divide-border"
              aria-busy="true"
              aria-label="Chargement des missions"
            >
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-1/3 animate-none" />
                  <Skeleton className="h-4 w-24 animate-none" />
                </div>
              ))}
            </PanelBody>
          ) : missions.length === 0 ? (
            <PanelBody>
              <Empty className="border-0 py-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="size-10 rounded-full text-muted-foreground">
                    <Briefcase className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Aucune fiche de mission</EmptyTitle>
                  <EmptyDescription>
                    Une fiche de mission décrit le poste à pourvoir. Le matching compare le CV à cette fiche.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={() => setShowNewMission(true)}>Créer une mission</Button>
                </EmptyContent>
              </Empty>
            </PanelBody>
          ) : (
            <PanelBody padded={false}>
              <ul className="divide-y divide-border">
                {missions.map((mission) => {
                  const isSelected = selectedMissionId === mission.id;
                  const cta = isSelected ? getPositioningMatchingCtaState(missionDetail) : null;
                  const ctaDisabled = !!cta?.disabled || isCreating;
                  const status = missionAnalysisStatus(mission);
                  const panelId = `mission-${mission.id}-details`;

                  return (
                    <li key={mission.id}>
                      <button
                        type="button"
                        aria-expanded={isSelected}
                        aria-controls={panelId}
                        onClick={() => setSelectedMissionId(isSelected ? null : mission.id)}
                        className={cn(
                          'flex min-h-12 w-full items-center gap-4 px-4 py-3 text-left outline-none',
                          'transition-colors duration-[120ms] ease-out motion-reduce:transition-none',
                          'hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50',
                          isSelected && 'bg-muted/40',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{mission.title}</span>
                          {mission.company ? (
                            <span className="block truncate text-xs text-muted-foreground">{mission.company}</span>
                          ) : null}
                        </span>
                        <span className="hidden shrink-0 items-center gap-4 font-mono text-xs tabular-nums text-muted-foreground sm:flex">
                          <span>{formatPositioningCount(mission.positioning_count)}</span>
                          <time dateTime={mission.created_at}>{formatShortDate(mission.created_at)}</time>
                        </span>
                        <StatusBadge tone={status.tone} pulse={status.pulse}>
                          {status.label}
                        </StatusBadge>
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform duration-[220ms] ease-out motion-reduce:transition-none',
                            isSelected && 'rotate-180',
                          )}
                          aria-hidden
                        />
                      </button>

                      {isSelected ? (
                        <div id={panelId} className="border-t border-border bg-panel-soft px-4 py-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground">Fiche de poste</h3>
                            <span className="flex items-center gap-3 font-mono text-xs tabular-nums text-muted-foreground">
                              <span className="sm:hidden">{formatPositioningCount(mission.positioning_count)}</span>
                              <Link
                                href={`/positions/${mission.id}`}
                                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'font-sans text-muted-foreground')}
                              >
                                Voir la fiche
                              </Link>
                            </span>
                          </div>
                          <JobDescriptionMarkdown
                            content={mission.job_description}
                            clampClassName="line-clamp-6"
                            className="mt-2 text-muted-foreground"
                          />

                          <PositioningMissionAnalysisInline
                            missionId={mission.id}
                            mission={missionDetail}
                            isMissionDetailLoading={isMissionDetailLoading}
                          />

                          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <p
                              id="positioning-matching-cta-help"
                              className="text-xs text-muted-foreground"
                            >
                              {cta?.helpText ?? ''}
                            </p>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <span className="inline-flex w-full sm:w-auto" tabIndex={ctaDisabled ? 0 : -1} />
                                }
                              >
                                <Button
                                  type="button"
                                  size="lg"
                                  className="w-full sm:w-auto"
                                  onClick={handleStartPositioning}
                                  disabled={ctaDisabled}
                                  aria-describedby="positioning-matching-cta-help"
                                >
                                  {isCreating ? <Spinner data-icon="inline-start" /> : null}
                                  Analyser le matching
                                </Button>
                              </TooltipTrigger>
                              {ctaDisabled && cta?.helpText ? (
                                <TooltipContent side="bottom">{cta.helpText}</TooltipContent>
                              ) : null}
                            </Tooltip>
                          </div>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </PanelBody>
          )}
        </Panel>
      </div>

      {/* New mission dialog */}
      <Dialog open={showNewMission} onOpenChange={setShowNewMission}>
        <DialogContent className="sm:max-w-2xl">
          <DialogTitle>Nouvelle fiche de mission</DialogTitle>

          <div className="mt-2 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mission-title">Intitulé du poste *</Label>
                <Input
                  id="mission-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Développeuse full-stack senior"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mission-company">Entreprise ou client</Label>
                <Input
                  id="mission-company"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  placeholder="Banque Rhône-Alpes"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mission-desc">Fiche de poste *</Label>
              <JobDescriptionInput
                id="mission-desc"
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
                disabled={!newTitle.trim() || !newJobDescription.trim() || isCreatingMission}
              >
                {isCreatingMission ? <Spinner data-icon="inline-start" /> : null}
                Créer la mission
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
