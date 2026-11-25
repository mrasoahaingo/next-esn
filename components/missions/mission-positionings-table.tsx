'use client';

import { Fragment, useEffect, useMemo, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { ArrowUpRight, GitCompare, Square, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { ExtractedCV, PositioningAnalysis } from '@/lib/schema';
import type { CvExtractionStreamMeta } from '@/lib/types/cv-extraction-stream';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import {
  computeCvStepStates,
  computePositioningAnalysisStepStates,
  formatStepSummaryLine,
} from '@/lib/workflow/compute-step-status';
import { getFrenchStepShortLabel } from '@/lib/workflow/workflow-step-labels';
import {
  CV_EXTRACTION_SUCCESS_STATUSES,
  POSITIONING_ANALYSIS_SUCCESS_STATUSES,
  WORKFLOW_GENERIC_FAILURE_MESSAGE,
  resolveWorkflowOutcome,
} from '@/lib/workflow/workflow-outcome';
import { queryKeys } from '@/lib/queries/keys';
import { useDeletePositioning } from '@/lib/queries';
import { formatHistoryModelsDisplayLabel, parsePositioningAnalysisModelsSnapshot } from '@/lib/types/positioning-analysis-models';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';
import { InitialsAvatar } from '@/components/app/initials-avatar';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { PanelEmpty } from '@/components/dashboard/panel-empty';
import { formatRelativeDate } from '@/components/dashboard/dashboard-format';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { scoreToneText } from '@/lib/utils/score-tone';
import { cn } from '@/lib/utils';
import { formatSelectedCount, missionPositioningStatus } from './mission-format';
import { getCandidateName, READY_STATUSES, type MissionDetail, type MissionPositioning } from './mission-types';

const ROW =
  'cursor-pointer transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:bg-muted/50 motion-reduce:transition-none';
const HEAD = 'h-9 text-xs text-muted-foreground';
const NAME_LINK =
  'truncate rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const ICON_LINK =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export type CancelWorkflowArgs = {
  runId: string;
  table: 'candidates' | 'positionings';
  recordId: string;
  resetStatus: string;
  missionId?: string;
};

export type MissionPositioningsTableProps = {
  missionId: string;
  positionings: MissionPositioning[];
  onCancelWorkflow: (args: CancelWorkflowArgs) => void;
  onPositioningDeleted: (positioningId: string) => void;
  /** Sélection pour la comparaison (visible quand au moins deux profils sont prêts). */
  compareIds: Set<string>;
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
  onCompare: () => void;
  /** Action d'en-tête (« Ajouter des CV », menu) et action de l'état vide. */
  headerAction: React.ReactNode;
  onAddCvs: () => void;
};

/**
 * Panneau « CVs sur cette mission » : un tableau à toutes les largeurs (les
 * colonnes secondaires se cachent sous `md`), une ligne par positionnement avec
 * ses deux flux (extraction du CV importé, analyse du matching). Une ligne en
 * cours ou en échec déplie une seconde ligne avec ses étapes. Le pied de panneau
 * porte la comparaison quand des profils sont cochés.
 */
export function MissionPositioningsTable({
  missionId,
  positionings,
  onCancelWorkflow,
  onPositioningDeleted,
  compareIds,
  onToggleCompare,
  onClearCompare,
  onCompare,
  headerAction,
  onAddCvs,
}: MissionPositioningsTableProps): React.JSX.Element {
  const readyCount = positionings.filter((p) => READY_STATUSES.has(p.status)).length;
  const selectable = readyCount >= 2;

  return (
    <Panel aria-labelledby="mission-positionings-title">
      <PanelHeader
        id="mission-positionings-title"
        icon={Users}
        title="CVs sur cette mission"
        count={positionings.length}
        description={selectable ? 'Cochez des profils prêts pour les comparer.' : undefined}
        actions={headerAction}
      />
      <PanelBody padded={false}>
        {positionings.length === 0 ? (
          <PanelEmpty
            icon={Users}
            title="Aucun CV sur cette mission."
            description="Importez des CV ou choisissez des candidats déjà extraits : l’IA les positionne sur la fiche."
            action={
              <Button type="button" size="sm" onClick={onAddCvs}>
                Positionner des CV
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {selectable ? (
                  <TableHead className={`${HEAD} w-10 pl-4`}>
                    <span className="sr-only">Comparer</span>
                  </TableHead>
                ) : null}
                <TableHead className={cn(HEAD, 'w-full', !selectable && 'pl-4')}>Candidat</TableHead>
                <TableHead className={HEAD}>Score</TableHead>
                <TableHead className={`${HEAD} hidden md:table-cell`}>Statut</TableHead>
                <TableHead className={`${HEAD} hidden md:table-cell`}>Ajouté</TableHead>
                <TableHead className={`${HEAD} pr-3 text-right`}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positionings.map((p) => (
                <PositioningRow
                  key={p.id}
                  p={p}
                  missionId={missionId}
                  onCancelWorkflow={onCancelWorkflow}
                  onPositioningDeleted={onPositioningDeleted}
                  selectable={selectable}
                  isSelected={compareIds.has(p.id)}
                  onToggleSelect={onToggleCompare}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </PanelBody>
      {compareIds.size > 0 ? (
        <PanelFooter>
          <span className="text-foreground">{formatSelectedCount(compareIds.size)}</span>
          <span className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClearCompare}>
              Effacer
            </Button>
            <Button type="button" size="sm" onClick={onCompare} disabled={compareIds.size < 2}>
              <GitCompare data-icon="inline-start" />
              Comparer
            </Button>
          </span>
        </PanelFooter>
      ) : null}
    </Panel>
  );
}

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

function PositioningRow({
  p,
  missionId,
  onCancelWorkflow,
  onPositioningDeleted,
  selectable,
  isSelected,
  onToggleSelect,
}: {
  p: MissionPositioning;
  missionId: string;
  onCancelWorkflow: (args: CancelWorkflowArgs) => void;
  onPositioningDeleted: (positioningId: string) => void;
  selectable: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const deletePositioning = useDeletePositioning();
  const candidate = p.candidates;
  const name = getCandidateName(candidate);
  const title = candidate?.extracted_data?.personalInfo?.title;
  const score = p.analysis?.matchScore;
  const addedVia = p.added_via ?? 'existing_candidate';
  const candidateStatus = candidate?.status ?? '';

  const extractActive =
    addedVia === 'cv_upload' && !!candidate?.workflow_run_id && ['uploaded', 'extracting'].includes(candidateStatus);
  const analyzeActive = p.status === 'analyzing' && !!p.workflow_run_id;

  /** Relit la mission après invalidation : le toast doit refléter l'état persisté, pas la fin du flux. */
  const refetchMissionDetail = async (): Promise<MissionDetail | undefined> => {
    const oid = orgId ?? '';
    await queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, missionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    return queryClient.getQueryData<MissionDetail>(queryKeys.missions.detail(oid, missionId));
  };

  const extractStream = useWorkflowStream<Partial<ExtractedCV>, CvExtractionStreamMeta>({
    api: '/api/extract',
    runId: extractActive ? (candidate?.workflow_run_id ?? undefined) : undefined,
    runStatus: extractActive ? 'extracting' : undefined,
    activeStatuses: ['extracting'],
    onFinish: async () => {
      const mission = await refetchMissionDetail();
      const freshCandidate = mission?.positionings.find((row) => row.id === p.id)?.candidates;
      const outcome = resolveWorkflowOutcome({
        status: freshCandidate?.status,
        successStatuses: CV_EXTRACTION_SUCCESS_STATUSES,
        lastError: freshCandidate?.workflow_last_error ?? null,
      });
      if (outcome.kind === 'success') toast.success('Extraction terminée avec succès');
      else if (outcome.kind === 'error') toast.error(outcome.message, { duration: 8000 });
    },
  });

  const analysisStream = useWorkflowStream<Partial<PositioningAnalysis>, PositioningAnalysisStreamMeta>({
    api: '/api/positioning/analyze',
    runId: analyzeActive ? (p.workflow_run_id ?? undefined) : undefined,
    runStatus: analyzeActive ? 'analyzing' : undefined,
    activeStatuses: ['analyzing'],
    onFinish: async () => {
      const mission = await refetchMissionDetail();
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(orgId ?? '', p.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.analysisHistory(orgId ?? '', p.id) });

      const fresh = mission?.positionings.find((row) => row.id === p.id);
      const outcome = resolveWorkflowOutcome({
        status: fresh?.status,
        successStatuses: POSITIONING_ANALYSIS_SUCCESS_STATUSES,
        lastError: fresh?.workflow_last_error ?? null,
      });
      if (outcome.kind === 'success') toast.success('Analyse terminée avec succès');
      else if (outcome.kind === 'error') toast.error(outcome.message, { duration: 8000 });
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
  /** Extraction fichier en cours → détail sur la fiche CV ; sinon → positionnement */
  const navigateToReviewOnly = addedVia === 'cv_upload' && ['uploaded', 'extracting'].includes(candidateStatus);
  const candidateId = p.candidate_id;
  const canNavigate = !!candidateId;
  const href = !canNavigate
    ? null
    : navigateToReviewOnly
      ? `/review/${candidateId}`
      : `/review/${candidateId}/positioning/${p.id}`;

  const extractStepActive = extractActive || extractStream.isLoading;
  const analyzeStepActive =
    p.status === 'analyzing' ||
    analysisStream.isLoading ||
    (p.status === 'draft' && extractionPhaseDone && !analysisComplete);

  const showExtractStepList = addedVia === 'cv_upload' && (extractStepActive || candidate?.status === 'error');
  const showAnalysisStepList = p.status === 'analyzing' || analysisStream.isLoading || p.status === 'error';

  const extractRows = useMemo(
    () =>
      computeCvStepStates({
        streamMeta: extractStream.streamMeta,
        partialData: extractStream.object ?? (candidate?.extracted_data as Partial<ExtractedCV> | null) ?? null,
        isStreaming: extractStream.isLoading,
        errorStepKey: extractStream.errorStepKey,
        persistedError: candidate?.workflow_last_error ?? null,
        workflowFailed: candidate?.status === 'error',
        workflowRunActive: extractActive,
      }),
    [
      extractStream.streamMeta,
      extractStream.object,
      extractStream.isLoading,
      extractStream.errorStepKey,
      candidate?.extracted_data,
      candidate?.workflow_last_error,
      candidate?.status,
      extractActive,
    ],
  );
  const extractSummary = useMemo(() => formatStepSummaryLine('cv', extractRows), [extractRows]);

  const analysisRows = useMemo(
    () =>
      computePositioningAnalysisStepStates({
        streamMeta: analysisStream.streamMeta,
        partialData: analysisStream.object ?? (p.analysis as Partial<PositioningAnalysis> | null) ?? null,
        isStreaming: analysisStream.isLoading,
        errorStepKey: analysisStream.errorStepKey,
        persistedError: p.workflow_last_error ?? null,
        workflowFailed: p.status === 'error',
        workflowRunActive: p.status === 'analyzing',
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
  const analysisSummary = useMemo(() => formatStepSummaryLine('positioningAnalysis', analysisRows), [analysisRows]);

  const streamHint =
    formatCvExtractionHint(extractStream.streamMeta) ?? formatAnalysisStreamHint(analysisStream.streamMeta);

  const showCancelExtract = extractStepActive && !!extractCancelRunId && !!candidate?.id;
  const showCancelPositioning =
    (p.status === 'analyzing' || p.status === 'generating' || analysisStream.isLoading) && !!analyzeCancelRunId;

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

  const status = missionPositioningStatus({ status: p.status, addedVia, candidateStatus });
  const showDetailRow = showExtractStepList || showAnalysisStepList;
  const isReady = READY_STATUSES.has(p.status);
  const stopRow = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <Fragment>
      <TableRow
        className={cn(ROW, !canNavigate && 'cursor-default', isSelected && 'bg-primary/5 hover:bg-primary/10')}
        data-state={isSelected ? 'selected' : undefined}
        onClick={() => {
          if (href) router.push(href);
        }}
      >
        {selectable ? (
          <TableCell className="py-2 pl-4" onClick={stopRow}>
            {isReady ? (
              <Checkbox
                aria-label={isSelected ? `Retirer ${name} de la comparaison` : `Ajouter ${name} à la comparaison`}
                checked={isSelected}
                onCheckedChange={() => onToggleSelect(p.id)}
              />
            ) : null}
          </TableCell>
        ) : null}
        <TableCell className={cn('w-full max-w-0 py-2', !selectable && 'pl-4')}>
          <span className="flex items-center gap-2.5">
            <InitialsAvatar name={name} />
            <span className="flex min-w-0 flex-col">
              <span className="flex min-w-0 items-center gap-1.5">
                {href ? (
                  <Link href={href} onClick={stopRow} className={NAME_LINK}>
                    {name}
                  </Link>
                ) : (
                  <span className={NAME_LINK}>{name}</span>
                )}
                <span className="inline-flex shrink-0" onClick={stopRow} onKeyDown={stopRow}>
                  <AiGenerationInfoIcon
                    variant="positioning_analysis"
                    modelsLabel={formatHistoryModelsDisplayLabel(p.ai_analysis_models)}
                    modelsByTask={parsePositioningAnalysisModelsSnapshot(p.ai_analysis_models)?.byTask}
                    historyHref={candidateId ? `/review/${candidateId}/positioning/${p.id}` : null}
                    historyLinkLabel="Positionnement et historique"
                    stopClickPropagation
                  />
                </span>
              </span>
              {title ? <span className="truncate text-xs text-muted-foreground">{title}</span> : null}
              {p.analysis?.matchSummary && analysisComplete ? (
                <Tooltip>
                  <TooltipTrigger
                    render={<span className="hidden cursor-help truncate text-xs text-muted-foreground md:block" onClick={stopRow} />}
                  >
                    {p.analysis.matchSummary}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm text-xs">
                    {p.analysis.matchSummary}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              <span className="mt-1 md:hidden">
                <StatusBadge tone={status.tone} pulse={status.pulse}>
                  {status.label}
                </StatusBadge>
              </span>
            </span>
          </span>
        </TableCell>
        <TableCell className="py-2 font-mono text-sm tabular-nums">
          {score != null ? (
            <span className={cn('font-semibold', scoreToneText(score))}>
              <span className="sr-only">Score </span>
              {score}
              <span className="sr-only"> sur 100</span>
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="hidden py-2 md:table-cell">
          <StatusBadge tone={status.tone} pulse={status.pulse}>
            {status.label}
          </StatusBadge>
        </TableCell>
        <TableCell className="hidden py-2 font-mono text-xs tabular-nums text-muted-foreground md:table-cell">
          <time dateTime={p.created_at} title={new Date(p.created_at).toLocaleString('fr-FR')}>
            {formatRelativeDate(p.created_at)}
          </time>
        </TableCell>
        <TableCell className="py-2 pr-3 text-right">
          <span className="inline-flex items-center justify-end gap-0.5" onClick={stopRow}>
            {showCancelExtract || showCancelPositioning ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={showCancelExtract ? `Annuler l’extraction de ${name}` : `Annuler l’analyse de ${name}`}
                title="Annuler"
                onClick={handleCancel}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Square className="size-3.5" />
              </Button>
            ) : null}

            <AlertDialog>
              <Tooltip>
                <AlertDialogTrigger
                  render={
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Supprimer le positionnement de ${name}`}
                          disabled={deletePositioning.isPending}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        />
                      }
                    />
                  }
                >
                  {deletePositioning.isPending ? <Spinner className="size-3.5" /> : <Trash2 className="size-3.5" />}
                </AlertDialogTrigger>
                <TooltipContent side="bottom">Supprimer ce positionnement</TooltipContent>
              </Tooltip>
              <AlertDialogContent onClick={stopRow}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer ce positionnement ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Le dossier de positionnement sur cette mission sera définitivement
                    supprimé ; le CV du candidat reste dans la bibliothèque.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePositioning.mutate(
                        { id: p.id, candidateId: p.candidate_id, missionId },
                        {
                          onSuccess: () => {
                            toast.success('Positionnement supprimé');
                            onPositioningDeleted(p.id);
                          },
                          onError: () => {
                            toast.error('Impossible de supprimer le positionnement');
                          },
                        },
                      );
                    }}
                  >
                    Supprimer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {href ? (
              <Link
                href={href}
                aria-label={navigateToReviewOnly ? `Ouvrir la fiche CV de ${name}` : `Ouvrir le positionnement de ${name}`}
                title="Ouvrir"
                className={ICON_LINK}
              >
                <ArrowUpRight className="size-4" />
              </Link>
            ) : null}
          </span>
        </TableCell>
      </TableRow>

      {showDetailRow ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={selectable ? 6 : 5} className="whitespace-normal py-3 pl-4 pr-4">
            <div className="flex flex-col gap-3 md:ml-[2.625rem]" onClick={stopRow}>
              {showExtractStepList ? <WorkflowStepList rows={extractRows} summaryLine={extractSummary} /> : null}
              {showAnalysisStepList ? <WorkflowStepList rows={analysisRows} summaryLine={analysisSummary} /> : null}
              {p.status === 'error' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 text-xs text-destructive">
                    {p.workflow_last_error?.message ?? WORKFLOW_GENERIC_FAILURE_MESSAGE}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={analysisStream.isLoading}
                    onClick={() => analysisStream.submit({ positioningId: p.id })}
                  >
                    {analysisStream.isLoading ? <Spinner data-icon="inline-start" /> : null}
                    {analysisStream.isLoading ? 'Relance…' : 'Relancer l’analyse'}
                  </Button>
                </div>
              ) : null}
            </div>
          </TableCell>
        </TableRow>
      ) : streamHint && (extractStepActive || analyzeStepActive) ? (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={selectable ? 6 : 5} className="whitespace-normal py-1.5 pl-4 pr-4">
            <p className="text-xs text-muted-foreground md:ml-[2.625rem]" aria-live="polite">
              {streamHint}
            </p>
          </TableCell>
        </TableRow>
      ) : null}
    </Fragment>
  );
}
