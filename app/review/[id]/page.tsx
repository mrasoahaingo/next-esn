'use client';

import { useLayoutEffect, useCallback, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { ExtractedCV } from '@/lib/schema';
import type { CvExtractionStreamMeta } from '@/lib/types/cv-extraction-stream';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { useTemplateStore, fetchTemplateConfig } from '@/lib/stores/template.store';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import { useCandidate, useUpdateCandidate, useDeleteCandidate, useCancelWorkflow } from '@/lib/queries';
import type { CandidateWorkflowDiagnostics } from '@/lib/queries/candidates';
import { computeCvStepStates, formatStepSummaryLine } from '@/lib/workflow/compute-step-status';
import { getFrenchStepShortLabel } from '@/lib/workflow/workflow-step-labels';
import { queryKeys } from '@/lib/queries/keys';
import { formatDuration, formatSeconds } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, AlertCircle, Sparkles, PanelLeft, BadgeCheck, Clock, Cpu, Pencil, Target, Square, Save, CheckCircle2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PersonalInfo } from '../components/PersonalInfo';
import { Skills } from '../components/Skills';
import { Experiences } from '../components/Experiences';
import { Education } from '../components/Education';
import { Summary } from '../components/Summary';
import { PdfPreview } from '../components/PdfPreview';
import { PdfPreviewSync } from '../components/PdfPreviewSync';
import { SectionShell } from '../components/SectionShell';
import { ExtractionProgress, getSectionStatus } from '../components/ExtractionProgress';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
export default function ReviewPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const cvData = useCvBuilderStore((s) => s.cvData);
  const setCvData = useCvBuilderStore((s) => s.setCvData);
  const updateField = useCvBuilderStore((s) => s.updateField);
  const setPdfBlobUrl = useCvBuilderStore((s) => s.setPdfBlobUrl);
  const isDirty = useCvBuilderStore((s) => s.isDirty);
  const setDirty = useCvBuilderStore((s) => s.setDirty);

  const setTemplateConfig = useTemplateStore((s) => s.setTemplateConfig);

  const candidateId = params?.id as string;

  const { data: candidateData } = useCandidate(candidateId);
  const updateCandidate = useUpdateCandidate();

  const deleteCandidate = useDeleteCandidate();
  const cancelWorkflow = useCancelWorkflow();
  const router = useRouter();
  const { object, streamMeta, submit, isLoading, error, errorStepKey, stop, activeRunId } =
    useWorkflowStream<ExtractedCV, CvExtractionStreamMeta>({
    api: '/api/extract',
    runId: candidateData?.workflow_run_id,
    runStatus: candidateData?.status,
    activeStatuses: ['extracting'],
    onFinish: () => {
      const oid = orgId ?? '';
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(oid, candidateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
      toast.success('Extraction terminee avec succes');
      setDirty(false);
    },
  });

  const persistedWorkflowError =
    (candidateData as CandidateWorkflowDiagnostics | undefined)?.workflow_last_error ?? null;

  useEffect(() => {
    if (!error) return;
    const key = errorStepKey ?? persistedWorkflowError?.stepKey;
    const label = key ? getFrenchStepShortLabel('cv', key) : 'Extraction CV';
    toast.error(`${label} : échec. Réessayez ou contactez le support.`, { duration: 8000 });
  }, [error, errorStepKey, persistedWorkflowError?.stepKey]);

  const cvWorkflowRunActive =
    !!candidateData?.workflow_run_id &&
    ['uploaded', 'extracting'].includes(candidateData?.status ?? '');

  const cvWorkflowRows = useMemo(
    () =>
      computeCvStepStates({
        streamMeta,
        partialData: cvData,
        isStreaming: isLoading,
        errorStepKey,
        persistedError: persistedWorkflowError,
        workflowFailed: candidateData?.status === 'error',
        workflowRunActive: cvWorkflowRunActive,
      }),
    [
      streamMeta,
      cvData,
      isLoading,
      errorStepKey,
      persistedWorkflowError,
      candidateData?.status,
      cvWorkflowRunActive,
    ],
  );

  const cvWorkflowSummary = useMemo(
    () => formatStepSummaryLine('cv', cvWorkflowRows),
    [cvWorkflowRows],
  );

  /** Comme le positionnement : liste d’étapes pendant l’extraction ou en erreur ; masquée une fois terminé. */
  const showCvWorkflowUi =
    isLoading ||
    candidateData?.status === 'extracting' ||
    candidateData?.status === 'error' ||
    cvWorkflowRunActive;

  const isExtractionWorkflowActive =
    isLoading || candidateData?.status === 'extracting';

  // Derive time tracking from candidateData during render (no useState + layout effect sync)
  const aiDurationMs = candidateData?.ai_extraction_duration_ms ?? null;
  const userTimeSeconds = candidateData?.user_review_time_seconds ?? null;

  const extractionModels = useMemo(() => {
    const raw = (candidateData as { ai_extraction_models?: unknown } | undefined)?.ai_extraction_models;
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (typeof o.byTask !== 'object' || o.byTask === null) return null;
    const byTask = o.byTask as Record<string, string>;
    const uniqueModels = Array.isArray(o.uniqueModels)
      ? (o.uniqueModels as string[]).join(', ')
      : Object.values(byTask).join(', ');
    return { byTask, label: uniqueModels || null };
  }, [candidateData]);

  /** Gabarit toujours celui par défaut de l’org (pas de choix par candidat). */
  const pdfTemplateId =
    candidateData?.id !== undefined ? null : undefined;

  useSessionTimer({
    endpoint: `/api/candidates/${params?.id}/time`,
    enabled: !isLoading && !!cvData,
  });

  // Track the last candidate id we initialized for
  const initializedForId = useRef<string | null>(null);

  // Load candidate data & trigger extraction if needed
  useLayoutEffect(() => {
    if (!candidateData) return;

    // Don't reset while we're actively streaming
    if (isLoading) return;

    const isNewCandidate = initializedForId.current !== candidateData.id;

    if (isNewCandidate) {
      // Reset store so stale data and PDF from the previous CV are not visible
      setCvData(null);
      setPdfBlobUrl(null);
      setDirty(false);
      setTemplateConfig(null);
      initializedForId.current = candidateData.id;

      fetchTemplateConfig(null).then((config) => {
        setTemplateConfig(config);
      });
    }

    // Already extracted — load data without triggering AI
    if (candidateData.extracted_data && ['reviewing', 'ready', 'generated'].includes(candidateData.status)) {
      setCvData(candidateData.extracted_data);
      return;
    }

    // Extraction in progress — reconnection is handled by useWorkflowStream
    if (candidateData.status === 'extracting') {
      return;
    }

    // Legacy `uploaded` (annulation, échec workflow, ancienne donnée) : lancer via handleRetryExtraction uniquement
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateData?.id, candidateData?.status]);

  // Sync streaming object to store
  useLayoutEffect(() => {
    if (object) {
      setCvData(object as Partial<ExtractedCV>);
    }
  }, [object, setCvData]);

  const handleUpdate = useCallback((field: keyof ExtractedCV, value: unknown) => {
    updateField(field, value);
  }, [updateField]);

  const handleSave = useCallback(() => {
    if (!cvData) return;
    updateCandidate.mutate(
      { id: candidateId, extracted_data: cvData },
      { onSuccess: () => setDirty(false) },
    );
  }, [cvData, candidateId, updateCandidate, setDirty]);

  const handleMarkReady = useCallback(() => {
    if (!cvData) return;
    updateCandidate.mutate(
      { id: candidateId, extracted_data: cvData, status: 'ready' },
      { onSuccess: () => setDirty(false) },
    );
  }, [cvData, candidateId, updateCandidate, setDirty]);

  const handleRetryExtraction = useCallback(() => {
    setCvData(null);
    submit({ candidateId: params?.id });
  }, [setCvData, submit, params?.id]);

  const extractionCancelRunId = candidateData?.workflow_run_id ?? activeRunId;

  const handleCancelExtraction = useCallback(() => {
    const runId = extractionCancelRunId;
    if (!runId) return;
    stop();
    cancelWorkflow.mutate({
      runId,
      table: 'candidates',
      recordId: candidateId,
      resetStatus: 'uploaded',
    });
  }, [extractionCancelRunId, candidateId, stop, cancelWorkflow]);

  const handleDelete = useCallback(() => {
    const runId = candidateData?.workflow_run_id ?? activeRunId;
    if (runId && isLoading) {
      stop();
      cancelWorkflow.mutate({
        runId,
        table: 'candidates',
        recordId: candidateId,
        resetStatus: 'uploaded',
      });
    }
    deleteCandidate.mutate(candidateId, {
      onSuccess: () => router.push('/dashboard'),
    });
  }, [candidateData?.workflow_run_id, activeRunId, candidateId, isLoading, stop, cancelWorkflow, deleteCandidate, router]);

  const safeData = cvData as Partial<ExtractedCV> | undefined;

  // Memoize filtered arrays to avoid unstable references on every render
  const safeExperiences = useMemo(
    () => (safeData?.experiences ?? []).filter(Boolean),
    [safeData?.experiences],
  );
  const safeEducation = useMemo(
    () => (safeData?.education ?? []).filter(Boolean),
    [safeData?.education],
  );
  const safeSkills = safeData?.skills;

  // Stable per-field callbacks
  const handlePersonalInfo = useCallback((val: unknown) => handleUpdate('personalInfo', val), [handleUpdate]);
  const handleSummary = useCallback((val: unknown) => handleUpdate('summary', val), [handleUpdate]);
  const handleSkills = useCallback((val: unknown) => handleUpdate('skills', val), [handleUpdate]);
  const handleExperiences = useCallback((val: unknown) => handleUpdate('experiences', val), [handleUpdate]);
  const handleEducation = useCallback((val: unknown) => handleUpdate('education', val), [handleUpdate]);

  const sectionSpacing = safeData?.sectionSpacing ?? {};
  const handleSectionSpacing = useCallback((section: string, value: number) => {
    handleUpdate('sectionSpacing', { ...((cvData as Partial<ExtractedCV>)?.sectionSpacing ?? {}), [section]: value });
  }, [handleUpdate, cvData]);

  // Section status helper
  const status = (field: keyof ExtractedCV) =>
    getSectionStatus(cvData, isLoading, field, streamMeta);

  // Determine if save button should be enabled
  const canSave = !isLoading && !!cvData && isDirty && !updateCandidate.isPending;

  // Determine if "Valider" button should be enabled
  const isReady = candidateData?.status === 'ready' || candidateData?.status === 'generated';
  const canMarkReady = !isLoading && !!cvData && !updateCandidate.isPending && !isReady;

  // Determine if positioning is available
  const canPosition = !isLoading && !!cvData;

  if (!cvData && !isLoading) {
    const needsManualExtraction = candidateData?.status === 'uploaded';
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full bg-background text-foreground">
        {needsManualExtraction ? (
          <div className="flex max-w-md flex-col items-center gap-3 text-center text-muted-foreground">
            <p className="text-sm">
              L&apos;extraction n&apos;a pas encore été lancée ou a été interrompue. Lancez-la pour continuer.
            </p>
            <Button
              type="button"
              onClick={handleRetryExtraction}
              disabled={isExtractionWorkflowActive}
            >
              {isExtractionWorkflowActive && <Spinner data-icon="inline-start" />}
              {candidateData?.status === 'error'
                ? "Relancer l'extraction"
                : "Lancer l'extraction"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="animate-spin mr-2" /> Chargement...
          </div>
        )}
        <div className="flex items-center gap-2">
          {candidateData?.status === 'extracting' && extractionCancelRunId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelExtraction}
              disabled={cancelWorkflow.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {cancelWorkflow.isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="mr-1.5 h-3.5 w-3.5" />
              )}
              Annuler l&apos;extraction
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleteCandidate.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {deleteCandidate.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Supprimer
                </Button>
              }
            />
            <AlertDialogContent className="bg-panel border-overlay/10">
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce CV ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le CV et toutes ses données seront définitivement supprimés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-full bg-background text-foreground">
      <div className="px-4 pt-4 md:px-6">
        {/* Top bar */}
        <div className="rounded-2xl glass-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary neon-ring">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                  <PanelLeft className="h-3 w-3 text-accent" />
                  CV Builder
                </div>
                <h1 className="text-lg font-semibold title-gradient">
                  {isLoading ? 'Extraction en cours...' : 'Edition du CV'}
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Cancel extraction */}
              {isLoading && extractionCancelRunId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelExtraction}
                  disabled={cancelWorkflow.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  {cancelWorkflow.isPending ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Annuler
                </Button>
              )}

              {/* Delete candidate */}
              <AlertDialog>
                <Tooltip>
                  <AlertDialogTrigger
                    render={
                      <TooltipTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteCandidate.isPending}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deleteCandidate.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        }
                      />
                    }
                  />
                  <TooltipContent side="bottom" className="text-xs">
                    Supprimer ce CV
                  </TooltipContent>
                </Tooltip>
                <AlertDialogContent className="bg-panel border-overlay/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce CV ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Le CV et toutes ses données seront définitivement supprimés.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Time tracking indicators */}
              {(aiDurationMs || userTimeSeconds) && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2 rounded-lg border border-overlay/10 bg-overlay/[0.06] px-3 py-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDuration((aiDurationMs ?? 0) + (userTimeSeconds ?? 0) * 1000)}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    <div className="space-y-1">
                      {aiDurationMs != null && aiDurationMs > 0 && (
                        <p className="flex items-center gap-1.5">
                          <Cpu className="h-3 w-3 text-accent" />
                          Extraction IA : <span className="font-semibold">{formatDuration(aiDurationMs)}</span>
                        </p>
                      )}
                      {userTimeSeconds != null && userTimeSeconds > 0 && (
                        <p className="flex items-center gap-1.5">
                          <Pencil className="h-3 w-3 text-violet" />
                          Edition : <span className="font-semibold">{formatSeconds(userTimeSeconds)}</span>
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}

              {isDirty && !isLoading && (
                <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                  Modifications non sauvegardées
                </Badge>
              )}

              {isReady && !isDirty && (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Prêt
                </Badge>
              )}

              <Button
                variant="outline"
                onClick={handleSave}
                disabled={!canSave}
              >
                {updateCandidate.isPending && !canMarkReady ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Sauvegarder
              </Button>

              {canMarkReady ? (
                <Button
                  onClick={handleMarkReady}
                  disabled={updateCandidate.isPending}
                >
                  {updateCandidate.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BadgeCheck className="mr-2 h-4 w-4" />
                  )}
                  Valider le CV
                </Button>
              ) : null}

              {canPosition ? (
                <Button variant="outline" nativeButton={false} render={<Link href={`/review/${params.id}/positioning`} />}>
                  <Target className="mr-2 h-4 w-4" />
                  Positionner le CV
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button variant="outline" disabled>
                        <Target className="mr-2 h-4 w-4" />
                        Positionner le CV
                      </Button>
                    }
                  />
                  <TooltipContent side="bottom" className="text-xs">
                    Attendez la fin de l&apos;extraction avant de positionner
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Extraction progress */}
          <ExtractionProgress
            data={cvData}
            isStreaming={isLoading}
            streamMeta={streamMeta}
            workflowStepRows={showCvWorkflowUi ? cvWorkflowRows : undefined}
            workflowSummaryLine={showCvWorkflowUi ? cvWorkflowSummary : undefined}
            hideStepsList={!showCvWorkflowUi}
            extractionModelsLabel={extractionModels?.label}
            extractionModelsByTask={extractionModels?.byTask}
          />
          {!showCvWorkflowUi &&
            candidateData &&
            ['reviewing', 'ready', 'generated'].includes(candidateData.status) && (
              <details className="mt-3 rounded-xl border border-border/60 bg-card/30 px-3 py-2 [&_summary::-webkit-details-marker]:hidden [&_summary]:list-none">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  Détail des étapes d&apos;extraction
                </summary>
                <div className="mt-3 border-t border-border/40 pt-3">
                  <WorkflowStepList rows={cvWorkflowRows} summaryLine={null} />
                </div>
              </details>
            )}
        </div>

      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 gap-4 px-4 py-4 md:px-6 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-4">
          {error && (
            <div className="flex items-center rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              {error.message}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetryExtraction}
                disabled={isExtractionWorkflowActive}
                className="ml-auto"
              >
                {isExtractionWorkflowActive && <Spinner data-icon="inline-start" />}
                Réessayer
              </Button>
            </div>
          )}
          <SectionShell status={status('personalInfo')} label="Extraction de l'identité...">
            <PersonalInfo
              data={safeData?.personalInfo}
              onChange={handlePersonalInfo}
              readOnly={isLoading}
            />
          </SectionShell>
          <SectionShell status={status('summary')} label="Rédaction du résumé...">
            <Summary
              data={safeData?.summary}
              onChange={handleSummary}
              readOnly={isLoading}
              spacingAfter={sectionSpacing.summary}
              onSpacingChange={(v) => handleSectionSpacing('summary', v)}
            />
          </SectionShell>
          <SectionShell status={status('skills')} label="Analyse des compétences...">
            <Skills
              data={safeSkills}
              onChange={handleSkills}
              readOnly={isLoading}
              spacingAfter={sectionSpacing.skills}
              onSpacingChange={(v) => handleSectionSpacing('skills', v)}
            />
          </SectionShell>
          <SectionShell status={status('education')} label="Extraction des formations...">
            <Education
              data={safeEducation}
              onChange={handleEducation}
              readOnly={isLoading}
            />
          </SectionShell>
          <SectionShell status={status('experiences')} label="Analyse des expériences...">
            <Experiences
              data={safeExperiences}
              onChange={handleExperiences}
              skills={safeSkills}
              onSkillsChange={handleSkills}
              readOnly={isLoading}
            />
          </SectionShell>
        </div>

        {/* Right: PDF Preview */}
        <>
          <PdfPreviewSync
            data={cvData}
            onResetPreview={() => setPdfBlobUrl(null)}
            templateId={pdfTemplateId}
          />
          <PdfPreview />
        </>
      </div>
    </div>
  );
}
