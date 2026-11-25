/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H4 E4 S4 R4 V4 · v2 */
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, Plus, Trash2, Upload, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PageHeader } from '@/components/app/page-header';
import { Panel } from '@/components/app/panel';
import { PanelEmpty } from '@/components/dashboard/panel-empty';
import { formatRelativeDate } from '@/components/dashboard/dashboard-format';
import { MissionJobAnalysis } from '@/components/mission-job-analysis';
import { AddCvsDialog, type AddCvsTab } from '@/components/missions/add-cvs-dialog';
import { CompareCvsDialog } from '@/components/missions/compare-cvs-dialog';
import { JobDescriptionPanel } from '@/components/missions/job-description-panel';
import { MissionAnalysisStatus } from '@/components/missions/mission-analysis-status';
import { MissionDetailSkeleton } from '@/components/missions/mission-detail-skeleton';
import { MissionPositioningsTable } from '@/components/missions/mission-positionings-table';
import { MissionSynthesisPanel } from '@/components/missions/mission-synthesis-panel';
import { useMissionJobAnalysis } from '@/components/missions/use-mission-job-analysis';
import {
  formatPositioningCount,
  missionHeaderDescription,
  missionPageTitle,
  sortPositioningsByScore,
} from '@/components/missions/mission-format';
import { MAX_COMPARE, READY_STATUSES, type MissionDetail } from '@/components/missions/mission-types';
import { useCancelWorkflow, useDeleteMission, useMission } from '@/lib/queries';

type MissionTab = 'analysis' | 'positionings';

/**
 * Une mission sur l'établi : la fiche et son analyse d'un côté, les CV
 * positionnés de l'autre. L'état de l'analyse de la fiche vit sous le titre ;
 * l'import groupé et l'analyse de chaque CV se suivent dans le tableau.
 */
export default function MissionDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const missionId = params?.id as string;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<AddCvsTab>('upload');
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  /** `?positionner=1` (coque, tableau de bord) ouvre le dialogue « Positionner des CV » ; le paramètre part à sa fermeture. */
  const openFromUrl = searchParams.get('positionner') === '1';
  const closeAddDialog = () => {
    setIsAddOpen(false);
    if (!openFromUrl) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete('positionner');
    const qs = next.toString();
    const base = `/positions/${missionId}`;
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  };

  const { data: mission, isLoading } = useMission(missionId) as {
    data: MissionDetail | undefined;
    isLoading: boolean;
  };
  const cancelWorkflow = useCancelWorkflow();
  const deleteMission = useDeleteMission();

  const jobAnalysis = useMissionJobAnalysis({
    missionId,
    jobAnalysis: mission?.job_analysis ?? null,
    jobAnalysisWorkflowRunId: mission?.job_analysis_workflow_run_id ?? null,
    jobAnalysisStale: mission?.job_analysis_stale ?? false,
    workflowLastError: mission?.workflow_last_error ?? null,
    aiJobAnalysisModels: mission?.ai_job_analysis_models,
  });

  const handlePositioningDeleted = useCallback((positioningId: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      next.delete(positioningId);
      return next;
    });
  }, []);

  const positionings = useMemo(() => sortPositioningsByScore(mission?.positionings ?? []), [mission?.positionings]);
  const ready = useMemo(() => positionings.filter((p) => READY_STATUSES.has(p.status)), [positionings]);
  const existingCandidateIds = useMemo(() => new Set(positionings.map((p) => p.candidate_id)), [positionings]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      } else {
        toast.info(`${MAX_COMPARE} candidats au plus à la fois`, {
          description: 'Désélectionnez un candidat pour en ajouter un autre.',
        });
      }
      return next;
    });
  };

  const selectedPositionings = useMemo(() => ready.filter((p) => compareIds.has(p.id)), [ready, compareIds]);

  const missionTab = useMemo<MissionTab>(() => {
    const t = searchParams.get('tab');
    if (t === 'analysis' || t === 'positionings') return t;
    return positionings.length > 0 ? 'positionings' : 'analysis';
  }, [searchParams, positionings.length]);

  const openAdd = (tab: AddCvsTab) => {
    setAddTab(tab);
    setIsAddOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col bg-shell px-6 py-6 text-foreground">
        <MissionDetailSkeleton />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="flex min-h-full flex-col bg-shell px-6 py-6 text-foreground">
        <Panel>
          <PanelEmpty
            icon={Briefcase}
            title="Mission introuvable."
            description="Elle a peut-être été supprimée, ou le lien est incomplet."
            action={{ label: 'Retour aux missions', href: '/positions' }}
          />
        </Panel>
      </div>
    );
  }

  const hasDescription = mission.job_description.trim().length > 0;
  const level = jobAnalysis.analysis?.expectedExpertiseLevel;
  const description = missionHeaderDescription({
    phase: jobAnalysis.phase,
    band: level?.interpretedBand ?? null,
    statedLevel: level?.statedLevel ?? null,
  });

  const analyzeButton = (
    <Button type="button" onClick={jobAnalysis.analyze} disabled={!jobAnalysis.canAnalyze || !hasDescription}>
      {jobAnalysis.phase === 'running' ? <Spinner data-icon="inline-start" /> : null}
      {jobAnalysis.phase === 'failed' ? 'Relancer l’analyse' : 'Analyser la fiche'}
    </Button>
  );

  const primaryAction = jobAnalysis.hasPersisted ? (
    <Button type="button" onClick={() => openAdd('upload')}>
      <Plus data-icon="inline-start" />
      Positionner des CV
    </Button>
  ) : jobAnalysis.canAnalyze && hasDescription ? (
    analyzeButton
  ) : (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>{analyzeButton}</TooltipTrigger>
      <TooltipContent side="bottom">
        {!hasDescription ? 'Ajoutez du texte à la fiche de poste pour lancer l’analyse' : 'Une analyse est déjà en cours'}
      </TooltipContent>
    </Tooltip>
  );

  const actions = (
    <>
      <AlertDialog>
        <Tooltip>
          <AlertDialogTrigger
            render={
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer la mission"
                    disabled={deleteMission.isPending}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  />
                }
              />
            }
          >
            {deleteMission.isPending ? <Spinner /> : <Trash2 />}
          </AlertDialogTrigger>
          <TooltipContent side="bottom">Supprimer la mission</TooltipContent>
        </Tooltip>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette mission ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La fiche de poste et tous les positionnements associés seront
              définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteMission.mutate(missionId, {
                  onSuccess: () => {
                    toast.success('Mission supprimée');
                    router.push('/positions');
                  },
                  onError: () => {
                    toast.error('Impossible de supprimer la mission');
                  },
                })
              }
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {primaryAction}
    </>
  );

  const addCvsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Plus data-icon="inline-start" />
        Ajouter des CV
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => openAdd('upload')}>
          <Upload />
          Importer des CV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openAdd('existing')}>
          <UserPlus />
          Choisir des CV existants
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-full flex-col bg-shell text-foreground">
      <div className="flex flex-col gap-4 px-6 py-6">
        <PageHeader
          title={missionPageTitle(mission)}
          description={description}
          meta={
            <>
              <span>
                Créée{' '}
                <time dateTime={mission.created_at} title={new Date(mission.created_at).toLocaleString('fr-FR')}>
                  {formatRelativeDate(mission.created_at)}
                </time>
              </span>
              <span aria-hidden> · </span>
              <span>{formatPositioningCount(positionings.length)}</span>
            </>
          }
          actions={actions}
          status={<MissionAnalysisStatus state={jobAnalysis} />}
        />

        <Tabs
          key={missionId}
          value={missionTab}
          onValueChange={(v) => {
            router.replace(`/positions/${missionId}?tab=${v as MissionTab}`, { scroll: false });
          }}
          className="gap-4"
        >
          <Panel className="px-4">
            <TabsList variant="line" className="h-11 w-full justify-start gap-6 p-0">
              <TabsTrigger value="analysis" className="h-full flex-none px-0 after:bg-primary group-data-[orientation=horizontal]/tabs:after:bottom-0">
                Fiche et analyse
              </TabsTrigger>
              <TabsTrigger value="positionings" className="h-full flex-none px-0 after:bg-primary group-data-[orientation=horizontal]/tabs:after:bottom-0">
                Positionnements
                <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                  {positionings.length}
                </span>
              </TabsTrigger>
            </TabsList>
          </Panel>

          <TabsContent value="analysis" className="data-[state=inactive]:hidden">
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
              <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
                <JobDescriptionPanel
                  missionId={missionId}
                  jobDescription={mission.job_description}
                  editDisabledReason={jobAnalysis.phase === 'running' ? 'Attendez la fin de l’analyse pour modifier la fiche' : null}
                />
                <MissionJobAnalysis
                  missionId={missionId}
                  analysis={jobAnalysis.analysis}
                  isStreaming={jobAnalysis.isStreaming}
                  global_skill_keys_understood={mission.global_skill_keys_understood ?? []}
                  onAnalyze={jobAnalysis.analyze}
                  canAnalyze={jobAnalysis.canAnalyze && hasDescription}
                />
              </div>
              <div className="min-w-0 lg:sticky lg:top-6 lg:col-span-5 lg:self-start">
                <MissionSynthesisPanel state={jobAnalysis} hasDescription={hasDescription} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="positionings" className="data-[state=inactive]:hidden">
            <MissionPositioningsTable
              missionId={missionId}
              positionings={positionings}
              onCancelWorkflow={(args) => cancelWorkflow.mutate(args)}
              onPositioningDeleted={handlePositioningDeleted}
              compareIds={compareIds}
              onToggleCompare={toggleCompare}
              onClearCompare={() => setCompareIds(new Set())}
              onCompare={() => setIsCompareOpen(true)}
              headerAction={addCvsMenu}
              onAddCvs={() => openAdd('upload')}
            />
          </TabsContent>
        </Tabs>

        <AddCvsDialog
          open={isAddOpen || openFromUrl}
          onOpenChange={(open) => (open ? setIsAddOpen(true) : closeAddDialog())}
          missionId={missionId}
          existingCandidateIds={existingCandidateIds}
          tab={addTab}
          onTabChange={setAddTab}
        />

        <CompareCvsDialog
          open={isCompareOpen}
          onOpenChange={(open) => {
            setIsCompareOpen(open);
            if (!open) setCompareIds(new Set());
          }}
          positionings={selectedPositionings}
        />
      </div>
    </div>
  );
}
