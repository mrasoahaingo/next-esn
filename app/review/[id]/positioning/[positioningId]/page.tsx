/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app · critique: P5 H4 E4 S5 R4 V4 */
'use client';

import { useLayoutEffect, useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import type { ExtractedCV, PositioningAnalysis, PositioningOutput } from '@/lib/schema';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { useTemplateStore, fetchTemplateConfig } from '@/lib/stores/template.store';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import {
  usePositioning,
  useCandidate,
  useUpdatePositioning,
  useExportPositioning,
  useDeletePositioning,
  useCancelWorkflow,
} from '@/lib/queries';
import type { PositioningWorkflowDiagnostics } from '@/lib/queries/positionings';
import {
  computePositioningAnalysisStepStates,
  computePositioningGenerateStepStates,
  formatStepSummaryLine,
} from '@/lib/workflow/compute-step-status';
import { getFrenchStepShortLabel } from '@/lib/workflow/workflow-step-labels';
import {
  POSITIONING_ANALYSIS_SUCCESS_STATUSES,
  POSITIONING_GENERATE_SUCCESS_STATUSES,
  resolveWorkflowOutcome,
} from '@/lib/workflow/workflow-outcome';
import { resolvePositioningAnalysisFailure } from '@/lib/workflow/positioning-failure-state';
import { queryKeys } from '@/lib/queries/keys';
import { formatDuration, formatSeconds } from '@/lib/utils/format';
import { matchScoreConfidenceShortLabel } from '@/lib/utils/match-score-confidence';
import { pdfEmbedSrc } from '@/lib/utils/pdf-embed';
import { buildCvPdfFilename } from '@/lib/utils/cv-pdf-filename';
import {
  analysisPhaseAffinageDiffersFromSnapshotForCurrentQuestions,
  analysisPhaseAnswersOnly,
  buildMissionPositionHeadline,
  extractRecruiterEntriesFromParsed,
  hasUsableJobAnalysisForPositioning,
  mergePositioningAnswersForPersistence,
  parsePositioningAnswers,
  removeEntryFromAnalysisRecruiterSnapshot,
} from '@/lib/services/positioning.service';
import {
  formatPositioningAnalysisModelsLabel,
  parsePositioningAnalysisModelsSnapshot,
} from '@/lib/types/positioning-analysis-models';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Trash2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/app/page-header';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import { WorkflowFailureAlert } from '@/components/workflow/WorkflowFailureAlert';
import { PdfPreview } from '@/app/review/components/PdfPreview';
import { JobInput } from './components/JobInput';
import { AnalysisView } from './components/AnalysisView';
import { PositioningAnalysisHistoryTabContent } from './components/PositioningAnalysisHistoryPanel';
import { QuestionsPanel } from './components/QuestionsPanel';
import { EmailsGenerationStep } from './components/EmailsGenerationStep';
import { CvGenerationStep } from './components/CvGenerationStep';
import { MatchingReadout } from './components/MatchingReadout';
import { PositioningStepper, type PositioningStep } from './components/PositioningStepper';
import { countStrongSkills } from './components/matching-readout';

/** Sous-ensemble relu après invalidation pour décider du toast. */
type PersistedPositioningState = PositioningWorkflowDiagnostics & {
  status?: string | null;
};

type ResultsView = 'results' | 'questions' | 'history';

const STEP_DESCRIPTION: Record<PositioningStep, string> = {
  1: 'Analyse du matching',
  2: 'E-mails à relire',
  3: 'CV retravaillé à exporter',
};
export default function PositioningWizardPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const candidateId = params?.id as string;
  const positioningIdParam = params?.positioningId as string;

  const store = usePositioningStore();
  const {
    jobDescription,
    analysis,
    tailoredCv,
    email,
    emailFirstContact,
    emailBulletPoints,
    candidateEmail,
    currentStep,
    pdfBlobUrl,
    isPdfLoading,
    originalPdfBlobUrl,
    setPositioningId,
    setJobDescription,
    setAnalysis,
    setTailoredCv,
    setEmail,
    setEmailFirstContact,
    setEmailBulletPoints,
    setCandidateEmail,
    setCurrentStep,
    setOriginalPdfBlobUrl,
    setPdfBlobUrl,
    pdfPageCount,
    setPdfPageCount,
    setIsPdfLoading,
    reset,
    recruiterAnswerEntries,
    setRecruiterAnswerEntries,
    appendRecruiterAnswer,
    removeRecruiterAnswerEntry,
  } = store;

  const setTemplateConfig = useTemplateStore((s) => s.setTemplateConfig);

  const { data: positioningData } = usePositioning(positioningIdParam);
  const { data: candidateData } = useCandidate(candidateId);

  const isServerAnalyzing = positioningData?.status === 'analyzing';
  const isServerGenerating = positioningData?.status === 'generating';

  const missionRecord = positioningData?.missions as
    | { title?: string | null; company?: string | null; job_analysis?: unknown }
    | null
    | undefined;

  const missionHeadlineForUi =
    positioningData?.mission_id && missionRecord
      ? buildMissionPositionHeadline(missionRecord) ?? 'Mission liée'
      : null;

  const usesStructuredMissionAnalysis = hasUsableJobAnalysisForPositioning(
    missionRecord?.job_analysis ?? null,
  );

  const canRunPositioningAnalysis = useMemo(
    () =>
      jobDescription.trim().length > 0 || usesStructuredMissionAnalysis,
    [jobDescription, usesStructuredMissionAnalysis],
  );

  const mergedPhaseAnswersForCompare = useMemo(() => {
    return mergePositioningAnswersForPersistence({
      baseAnswers: parsePositioningAnswers(positioningData?.answers),
      recruiterAnswerEntries,
    });
  }, [positioningData?.answers, recruiterAnswerEntries]);

  const recruiterDraftsDifferFromSnapshot = useMemo(() => {
    const raw = (positioningData as { analysis_recruiter_answers?: unknown } | undefined)
      ?.analysis_recruiter_answers;
    if (raw == null) return false;
    return analysisPhaseAffinageDiffersFromSnapshotForCurrentQuestions({
      snapshot: parsePositioningAnswers(raw),
      mergedPhaseAnswers: mergedPhaseAnswersForCompare,
      analysis,
    });
  }, [positioningData, mergedPhaseAnswersForCompare, analysis]);

  const analysisSnapshotRecruiterEntries = useMemo(() => {
    const raw = (positioningData as { analysis_recruiter_answers?: unknown } | undefined)
      ?.analysis_recruiter_answers;
    return extractRecruiterEntriesFromParsed(
      analysisPhaseAnswersOnly(parsePositioningAnswers(raw)),
    );
  }, [positioningData]);

  const analysisModelsSnapshot = useMemo(() => {
    const raw = (positioningData as { ai_analysis_models?: unknown } | undefined)?.ai_analysis_models;
    return parsePositioningAnalysisModelsSnapshot(raw) ?? null;
  }, [positioningData]);

  const analysisModelsSummaryLabel = useMemo(
    () => formatPositioningAnalysisModelsLabel(analysisModelsSnapshot ?? undefined),
    [analysisModelsSnapshot],
  );

  const generationModelsSnapshot = useMemo(() => {
    const raw = (positioningData as { ai_generation_models?: unknown } | undefined)?.ai_generation_models;
    return parsePositioningAnalysisModelsSnapshot(raw) ?? null;
  }, [positioningData]);

  const updatePositioning = useUpdatePositioning();
  const deletePositioningMutation = useDeletePositioning();

  const handleRemoveRecruiterAnswerEntry = useCallback(
    (key: string, entryId: string) => {
      removeRecruiterAnswerEntry(key, entryId);
      const raw = (positioningData as { analysis_recruiter_answers?: unknown } | undefined)
        ?.analysis_recruiter_answers;
      const nextSnap = removeEntryFromAnalysisRecruiterSnapshot(raw, key, entryId);
      if (nextSnap !== null && positioningIdParam) {
        updatePositioning.mutate({
          id: positioningIdParam,
          analysis_recruiter_answers: nextSnap,
        });
      }
    },
    [removeRecruiterAnswerEntry, positioningData, positioningIdParam, updatePositioning],
  );
  const exportPositioning = useExportPositioning();
  const cancelWorkflow = useCancelWorkflow();

  const [isLoaded, setIsLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const refreshMissionCards = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.all(orgId ?? '') });
  }, [queryClient, orgId]);

  // Workflow streams
  const {
    object: analysisObject,
    streamMeta: analysisStreamMeta,
    submit: submitAnalysis,
    isLoading: isAnalysisLoading,
    error: analysisError,
    errorStepKey: analysisErrorStepKey,
    stop: stopAnalysis,
    activeRunId: analysisStreamRunId,
  } = useWorkflowStream<PositioningAnalysis, PositioningAnalysisStreamMeta>({
    api: '/api/positioning/analyze',
    runId: positioningData?.workflow_run_id,
    runStatus: positioningData?.status,
    activeStatuses: ['analyzing'],
    onFinish: async () => {
      const oid = orgId ?? '';
      // La fermeture du flux ne prouve rien : on attend l'état réellement persisté.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.positionings.detail(oid, positioningIdParam),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.positionings.analysisHistory(oid, positioningIdParam),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(oid, candidateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });

      const fresh = queryClient.getQueryData<PersistedPositioningState>(
        queryKeys.positionings.detail(oid, positioningIdParam),
      );
      const outcome = resolveWorkflowOutcome({
        status: fresh?.status,
        successStatuses: POSITIONING_ANALYSIS_SUCCESS_STATUSES,
        lastError: fresh?.workflow_last_error ?? null,
      });
      if (outcome.kind === 'success') toast.success('Analyse terminée avec succès');
      else if (outcome.kind === 'error') toast.error(outcome.message, { duration: 8000 });
    },
  });

  const {
    object: generateObject,
    streamMeta: generateStreamMeta,
    submit: submitGenerate,
    isLoading: isGenerateLoading,
    error: generateError,
    errorStepKey: generateErrorStepKey,
    stop: stopGenerate,
    activeRunId: generateStreamRunId,
  } = useWorkflowStream<PositioningOutput, PositioningGenerateStreamMeta>({
    api: '/api/positioning/generate',
    runId: positioningData?.workflow_run_id,
    runStatus: positioningData?.status,
    activeStatuses: ['generating'],
    onFinish: async () => {
      const oid = orgId ?? '';
      await queryClient.invalidateQueries({
        queryKey: queryKeys.positionings.detail(oid, positioningIdParam),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(oid, candidateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });

      const fresh = queryClient.getQueryData<PersistedPositioningState>(
        queryKeys.positionings.detail(oid, positioningIdParam),
      );
      const outcome = resolveWorkflowOutcome({
        status: fresh?.status,
        successStatuses: POSITIONING_GENERATE_SUCCESS_STATUSES,
        lastError: fresh?.workflow_last_error ?? null,
      });
      if (outcome.kind === 'success') toast.success('Génération terminée avec succès');
      else if (outcome.kind === 'error') toast.error(outcome.message, { duration: 8000 });
    },
  });

  const analysisBusy = isServerAnalyzing || isAnalysisLoading;
  const genBusy = isServerGenerating || isGenerateLoading;

  const persistedPositioningWorkflowError =
    (positioningData as PositioningWorkflowDiagnostics | undefined)?.workflow_last_error ?? null;

  useEffect(() => {
    if (!analysisError) return;
    const key = analysisErrorStepKey ?? persistedPositioningWorkflowError?.stepKey;
    const label = key ? getFrenchStepShortLabel('positioningAnalysis', key) : 'Analyse de matching';
    toast.error(`${label} : échec. Réessayez ou contactez le support.`, { duration: 8000 });
  }, [analysisError, analysisErrorStepKey, persistedPositioningWorkflowError?.stepKey]);

  useEffect(() => {
    if (!generateError) return;
    const key = generateErrorStepKey ?? persistedPositioningWorkflowError?.stepKey;
    const gm = generateStreamMeta?.generateMode ?? 'all';
    const label = key ? getFrenchStepShortLabel('positioningGenerate', key, gm) : 'Génération';
    toast.error(`${label} : échec. Réessayez ou contactez le support.`, { duration: 8000 });
  }, [
    generateError,
    generateErrorStepKey,
    persistedPositioningWorkflowError?.stepKey,
    generateStreamMeta?.generateMode,
  ]);

  const analysisWorkflowRows = useMemo(
    () =>
      computePositioningAnalysisStepStates({
        streamMeta: analysisStreamMeta,
        partialData: analysisObject ?? analysis ?? null,
        isStreaming: isAnalysisLoading,
        errorStepKey: analysisErrorStepKey,
        persistedError: persistedPositioningWorkflowError,
        workflowFailed: positioningData?.status === 'error',
        workflowRunActive: isServerAnalyzing,
      }),
    [
      analysisStreamMeta,
      analysisObject,
      analysis,
      isAnalysisLoading,
      analysisErrorStepKey,
      persistedPositioningWorkflowError,
      positioningData?.status,
      isServerAnalyzing,
    ],
  );

  const analysisWorkflowSummary = useMemo(
    () => formatStepSummaryLine('positioningAnalysis', analysisWorkflowRows),
    [analysisWorkflowRows],
  );

  const generatePartialMerged = useMemo(
    () =>
      ({
        tailoredCv: generateObject?.tailoredCv ?? tailoredCv,
        email: generateObject?.email ?? email,
        emailFirstContact: generateObject?.emailFirstContact ?? emailFirstContact,
        emailBulletPoints: generateObject?.emailBulletPoints ?? emailBulletPoints,
        candidateEmail: generateObject?.candidateEmail ?? candidateEmail,
      }) as Partial<PositioningOutput>,
    [
      generateObject,
      tailoredCv,
      email,
      emailFirstContact,
      emailBulletPoints,
      candidateEmail,
    ],
  );

  const generateWorkflowRows = useMemo(
    () =>
      computePositioningGenerateStepStates({
        streamMeta: generateStreamMeta,
        partialData: generatePartialMerged,
        generateMode: generateStreamMeta?.generateMode ?? 'all',
        isStreaming: isGenerateLoading,
        errorStepKey: generateErrorStepKey,
        persistedError: persistedPositioningWorkflowError,
        workflowFailed: positioningData?.status === 'error',
        workflowRunActive: positioningData?.status === 'generating',
      }),
    [
      generateStreamMeta,
      generatePartialMerged,
      isGenerateLoading,
      generateErrorStepKey,
      persistedPositioningWorkflowError,
      positioningData?.status,
    ],
  );

  const generateWorkflowSummary = useMemo(
    () =>
      formatStepSummaryLine(
        'positioningGenerate',
        generateWorkflowRows,
        generateStreamMeta?.generateMode ?? 'all',
      ),
    [generateWorkflowRows, generateStreamMeta?.generateMode],
  );

  const prevPositioningIdRef = useRef(positioningIdParam);
  useEffect(() => {
    if (prevPositioningIdRef.current !== positioningIdParam) {
      prevPositioningIdRef.current = positioningIdParam;
      reset();
    }
  }, [positioningIdParam, reset]);

  // Derive time tracking from server data (no useState + layout effect sync)
  const aiAnalysisDurationMs = positioningData?.ai_analysis_duration_ms ?? null;
  const aiGenerationDurationMs = positioningData?.ai_generation_duration_ms ?? null;
  const userTimeSeconds = positioningData?.user_time_seconds ?? null;

  const debouncedSave = useAutoSave(positioningIdParam);

  /** Gabarit toujours celui par défaut de l’org (pas de choix par candidat). */
  const pdfTemplateId = candidateData?.id !== undefined ? null : undefined;

  usePdfPreview({
    data: tailoredCv,
    setPdfBlobUrl,
    setIsPdfLoading,
    setPdfPageCount,
    templateId: pdfTemplateId,
  });

  useSessionTimer({
    endpoint: `/api/positioning/${positioningIdParam}/time`,
    enabled: isLoaded && !analysisBusy && !genBusy,
  });

  // Track the last positioning id we initialized for
  const initializedForId = useRef<string | null>(null);

  // Load positioning from DB via React Query
  useLayoutEffect(() => {
    if (!positioningData || !candidateData) return;

    const isNewPositioning = initializedForId.current !== positioningData.id;

    if (isNewPositioning) {
      initializedForId.current = positioningData.id;
      setPositioningId(positioningIdParam);
      setTemplateConfig(null);

      fetchTemplateConfig(null).then((config) => {
        setTemplateConfig(config);

        if (candidateData.extracted_data) {
          fetch('/api/pdf-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: candidateData.extracted_data,
              templateId: null,
            }),
          })
            .then((res) => res.blob())
            .then((blob) => {
              const url = URL.createObjectURL(blob);
              setOriginalPdfBlobUrl(url);
            })
            .catch(console.error);
        }
      });
    }

    // Don't reset while we're actively streaming ou relance d'analyse (évite de réinjecter l'ancienne analyse depuis le cache)
    if (isAnalysisLoading || isGenerateLoading || isServerAnalyzing) {
      // useWorkflowStream met isGenerateLoading / isAnalysisLoading à true (POST ou reconnexion) avant que ce bloc ne tourne :
      // sans setIsLoaded, on reste sur l'écran plein « Chargement » au lieu du wizard (blocs step 1 / 2 en loading).
      if (isNewPositioning) {
        setCurrentStep(1);
      }
      setIsLoaded(true);
      return;
    }

    const data = positioningData;

    setJobDescription(data.job_description ?? '');

    // In-progress operations — reconnection is handled by useWorkflowStream
    if (data.status === 'analyzing' || data.status === 'generating') {
      if (isNewPositioning) {
        setCurrentStep(1);
      }
      setIsLoaded(true);
      return;
    }

    if (data.tailored_cv) setTailoredCv(data.tailored_cv);
    if (data.email) setEmail(data.email);
    if (data.email_first_contact) setEmailFirstContact(data.email_first_contact);
    if (data.email_bullet_points) setEmailBulletPoints(data.email_bullet_points);
    if (data.candidate_email) setCandidateEmail(data.candidate_email);

    const parsedAnswers = parsePositioningAnswers(data.answers);
    setRecruiterAnswerEntries(extractRecruiterEntriesFromParsed(parsedAnswers));

    if (data.analysis) {
      const restored = { ...data.analysis };
      if (restored.candidateQuestions) {
        restored.candidateQuestions = restored.candidateQuestions.map(
          (q: { question: string; context: string; answer?: string }) => ({
            ...q,
            answer: '',
          }),
        );
      }
      if (restored.clientQuestions) {
        restored.clientQuestions = restored.clientQuestions.map(
          (q: { question: string; context: string; answer?: string }) => ({
            ...q,
            answer: '',
          }),
        );
      }
      setAnalysis(restored);
    }

    // Étape par défaut : (1) tant que l’utilisateur n’a pas choisi une autre étape (clic indicateur ou « suite »).
    if (isNewPositioning) {
      setCurrentStep(1);
    }

    setIsLoaded(true);
  // Dépendances ciblées : inclure isAnalyzing / statut analyzing pour ne pas réécraser l’état pendant un « Relancer ».
  // eslint-disable-next-line react-hooks/exhaustive-deps -- éviter de dépendre de tout `positioningData` / `candidateData` (risque de resets)
  }, [
    positioningData?.id,
    positioningData?.status,
    positioningData?.analysis,
    positioningData?.job_description,
    positioningData?.tailored_cv,
    positioningData?.email,
    positioningData?.email_first_contact,
    positioningData?.email_bullet_points,
    positioningData?.candidate_email,
    positioningData?.answers,
    candidateData?.id,
    isAnalysisLoading,
    isGenerateLoading,
    isServerAnalyzing,
    setPositioningId,
    setTemplateConfig,
    setJobDescription,
    setCurrentStep,
    setAnalysis,
    setTailoredCv,
    setEmail,
    setEmailFirstContact,
    setEmailBulletPoints,
    setCandidateEmail,
    setRecruiterAnswerEntries,
    setIsLoaded,
    positioningIdParam,
    candidateData?.extracted_data,
  ]);

  // Analyse : démarrage côté API à la création du positionnement ; ici uniquement reconnexion (useWorkflowStream)
  // ou relance manuelle (handleReAnalyze). Pas de submitAnalysis depuis un effet de montage.

  // Sync streaming analysis to store
  useLayoutEffect(() => {
    if (analysisObject) {
      setAnalysis(analysisObject as Partial<PositioningAnalysis>);
    }
  }, [analysisObject, setAnalysis]);

  // Sync streaming generation to store
  useLayoutEffect(() => {
    if (generateObject) {
      const obj = generateObject as Partial<PositioningOutput>;
      if (obj.tailoredCv) setTailoredCv(obj.tailoredCv as Partial<ExtractedCV>);
      if (obj.email) setEmail(obj.email);
      if (obj.emailFirstContact) setEmailFirstContact(obj.emailFirstContact);
      if (obj.emailBulletPoints) setEmailBulletPoints(obj.emailBulletPoints);
      if (obj.candidateEmail) setCandidateEmail(obj.candidateEmail);
    }
  }, [
    generateObject,
    setTailoredCv,
    setEmail,
    setEmailFirstContact,
    setEmailBulletPoints,
    setCandidateEmail,
  ]);

  // Persist answers (affinage analyse) — ne pas mélanger avec l’édition du CV
  useLayoutEffect(() => {
    if (!isLoaded) return;
    const answers = mergePositioningAnswersForPersistence({
      baseAnswers: parsePositioningAnswers(positioningData?.answers),
      recruiterAnswerEntries,
    });
    debouncedSave({ answers });
  }, [isLoaded, recruiterAnswerEntries, positioningData?.answers, debouncedSave]);

  // Brouillon : persister la fiche (collage / import fichier) avant analyse ou refresh
  useLayoutEffect(() => {
    if (!isLoaded) return;
    if (positioningData?.status !== 'draft') return;
    if (analysisBusy || genBusy) return;
    debouncedSave({ job_description: jobDescription });
  }, [
    isLoaded,
    jobDescription,
    positioningData?.status,
    analysisBusy,
    genBusy,
    debouncedSave,
  ]);

  // Persist tailoredCv edits to DB (debounced)
  useLayoutEffect(() => {
    if (!isLoaded || !tailoredCv || genBusy) return;
    debouncedSave({ tailored_cv: tailoredCv });
  }, [isLoaded, tailoredCv, genBusy, debouncedSave]);

  // Persist email edits to DB (debounced)
  useLayoutEffect(() => {
    if (!isLoaded || !email || genBusy) return;
    debouncedSave({ email });
  }, [isLoaded, email, genBusy, debouncedSave]);

  // Persist emailFirstContact edits to DB (debounced)
  useLayoutEffect(() => {
    if (!isLoaded || !emailFirstContact || genBusy) return;
    debouncedSave({ email_first_contact: emailFirstContact });
  }, [isLoaded, emailFirstContact, genBusy, debouncedSave]);

  // Persist emailBulletPoints edits to DB (debounced)
  useLayoutEffect(() => {
    if (!isLoaded || !emailBulletPoints || genBusy) return;
    debouncedSave({ email_bullet_points: emailBulletPoints });
  }, [isLoaded, emailBulletPoints, genBusy, debouncedSave]);

  // Persist candidate email edits to DB (debounced)
  useLayoutEffect(() => {
    if (!isLoaded || !candidateEmail || genBusy) return;
    debouncedSave({ candidate_email: candidateEmail });
  }, [isLoaded, candidateEmail, genBusy, debouncedSave]);

  // Reset store on unmount
  useLayoutEffect(() => {
    return () => reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReAnalyze = useCallback(() => {
    if (!canRunPositioningAnalysis) return;

    const st = usePositioningStore.getState();
    const mergedAnswers = mergePositioningAnswersForPersistence({
      baseAnswers: parsePositioningAnswers(positioningData?.answers),
      recruiterAnswerEntries: st.recruiterAnswerEntries,
    });

    updatePositioning.mutate(
      {
        id: positioningIdParam,
        job_description: jobDescription,
        analysis: null,
        archiveAnalysisBeforeClear: true,
        answers: mergedAnswers,
      },
      {
        onSuccess: () => {
          setCurrentStep(1);
          setAnalysis(null);
          submitAnalysis({ positioningId: positioningIdParam, answers: mergedAnswers });
          refreshMissionCards();
        },
      }
    );
  }, [
    canRunPositioningAnalysis,
    jobDescription,
    positioningData?.answers,
    positioningIdParam,
    updatePositioning,
    setCurrentStep,
    setAnalysis,
    submitAnalysis,
    refreshMissionCards,
  ]);

  const handleGenerateCv = useCallback(() => {
    if (!positioningIdParam || !analysis) return;
    if (genBusy) return;
    if (positioningData?.status === 'generating') return;
    if (updatePositioning.isPending) return;

    const st = usePositioningStore.getState();
    const answers = mergePositioningAnswersForPersistence({
      baseAnswers: parsePositioningAnswers(positioningData?.answers),
      recruiterAnswerEntries: st.recruiterAnswerEntries,
    });

    updatePositioning.mutate(
      { id: positioningIdParam, answers },
      {
        onSuccess: () => {
          setTailoredCv(null);
          submitGenerate({ positioningId: positioningIdParam, answers, generateMode: 'cv' });
          refreshMissionCards();
        },
      }
    );
  }, [
    positioningIdParam,
    analysis,
    positioningData?.answers,
    updatePositioning,
    setTailoredCv,
    submitGenerate,
    refreshMissionCards,
    genBusy,
    positioningData?.status,
  ]);

  const handleGenerateEmails = useCallback(() => {
    if (!positioningIdParam || !analysis) return;
    if (genBusy) return;
    if (positioningData?.status === 'generating') return;
    if (updatePositioning.isPending) return;

    const st = usePositioningStore.getState();
    const answers = mergePositioningAnswersForPersistence({
      baseAnswers: parsePositioningAnswers(positioningData?.answers),
      recruiterAnswerEntries: st.recruiterAnswerEntries,
    });

    updatePositioning.mutate(
      { id: positioningIdParam, answers },
      {
        onSuccess: () => {
          setEmail(null);
          setEmailFirstContact(null);
          setEmailBulletPoints(null);
          setCandidateEmail(null);
          submitGenerate({ positioningId: positioningIdParam, answers, generateMode: 'emails' });
          refreshMissionCards();
        },
      }
    );
  }, [
    positioningIdParam,
    analysis,
    positioningData?.answers,
    updatePositioning,
    setEmail,
    setEmailFirstContact,
    setEmailBulletPoints,
    setCandidateEmail,
    submitGenerate,
    refreshMissionCards,
    genBusy,
    positioningData?.status,
  ]);

  const candidateDisplayName = useMemo(() => {
    const pi = (candidateData?.extracted_data as ExtractedCV | null | undefined)?.personalInfo;
    if (!pi) return null;
    const name = [pi.firstName, pi.lastName].filter(Boolean).join(' ').trim();
    return name || null;
  }, [candidateData?.extracted_data]);

  const handleExport = useCallback(() => {
    if (!positioningIdParam || !tailoredCv) return;
    exportPositioning.mutate({ id: positioningIdParam, tailoredCv, email, candidateEmail }, {
      onSuccess: (data) => {
        if (data.fileUrl) {
          const a = document.createElement('a');
          a.href = data.fileUrl;
          a.download = buildCvPdfFilename(candidateDisplayName ?? undefined);
          a.target = '_blank';
          a.click();
        }
      },
    });
  }, [positioningIdParam, tailoredCv, email, candidateEmail, exportPositioning, candidateDisplayName]);

  const positioningCancelRunId =
    positioningData?.workflow_run_id ??
    (genBusy ? generateStreamRunId : analysisStreamRunId) ??
    null;

  const handleCancelWorkflow = useCallback(() => {
    const runId = positioningCancelRunId;
    if (!runId) return;
    const isAnalyzingNow = analysisBusy;
    if (isAnalyzingNow) {
      stopAnalysis();
    } else {
      stopGenerate();
    }
    cancelWorkflow.mutate({
      runId,
      table: 'positionings',
      recordId: positioningIdParam,
      resetStatus: isAnalyzingNow ? 'draft' : 'analyzed',
    });
  }, [
    positioningCancelRunId,
    positioningIdParam,
    analysisBusy,
    stopAnalysis,
    stopGenerate,
    cancelWorkflow,
  ]);

  const positioningMissionId =
    (positioningData as { mission_id?: string | null } | undefined)?.mission_id ?? undefined;

  const handleDeletePositioning = useCallback(() => {
    if (analysisBusy) stopAnalysis();
    if (genBusy) stopGenerate();
    deletePositioningMutation.mutate(
      {
        id: positioningIdParam,
        candidateId,
        missionId: positioningMissionId ?? undefined,
      },
      {
        onSuccess: () => {
          reset();
          toast.success('Positionnement supprimé');
          router.push(`/review/${candidateId}`);
        },
        onError: () => {
          toast.error('Impossible de supprimer le positionnement');
        },
      },
    );
  }, [
    analysisBusy,
    genBusy,
    stopAnalysis,
    stopGenerate,
    deletePositioningMutation,
    positioningIdParam,
    candidateId,
    positioningMissionId,
    reset,
    router,
  ]);

  // Navigation
  const isStreaming = analysisBusy || genBusy;
  const analysisComplete = !!analysis?.matchScore && !analysisBusy;

  /** Relance échouée : analyse vidée + statut `error` — sans cet état, retour muet au formulaire. */
  const analysisFailure = resolvePositioningAnalysisFailure({
    status: positioningData?.status,
    busy: analysisBusy,
    hasCompleteAnalysis: analysisComplete,
    lastError: persistedPositioningWorkflowError,
  });


  const [resultsView, setResultsView] = useState<ResultsView>('results');
  const [isImportingFile, setIsImportingFile] = useState(false);

  const hasEmails = !!email || !!emailFirstContact || !!emailBulletPoints || !!candidateEmail;
  const generationFailed =
    positioningData?.status === 'error' && !analysisFailure && !!persistedPositioningWorkflowError;

  const stepDisabledReason = useCallback(
    (step: PositioningStep): string | null => {
      if (isStreaming) {
        return analysisBusy ? 'Une analyse est en cours.' : 'Une génération est en cours.';
      }
      if (step === 1) return null;
      return analysisComplete ? null : 'Terminez d’abord l’analyse du matching.';
    },
    [isStreaming, analysisBusy, analysisComplete],
  );

  const goToStep = useCallback(
    (step: PositioningStep) => {
      if (stepDisabledReason(step)) return;
      setCurrentStep(step);
    },
    [stepDisabledReason, setCurrentStep],
  );

  /** La primaire de l'en-tête : une seule, qui change avec l'étape et l'avancement. */
  const primaryAction = useMemo((): {
    label: string;
    onClick: () => void;
    disabledReason: string | null;
    pending?: boolean;
  } => {
    if (analysisBusy) {
      return { label: 'Analyser le matching', onClick: () => {}, disabledReason: 'Une analyse est déjà en cours.' };
    }
    if (genBusy) {
      return { label: 'Générer', onClick: () => {}, disabledReason: 'Une génération est déjà en cours.' };
    }
    if (currentStep === 1) {
      if (analysisComplete) {
        return { label: 'Rédiger les e-mails', onClick: () => setCurrentStep(2), disabledReason: null };
      }
      return {
        label: positioningData?.status === 'error' ? 'Relancer l’analyse' : 'Analyser le matching',
        onClick: handleReAnalyze,
        disabledReason: !canRunPositioningAnalysis
          ? 'Saisissez ou importez une fiche de poste.'
          : isImportingFile
            ? 'Import du fichier en cours.'
            : updatePositioning.isPending
              ? 'Enregistrement en cours.'
              : null,
        pending: updatePositioning.isPending,
      };
    }
    if (currentStep === 2) {
      if (hasEmails) {
        return { label: 'Retravailler le CV', onClick: () => setCurrentStep(3), disabledReason: null };
      }
      return {
        label: 'Générer les e-mails',
        onClick: handleGenerateEmails,
        disabledReason: updatePositioning.isPending ? 'Enregistrement en cours.' : null,
        pending: updatePositioning.isPending,
      };
    }
    if (tailoredCv) {
      return {
        label: 'Exporter le PDF',
        onClick: handleExport,
        disabledReason: exportPositioning.isPending ? 'Export en cours.' : null,
        pending: exportPositioning.isPending,
      };
    }
    return {
      label: 'Générer le CV',
      onClick: handleGenerateCv,
      disabledReason: updatePositioning.isPending ? 'Enregistrement en cours.' : null,
      pending: updatePositioning.isPending,
    };
  }, [
    analysisBusy,
    genBusy,
    currentStep,
    analysisComplete,
    positioningData?.status,
    handleReAnalyze,
    canRunPositioningAnalysis,
    isImportingFile,
    updatePositioning.isPending,
    hasEmails,
    handleGenerateEmails,
    tailoredCv,
    handleExport,
    exportPositioning.isPending,
    handleGenerateCv,
    setCurrentStep,
  ]);

  const scoreMeta = useMemo(() => {
    if (!analysisComplete || analysis?.matchScore == null) return null;
    const parts = [`${analysis.matchScore} / 100`];
    if (analysis.matchScoreConfidence) {
      parts.push(`fiabilité ${matchScoreConfidenceShortLabel(analysis.matchScoreConfidence).toLowerCase()}`);
    }
    const { strong, total } = countStrongSkills(analysis.skillMatches ?? []);
    if (total > 0) {
      parts.push(`${strong} compétence${strong > 1 ? 's' : ''} forte${strong > 1 ? 's' : ''} sur ${total}`);
    }
    return parts.join(' · ');
  }, [analysisComplete, analysis]);

  const totalDurationMs =
    (aiAnalysisDurationMs ?? 0) + (aiGenerationDurationMs ?? 0) + (userTimeSeconds ?? 0) * 1000;

  const pageTitle = candidateDisplayName
    ? missionHeadlineForUi
      ? `${candidateDisplayName} × ${missionHeadlineForUi}`
      : candidateDisplayName
    : missionHeadlineForUi ?? 'Positionnement';

  const downloadFilename = buildCvPdfFilename(candidateDisplayName ?? undefined);

  const handleDownloadTailoredPdf = useCallback(() => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = downloadFilename;
    a.click();
  }, [pdfBlobUrl, downloadFilename]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-full flex-col gap-6 bg-background px-4 py-5 text-foreground md:px-6" aria-busy="true">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-1/3 animate-none" />
          <Skeleton className="h-4 w-1/4 animate-none" />
        </div>
        <Skeleton className="h-10 w-full max-w-md animate-none" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-3 lg:col-span-7">
            <Skeleton className="h-4 w-1/4 animate-none" />
            <Skeleton className="h-3 w-full animate-none" />
            <Skeleton className="h-3 w-5/6 animate-none" />
          </div>
          <Skeleton className="h-40 w-full animate-none rounded-xl lg:col-span-5" />
        </div>
      </div>
    );
  }

  const primaryDisabled = !!primaryAction.disabledReason;
  const primaryButton = (
    <Button type="button" onClick={primaryAction.onClick} disabled={primaryDisabled}>
      {primaryAction.pending ? <Spinner data-icon="inline-start" /> : null}
      {primaryAction.label}
    </Button>
  );

  const headerStatus = analysisBusy ? (
    <div className="border-l-2 border-primary pl-4">
      <WorkflowStepList rows={analysisWorkflowRows} summaryLine={analysisWorkflowSummary} />
    </div>
  ) : analysisFailure ? (
    <WorkflowFailureAlert
      title="L’analyse n’a pas abouti"
      message={analysisFailure.message}
      rows={analysisWorkflowRows}
      summaryLine={analysisWorkflowSummary}
      onRetry={handleReAnalyze}
      retryLabel="Relancer l’analyse"
      retryDisabled={!canRunPositioningAnalysis || updatePositioning.isPending}
    />
  ) : genBusy ? (
    <div className="border-l-2 border-primary pl-4">
      <WorkflowStepList rows={generateWorkflowRows} summaryLine={generateWorkflowSummary} />
    </div>
  ) : generationFailed ? (
    <WorkflowFailureAlert
      title="La génération n’a pas abouti"
      message={persistedPositioningWorkflowError?.message ?? 'La génération a échoué.'}
      rows={generateWorkflowRows}
      summaryLine={generateWorkflowSummary}
      onRetry={generateStreamMeta?.generateMode === 'cv' ? handleGenerateCv : handleGenerateEmails}
      retryLabel="Relancer la génération"
      retryDisabled={updatePositioning.isPending}
    />
  ) : null;

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <div className="flex flex-col gap-6 px-4 py-5 md:px-6">
        <PageHeader
          title={pageTitle}
          description={STEP_DESCRIPTION[currentStep]}
          meta={
            <>
              {scoreMeta ? <span>{scoreMeta}</span> : null}
              {totalDurationMs > 0 ? (
                <>
                  {scoreMeta ? <span aria-hidden> · </span> : null}
                  <Tooltip>
                    <TooltipTrigger
                      render={<span className="cursor-help underline decoration-dotted underline-offset-4" tabIndex={0} />}
                    >
                      {formatDuration(totalDurationMs)}
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span className="flex flex-col gap-0.5 font-mono tabular-nums">
                        {aiAnalysisDurationMs != null && aiAnalysisDurationMs > 0 ? (
                          <span>Analyse IA {formatDuration(aiAnalysisDurationMs)}</span>
                        ) : null}
                        {aiGenerationDurationMs != null && aiGenerationDurationMs > 0 ? (
                          <span>Génération IA {formatDuration(aiGenerationDurationMs)}</span>
                        ) : null}
                        {userTimeSeconds != null && userTimeSeconds > 0 ? (
                          <span>Édition {formatSeconds(userTimeSeconds)}</span>
                        ) : null}
                      </span>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : null}
              {scoreMeta || totalDurationMs > 0 ? <span aria-hidden> · </span> : null}
              <Link href={`/review/${candidateId}`} className="underline-offset-4 hover:text-foreground hover:underline">
                Ouvrir le CV
              </Link>
              {positioningData?.mission_id ? (
                <>
                  <span aria-hidden> · </span>
                  <Link
                    href={`/positions/${positioningData.mission_id}`}
                    className="underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Fiche mission
                  </Link>
                </>
              ) : null}
              <span aria-hidden> · </span>
              <span>Enregistrement automatique</span>
            </>
          }
          actions={
            <>
              {isStreaming && positioningCancelRunId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancelWorkflow}
                  disabled={cancelWorkflow.isPending}
                >
                  {cancelWorkflow.isPending ? <Spinner data-icon="inline-start" /> : null}
                  Annuler
                </Button>
              ) : null}
              {primaryDisabled ? (
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>
                    {primaryButton}
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{primaryAction.disabledReason}</TooltipContent>
                </Tooltip>
              ) : (
                primaryButton
              )}
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
                            disabled={deletePositioningMutation.isPending}
                            aria-label="Supprimer ce positionnement"
                            className="text-muted-foreground hover:text-destructive"
                          >
                            {deletePositioningMutation.isPending ? <Spinner /> : <Trash2 />}
                          </Button>
                        }
                      />
                    }
                  />
                  <TooltipContent side="bottom">Supprimer ce positionnement</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer ce positionnement ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Le dossier de positionnement sera définitivement supprimé ; le CV
                      candidat reste dans la bibliothèque.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeletePositioning}
                    >
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          }
          status={headerStatus}
        />

        <PositioningStepper current={currentStep} onSelect={goToStep} disabledReason={stepDisabledReason} />

        {currentStep === 1 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="min-w-0 space-y-8 lg:col-span-7">
              <JobInput
                jobDescription={jobDescription}
                onJobDescriptionChange={setJobDescription}
                isAnalyzing={analysisBusy}
                readOnly={analysisBusy || analysisComplete}
                missionHeadline={missionHeadlineForUi}
                usesStructuredMissionAnalysis={usesStructuredMissionAnalysis}
                onImportingChange={setIsImportingFile}
              />

              {/* Analysis results during streaming — no sub-views yet */}
              {analysisBusy && (
                <section aria-labelledby="results-heading" className="space-y-6">
                  <h2 id="results-heading" className="border-b border-border pb-2 text-[0.9375rem] font-semibold text-foreground">
                    Résultats
                  </h2>
                  <AnalysisView
                    analysis={analysis}
                    isAnalyzing={analysisBusy}
                    streamMeta={analysisStreamMeta}
                    analysisSnapshotRecruiterEntries={analysisSnapshotRecruiterEntries}
                    hideRecruiterSnapshot
                    recruiterDraftsDifferFromSnapshot={recruiterDraftsDifferFromSnapshot}
                    modelsSummaryLabel={analysisModelsSummaryLabel}
                    modelsByTask={analysisModelsSnapshot?.byTask}
                    aiInfoHistoryHref={`/review/${candidateId}/positioning/${positioningIdParam}`}
                    aiInfoHistoryLinkLabel="Positionnement et historique"
                  />
                </section>
              )}

              {/* Résultats · Questions · Historique — once analysis complete */}
              {analysisComplete && (
                <section aria-labelledby="results-heading" className="space-y-6">
                  <h2 id="results-heading" className="border-b border-border pb-2 text-[0.9375rem] font-semibold text-foreground">
                    Résultats
                  </h2>
                  <Tabs
                    value={resultsView}
                    onValueChange={(v) => setResultsView(v as ResultsView)}
                    className="gap-6"
                  >
                    <TabsList variant="line" aria-label="Vue des résultats">
                      <TabsTrigger value="results" className="flex-none px-1">
                        Résultats
                      </TabsTrigger>
                      <TabsTrigger value="questions" className="flex-none px-1">
                        Questions
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex-none px-1">
                        Historique
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="results" className="mt-0 data-[state=inactive]:hidden">
                      <AnalysisView
                        analysis={analysis}
                        isAnalyzing={false}
                        onReAnalyze={handleReAnalyze}
                        reAnalyzeDisabled={!canRunPositioningAnalysis || updatePositioning.isPending}
                        analysisSnapshotRecruiterEntries={analysisSnapshotRecruiterEntries}
                        onRemoveRecruiterAnswerEntry={handleRemoveRecruiterAnswerEntry}
                        recruiterDraftsDifferFromSnapshot={recruiterDraftsDifferFromSnapshot}
                        modelsSummaryLabel={analysisModelsSummaryLabel}
                        modelsByTask={analysisModelsSnapshot?.byTask}
                        aiInfoHistoryHref={`/review/${candidateId}/positioning/${positioningIdParam}`}
                        aiInfoHistoryLinkLabel="Positionnement et historique"
                      />
                    </TabsContent>
                    <TabsContent value="questions" className="mt-0 data-[state=inactive]:hidden">
                      <QuestionsPanel
                        analysis={analysis}
                        onReAnalyze={handleReAnalyze}
                        isAnalyzing={false}
                        recruiterAnswerEntries={recruiterAnswerEntries}
                        appendRecruiterAnswer={appendRecruiterAnswer}
                      />
                    </TabsContent>
                    <TabsContent value="history" className="mt-0 data-[state=inactive]:hidden">
                      {positioningIdParam ? (
                        <PositioningAnalysisHistoryTabContent
                          positioningId={positioningIdParam}
                          candidateId={candidateId}
                        />
                      ) : null}
                    </TabsContent>
                  </Tabs>
                </section>
              )}
            </div>

            {/* Collant sous le py-5 de la page : le défilement est celui du main de la coque. */}
            <div className="min-w-0 lg:sticky lg:top-5 lg:col-span-5 lg:max-h-[calc(100svh-6.5rem)] lg:self-start lg:overflow-y-auto">
              <MatchingReadout analysis={analysis} isAnalyzing={analysisBusy} />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <EmailsGenerationStep
            isStreaming={genBusy}
            streamMeta={generateStreamMeta}
            onGenerateEmails={handleGenerateEmails}
            positioningStatus={positioningData?.status}
            generationModelsByTask={generationModelsSnapshot?.byTask}
          />
        )}

        {currentStep === 3 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="min-w-0 lg:col-span-7">
              <CvGenerationStep
                isStreaming={genBusy}
                streamMeta={generateStreamMeta}
                onGenerateCv={handleGenerateCv}
                onCompare={() => setFullscreen(true)}
                compareDisabled={!pdfBlobUrl}
                positioningStatus={positioningData?.status}
                generationModelsByTask={generationModelsSnapshot?.byTask}
              />
            </div>
            <div className="min-w-0 lg:sticky lg:top-5 lg:col-span-5 lg:max-h-[calc(100svh-6.5rem)] lg:self-start lg:overflow-y-auto">
              <PdfPreview
                pdfBlobUrl={pdfBlobUrl}
                isPdfLoading={isPdfLoading}
                pdfPageCount={pdfPageCount}
                downloadFilename={downloadFilename}
                title="Aperçu du CV retravaillé"
                emptyLabel="Le CV retravaillé apparaîtra ici"
              />
            </div>
          </div>
        )}
      </div>

      {/* Comparaison CV extrait / CV retravaillé */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className="flex h-[92vh] flex-col gap-0 border border-border bg-background p-0 sm:max-w-[95vw]"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <DialogTitle className="text-sm font-semibold text-foreground">
              Comparaison des CV
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTailoredPdf}
                disabled={!pdfBlobUrl}
              >
                Télécharger
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setFullscreen(false)}>
                Fermer
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 gap-px bg-border">
            {/* Original CV */}
            <div className="flex min-w-0 flex-1 flex-col bg-background">
              <p className="border-b border-border px-4 py-2 text-xs font-medium text-muted-foreground">
                CV extrait
              </p>
              <div className="relative flex-1">
                {originalPdfBlobUrl ? (
                  <iframe
                    src={pdfEmbedSrc(originalPdfBlobUrl)}
                    className="h-full w-full bg-background"
                    title="CV extrait"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground" aria-busy="true">
                    <Spinner className="size-6" />
                    <p className="text-sm">Préparation du CV extrait…</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tailored CV */}
            <div className="flex min-w-0 flex-1 flex-col bg-background">
              <p className="border-b border-border px-4 py-2 text-xs font-medium text-foreground">
                CV retravaillé
              </p>
              <div className="relative flex-1">
                {isPdfLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70" aria-busy="true">
                    <Spinner className="size-6 text-primary" />
                  </div>
                )}
                {pdfBlobUrl ? (
                  <iframe
                    src={pdfEmbedSrc(pdfBlobUrl)}
                    className="h-full w-full bg-background"
                    title="CV retravaillé"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <p className="text-sm">Le CV retravaillé apparaîtra ici</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
