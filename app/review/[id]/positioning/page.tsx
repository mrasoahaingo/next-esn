/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H5 E4 S4 R5 V4 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
import { PositioningMissionAnalysisInline } from '@/components/positioning-mission-analysis-inline';
import {
  useMissions,
  useMission,
  useCreateMission,
  useCreatePositioning,
  useCandidate,
} from '@/lib/queries';
import { getPositioningMatchingCtaState } from '@/lib/utils/mission-positioning-gate';
import type { ExtractedCV } from '@/lib/schema';
import { cn } from '@/lib/utils';

interface Mission {
  id: string;
  title: string;
  company: string | null;
  job_description: string;
  positioning_count: number;
  created_at: string;
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
    <div className="h-full overflow-y-auto bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-5 md:px-6">
        <PageHeader
          title="Nouveau positionnement"
          description={candidateDisplayName ? `Pour ${candidateDisplayName}` : 'Pour ce candidat'}
          actions={
            <Button variant="outline" onClick={() => setShowNewMission(true)}>
              Nouvelle mission
            </Button>
          }
        />

        <section className="mt-8" aria-labelledby="missions-heading">
          <h2
            id="missions-heading"
            className="border-b border-border pb-2 text-[0.9375rem] font-semibold text-foreground"
          >
            Fiches de mission
          </h2>

          {isLoadingMissions ? (
            <div className="flex flex-col gap-4 py-4" aria-busy="true" aria-label="Chargement des missions">
              <Skeleton className="h-4 w-2/3 animate-none" />
              <Skeleton className="h-4 w-1/2 animate-none" />
              <Skeleton className="h-4 w-3/5 animate-none" />
            </div>
          ) : missions.length === 0 ? (
            <Empty className="border-0 py-12">
              <EmptyHeader>
                <EmptyTitle>Aucune fiche de mission</EmptyTitle>
                <EmptyDescription>
                  Une fiche de mission décrit le poste à pourvoir. Le matching compare le CV à cette fiche.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setShowNewMission(true)}>Créer une mission</Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {missions.map((mission) => {
                const isSelected = selectedMissionId === mission.id;
                const cta = isSelected ? getPositioningMatchingCtaState(missionDetail) : null;
                const ctaDisabled = !!cta?.disabled || isCreating;

                return (
                  <li
                    key={mission.id}
                    className={cn(
                      '-ml-4 pl-4 md:-ml-6 md:pl-6',
                      isSelected ? 'border-l-2 border-primary' : 'border-l-2 border-transparent',
                    )}
                  >
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedMissionId(isSelected ? null : mission.id)}
                      className={cn(
                        'flex min-h-11 w-full flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-left outline-none',
                        'rounded-md transition-colors duration-[120ms] ease-out motion-reduce:transition-none',
                        'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
                        isSelected ? 'text-foreground' : 'text-foreground/90',
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{mission.title}</span>
                        {mission.company ? (
                          <span className="block text-sm text-muted-foreground">{mission.company}</span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-baseline gap-4 font-mono text-xs tabular-nums text-muted-foreground">
                        <span>{formatPositioningCount(mission.positioning_count)}</span>
                        <time dateTime={mission.created_at}>{formatShortDate(mission.created_at)}</time>
                      </span>
                    </button>

                    {isSelected ? (
                      <div className="pb-6 pt-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground">Fiche de poste</h3>
                          <Link
                            href={`/positions/${mission.id}`}
                            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}
                          >
                            Voir la fiche
                          </Link>
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

                        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          )}
        </section>
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
