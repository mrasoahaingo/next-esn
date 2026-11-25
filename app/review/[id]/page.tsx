/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P4 H4 E4 S4 R4 V4 · v2 */
'use client';

import { useLayoutEffect, useCallback, useMemo, useRef, useEffect, useState } from 'react';
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
import { StatusBadge } from '@/components/app/status-badge';
import { InitialsAvatar } from '@/components/app/initials-avatar';
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
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/app/page-header';
import { Panel } from '@/components/app/panel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { PersonalInfo } from '../components/PersonalInfo';
import { Skills } from '../components/Skills';
import { Experiences } from '../components/Experiences';
import { Education } from '../components/Education';
import { Summary } from '../components/Summary';
import { PdfPreview } from '../components/PdfPreview';
import { PdfPreviewSync } from '../components/PdfPreviewSync';
import { SectionShell } from '../components/SectionShell';
import { ExtractionProgress, getSectionStatus } from '../components/ExtractionProgress';
import { candidateFileName, candidateNameFromFile } from '../components/candidate-file-name';
import { countIncludedSkills } from '../components/count-included-skills';

type SectionKey = 'personalInfo' | 'summary' | 'skills' | 'education' | 'experiences';

/** Onglets du dossier, dans l'ordre du CV. */
const SECTION_TABS: { key: SectionKey; label: string }[] = [
  { key: 'personalInfo', label: 'Identité' },
  { key: 'summary', label: 'Résumé' },
  { key: 'skills', label: 'Compétences' },
  { key: 'education', label: 'Formations' },
  { key: 'experiences', label: 'Expériences' },
];

const SECTION_LABELS = {
  personalInfo: 'Extraction de l’identité…',
  summary: 'Rédaction du résumé…',
  skills: 'Analyse des compétences…',
  education: 'Extraction des formations…',
  experiences: 'Analyse des expériences…',
} as const;

const IMPORT_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

function formatImportDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return IMPORT_DATE_FORMAT.format(date);
}

/** Corps d'un onglet en attente : le squelette calme de `SectionShell`, avec le padding du panneau. */
function TabSkeleton({ label }: { label: string }) {
  return (
    <div className="p-4">
      <SectionShell status="pending" label={label}>
        {null}
      </SectionShell>
    </div>
  );
}

/** Supprimer : `ghost` icône derrière l'`AlertDialog`, la seule confirmation de l'écran. */
function DeleteCandidateDialog({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <Tooltip>
        <AlertDialogTrigger
          render={
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" disabled={pending} aria-label="Supprimer ce CV">
                  {pending ? <Spinner /> : <Trash2 />}
                </Button>
              }
            />
          }
        />
        <TooltipContent side="bottom">Supprimer ce CV</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce CV ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le CV et toutes ses données seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
      // Succès silencieux (DESIGN.md § Mouvement) : la zone d'état passe à « Extraction terminée ».
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

  /** Comme le positionnement : liste d’étapes pendant l’extraction ou en erreur ; repliée une fois terminé. */
  const showCvWorkflowUi =
    isLoading ||
    candidateData?.status === 'extracting' ||
    candidateData?.status === 'error' ||
    cvWorkflowRunActive;

  const isExtractionWorkflowActive =
    isLoading || candidateData?.status === 'extracting';

  const extractionCompleted =
    !showCvWorkflowUi &&
    !!candidateData &&
    ['reviewing', 'ready', 'generated'].includes(candidateData.status);

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
      onError: (error) => toast.error(error.message, { duration: 8000 }),
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

  // Which of the two `updateCandidate` callers is in flight (same mutation, two buttons)
  const validatePending = updateCandidate.isPending && updateCandidate.variables?.status === 'ready';
  const savePending = updateCandidate.isPending && !validatePending;

  // ─── En-tête : titre, description, faits ───────────────────────────────────
  const hasData = !!cvData;
  const needsManualExtraction =
    !hasData && !isLoading && (candidateData?.status === 'uploaded' || candidateData?.status === 'error');
  const showCancelExtraction =
    (isLoading || candidateData?.status === 'extracting') && !!extractionCancelRunId;

  const originalFileUrl = (candidateData as { original_file_url?: string } | undefined)?.original_file_url;
  const fileName = candidateFileName(originalFileUrl);
  const candidateName = useMemo(() => {
    const pi =
      (cvData as Partial<ExtractedCV> | null)?.personalInfo ??
      (candidateData?.extracted_data as Partial<ExtractedCV> | null | undefined)?.personalInfo;
    const name = [pi?.firstName, pi?.lastName].filter(Boolean).join(' ').trim();
    return name.length > 0 ? name : null;
  }, [cvData, candidateData?.extracted_data]);

  const titleText =
    candidateName ??
    (isExtractionWorkflowActive
      ? 'CV en cours d’extraction'
      : needsManualExtraction
        ? 'CV à extraire'
        : (candidateNameFromFile(originalFileUrl) ?? 'CV'));
  // Signe de vie (DESIGN.md § Révision v2) : l'avatar à initiales devant le nom du candidat.
  const title = candidateName ? (
    <span className="flex min-w-0 items-center gap-3">
      <InitialsAvatar name={candidateName} size="lg" />
      <span className="truncate">{titleText}</span>
    </span>
  ) : (
    titleText
  );

  const importDate = formatImportDate((candidateData as { created_at?: string } | undefined)?.created_at);
  const description = !candidateData ? 'Chargement…' : importDate ? `CV importé le ${importDate}` : null;

  const totalSessionMs = (aiDurationMs ?? 0) + (userTimeSeconds ?? 0) * 1000;
  const showSessionTime = totalSessionMs > 0;
  const saveBadge =
    isDirty && !isLoading ? (
      <StatusBadge tone="warn" className="font-sans">
        Modifications non sauvegardées
      </StatusBadge>
    ) : isReady && !isDirty ? (
      <StatusBadge tone="ok" className="font-sans">
        Validé
      </StatusBadge>
    ) : hasData && !isLoading ? (
      <StatusBadge tone="neutral" className="font-sans">
        Enregistré
      </StatusBadge>
    ) : null;

  const meta =
    fileName || showSessionTime || saveBadge ? (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
        {fileName ? <span className="break-all">{fileName}</span> : null}
        {showSessionTime ? (
          <>
            {fileName ? <span aria-hidden="true">·</span> : null}
            <Tooltip>
              <TooltipTrigger
                render={<span className="cursor-help underline decoration-dotted underline-offset-4" />}
              >
                {formatDuration(totalSessionMs)} de session
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {aiDurationMs != null && aiDurationMs > 0 ? (
                  <p>Extraction IA : {formatDuration(aiDurationMs)}</p>
                ) : null}
                {userTimeSeconds != null && userTimeSeconds > 0 ? (
                  <p>Édition : {formatSeconds(userTimeSeconds)}</p>
                ) : null}
              </TooltipContent>
            </Tooltip>
          </>
        ) : null}
        {saveBadge ? (
          <>
            {fileName || showSessionTime ? <span aria-hidden="true">·</span> : null}
            {saveBadge}
          </>
        ) : null}
      </span>
    ) : null;

  const actions = (
    <>
      <DeleteCandidateDialog pending={deleteCandidate.isPending} onConfirm={handleDelete} />

      {showCancelExtraction ? (
        <Button variant="ghost" onClick={handleCancelExtraction} disabled={cancelWorkflow.isPending}>
          {cancelWorkflow.isPending ? <Spinner data-icon="inline-start" /> : null}
          Annuler l&apos;extraction
        </Button>
      ) : null}

      {isDirty && hasData && !isLoading ? (
        <Button variant="ghost" onClick={handleSave} disabled={!canSave}>
          {savePending ? <Spinner data-icon="inline-start" /> : null}
          Sauvegarder
        </Button>
      ) : null}

      {canPosition ? (
        <Button variant="outline" nativeButton={false} render={<Link href={`/review/${params.id}/positioning`} />}>
          Positionner le CV
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" disabled />}>Positionner le CV</TooltipTrigger>
          <TooltipContent side="bottom">Attendez la fin de l&apos;extraction avant de positionner</TooltipContent>
        </Tooltip>
      )}

      {needsManualExtraction ? (
        <Button type="button" onClick={handleRetryExtraction} disabled={isExtractionWorkflowActive}>
          {isExtractionWorkflowActive ? <Spinner data-icon="inline-start" /> : null}
          {candidateData?.status === 'error' ? 'Relancer l’extraction' : 'Lancer l’extraction'}
        </Button>
      ) : null}

      {canMarkReady ? (
        <Button onClick={handleMarkReady} disabled={updateCandidate.isPending}>
          {validatePending ? <Spinner data-icon="inline-start" /> : null}
          Valider le CV
        </Button>
      ) : null}
    </>
  );

  const statusZone = (
    <ExtractionProgress
      data={cvData}
      isStreaming={isLoading}
      streamMeta={streamMeta}
      rows={cvWorkflowRows}
      summaryLine={cvWorkflowSummary}
      showSteps={showCvWorkflowUi}
      completed={extractionCompleted}
      durationMs={aiDurationMs}
      error={
        error
          ? { message: error.message, onRetry: handleRetryExtraction, retryPending: isExtractionWorkflowActive }
          : null
      }
      extractionModelsLabel={extractionModels?.label}
      extractionModelsByTask={extractionModels?.byTask}
    />
  );

  const showForm = hasData || isLoading;

  // ─── Onglets du dossier : choix de l'utilisateur, sinon la section en cours ──
  const [chosenTab, setChosenTab] = useState<SectionKey | null>(null);
  const streamingTab = isLoading ? SECTION_TABS.find((t) => status(t.key) === 'streaming')?.key : undefined;
  const activeTab: SectionKey = chosenTab ?? streamingTab ?? 'personalInfo';
  const tabCounts: Partial<Record<SectionKey, number>> = {
    skills: countIncludedSkills(safeSkills),
    education: safeEducation.length,
    experiences: safeExperiences.length,
  };

  return (
    <div className="min-h-full bg-shell px-4 py-6 text-foreground md:px-6">
      <PageHeader title={title} description={description} meta={meta} actions={actions} status={statusZone} />

      {/* Diptyque asymétrique : le dossier à gauche, ce qu'il devient à droite */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="min-w-0 lg:col-span-7 lg:self-start" aria-label="Dossier du candidat">
          <Tabs value={activeTab} onValueChange={(v) => setChosenTab(String(v) as SectionKey)} className="gap-0">
            {/* Bande d'onglets : défile horizontalement sous md, sans faire défiler la page */}
            <div className="overflow-x-auto overflow-y-hidden border-b border-border px-4 [scrollbar-width:thin]">
              <TabsList variant="line" className="h-11 gap-5 p-0">
                {SECTION_TABS.map((tab) => {
                  const tabStatus = isLoading ? status(tab.key) : 'done';
                  return (
                    <TabsTrigger key={tab.key} value={tab.key} className="h-full flex-none px-0 after:bottom-0">
                      {tabStatus !== 'done' ? (
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            tabStatus === 'streaming'
                              ? 'bg-primary animate-pulse motion-reduce:animate-none'
                              : 'bg-muted-foreground/40',
                          )}
                          aria-hidden
                        />
                      ) : null}
                      {tab.label}
                      {tabCounts[tab.key] ? (
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {tabCounts[tab.key]}
                        </span>
                      ) : null}
                      {tabStatus !== 'done' ? (
                        <span className="sr-only">{tabStatus === 'streaming' ? ' (en cours)' : ' (en attente)'}</span>
                      ) : null}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <TabsContent value="personalInfo">
              {showForm && status('personalInfo') !== 'pending' ? (
                <PersonalInfo
                  embedded
                  status={status('personalInfo')}
                  data={safeData?.personalInfo}
                  onChange={handlePersonalInfo}
                  readOnly={isLoading}
                />
              ) : (
                <TabSkeleton label={SECTION_LABELS.personalInfo} />
              )}
            </TabsContent>
            <TabsContent value="summary">
              {showForm && status('summary') !== 'pending' ? (
                <Summary
                  embedded
                  status={status('summary')}
                  data={safeData?.summary}
                  onChange={handleSummary}
                  readOnly={isLoading}
                  spacingAfter={sectionSpacing.summary}
                  onSpacingChange={(v) => handleSectionSpacing('summary', v)}
                />
              ) : (
                <TabSkeleton label={SECTION_LABELS.summary} />
              )}
            </TabsContent>
            <TabsContent value="skills">
              {showForm && status('skills') !== 'pending' ? (
                <Skills
                  embedded
                  status={status('skills')}
                  data={safeSkills}
                  onChange={handleSkills}
                  readOnly={isLoading}
                  spacingAfter={sectionSpacing.skills}
                  onSpacingChange={(v) => handleSectionSpacing('skills', v)}
                />
              ) : (
                <TabSkeleton label={SECTION_LABELS.skills} />
              )}
            </TabsContent>
            <TabsContent value="education">
              {showForm && status('education') !== 'pending' ? (
                <Education
                  embedded
                  status={status('education')}
                  data={safeEducation}
                  onChange={handleEducation}
                  readOnly={isLoading}
                />
              ) : (
                <TabSkeleton label={SECTION_LABELS.education} />
              )}
            </TabsContent>
            <TabsContent value="experiences">
              {showForm && status('experiences') !== 'pending' ? (
                <Experiences
                  embedded
                  status={status('experiences')}
                  data={safeExperiences}
                  onChange={handleExperiences}
                  skills={safeSkills}
                  onSkillsChange={handleSkills}
                  readOnly={isLoading}
                />
              ) : (
                <TabSkeleton label={SECTION_LABELS.experiences} />
              )}
            </TabsContent>
          </Tabs>
        </Panel>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:col-span-5 lg:self-start" aria-label="Aperçu PDF">
          {showForm ? (
            <PdfPreviewSync
              data={cvData}
              onResetPreview={() => setPdfBlobUrl(null)}
              templateId={pdfTemplateId}
            />
          ) : null}
          <PdfPreview title="Aperçu" className="lg:max-h-[calc(100svh-7rem)]" />
        </aside>
      </div>
    </div>
  );
}
