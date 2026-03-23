'use client';

import { useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ExtractedCV } from '@/lib/schema';
import type { CvExtractionStreamMeta } from '@/lib/types/cv-extraction-stream';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { useTemplateStore, fetchTemplateConfig } from '@/lib/stores/template.store';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import { useCandidate, useUpdateCandidate, useDeleteCandidate, useCancelWorkflow } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/keys';
import { formatDuration, formatSeconds } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, AlertCircle, Sparkles, PanelLeft, BadgeCheck, Clock, Cpu, Pencil, Target, RefreshCw, Square, Save, CheckCircle2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PersonalInfo } from '../components/PersonalInfo';
import { Skills } from '../components/Skills';
import { Experiences } from '../components/Experiences';
import { Education } from '../components/Education';
import { Summary } from '../components/Summary';
import { PdfPreview } from '../components/PdfPreview';
import { SectionShell } from '../components/SectionShell';
import { ExtractionProgress, getSectionStatus } from '../components/ExtractionProgress';

export default function ReviewPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const {
    cvData,
    setCvData,
    updateField,
    setPdfBlobUrl,
    setIsPdfLoading,
    isDirty,
    setDirty,
  } = useCvBuilderStore();

  const setTemplateConfig = useTemplateStore((s) => s.setTemplateConfig);

  const candidateId = params?.id as string;

  const { data: candidateData } = useCandidate(candidateId);
  const updateCandidate = useUpdateCandidate();

  const deleteCandidate = useDeleteCandidate();
  const cancelWorkflow = useCancelWorkflow();
  const router = useRouter();

  const { object, streamMeta, submit, isLoading, error, stop } = useWorkflowStream<
    ExtractedCV,
    CvExtractionStreamMeta
  >({
    api: '/api/extract',
    runId: candidateData?.workflow_run_id,
    runStatus: candidateData?.status,
    activeStatuses: ['extracting'],
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(candidateId) });
      setDirty(false);
    },
  });

  // Derive time tracking from candidateData during render (no useState + layout effect sync)
  const aiDurationMs = candidateData?.ai_extraction_duration_ms ?? null;
  const userTimeSeconds = candidateData?.user_review_time_seconds ?? null;

  const pdfTemplateId =
    candidateData?.id !== undefined ? (candidateData.template_id ?? null) : undefined;

  usePdfPreview({
    data: cvData,
    setPdfBlobUrl,
    setIsPdfLoading,
    templateId: pdfTemplateId,
  });

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

      // Load template config (from candidate's template or default)
      fetchTemplateConfig(candidateData.template_id).then((config) => {
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

    // Not yet extracted — start extraction
    if (candidateData.status === 'uploaded' && isNewCandidate) {
      submit({ candidateId: params?.id });
    }
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

  const handleCancelExtraction = useCallback(() => {
    const runId = candidateData?.workflow_run_id;
    if (!runId) return;
    stop();
    cancelWorkflow.mutate({
      runId,
      table: 'candidates',
      recordId: candidateId,
      resetStatus: 'uploaded',
    });
  }, [candidateData?.workflow_run_id, candidateId, stop, cancelWorkflow]);

  const handleDelete = useCallback(() => {
    const runId = candidateData?.workflow_run_id;
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
      onSuccess: () => router.push('/'),
    });
  }, [candidateData?.workflow_run_id, candidateId, isLoading, stop, cancelWorkflow, deleteCandidate, router]);

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
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full bg-background text-foreground">
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="animate-spin mr-2" /> Chargement...
        </div>
        <div className="flex items-center gap-2">
          {candidateData?.status === 'extracting' && candidateData?.workflow_run_id && (
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
    <div className="grid h-full grid-rows-[auto_1fr] bg-background text-foreground">
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
              {isLoading && candidateData?.workflow_run_id && (
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
          <ExtractionProgress data={cvData} isStreaming={isLoading} streamMeta={streamMeta} />
        </div>

      </div>

      {/* Split layout: two independent scroll columns */}
      <div className="grid min-h-0 grid-cols-1 gap-4 px-4 py-4 md:px-6 lg:grid-cols-2">
        {/* Left: Form (independent scroll) */}
        <div className="overflow-y-auto space-y-4">
          {error && (
            <div className="flex items-center rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              {error.message}
              <Button variant="ghost" size="sm" onClick={handleRetryExtraction} className="ml-auto">
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
          </div>
          <SectionShell status={status('skills')} label="Analyse des compétences...">
            <Skills
              data={safeSkills}
              onChange={handleSkills}
              readOnly={isLoading}
              spacingAfter={sectionSpacing.skills}
              onSpacingChange={(v) => handleSectionSpacing('skills', v)}
            />
          </SectionShell>
          <SectionShell status={status('experiences')} label="Analyse des expériences...">
            <Experiences
              data={safeExperiences}
              onChange={handleExperiences}
              readOnly={isLoading}
            />
          </SectionShell>
          <SectionShell status={status('education')} label="Extraction des formations...">
            <Education
              data={safeEducation}
              onChange={handleEducation}
              readOnly={isLoading}
            />
          </SectionShell>
        </div>

        {/* Right: PDF Preview (independent scroll) */}
        <div className="overflow-y-auto">
          <PdfPreview />
        </div>
      </div>
    </div>
  );
}
