'use client';

import { useLayoutEffect, useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { ExtractedCV, PositioningAnalysis, PositioningOutput } from '@/lib/schema';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import type { PositioningGenerateStreamMeta } from '@/lib/types/positioning-generate-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { useTemplateStore, fetchTemplateConfig } from '@/lib/stores/template.store';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import { usePositioning, useCandidate, useUpdatePositioning, useExportPositioning, useCancelWorkflow } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/keys';
import { formatDuration, formatSeconds } from '@/lib/utils/format';
import {
  matchScoreConfidenceBadgeClass,
  matchScoreConfidenceShortLabel,
} from '@/lib/utils/match-score-confidence';
import { pdfEmbedSrc } from '@/lib/utils/pdf-embed';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Loader2, Target, FileText, TrendingUp, AlertTriangle, CheckCircle2, Maximize2, FileInput, Clock, Cpu, Pencil, Square, GitCompare } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import dynamic from 'next/dynamic';
import { JobInput } from './components/JobInput';
import { AnalysisView } from './components/AnalysisView';
import { QuestionsPanel } from './components/QuestionsPanel';
import { EmailsGenerationStep } from './components/EmailsGenerationStep';
import { CvGenerationStep } from './components/CvGenerationStep';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AnalysisCharts = dynamic(
  () => import('./components/AnalysisCharts').then((m) => m.AnalysisCharts),
  { loading: () => <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet" /></div> },
);

export default function PositioningWizardPage() {
  const params = useParams();
  const queryClient = useQueryClient();
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

  const updatePositioning = useUpdatePositioning();

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
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.all });
  }, [queryClient]);

  // Workflow streams
  const {
    object: analysisObject,
    streamMeta: analysisStreamMeta,
    submit: submitAnalysis,
    isLoading: isAnalysisLoading,
    error: analysisError,
    stop: stopAnalysis,
    activeRunId: analysisStreamRunId,
  } = useWorkflowStream<PositioningAnalysis, PositioningAnalysisStreamMeta>({
    api: '/api/positioning/analyze',
    runId: positioningData?.workflow_run_id,
    runStatus: positioningData?.status,
    activeStatuses: ['analyzing'],
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(positioningIdParam) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(candidateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Analyse terminee avec succes');
    },
  });

  const {
    object: generateObject,
    streamMeta: generateStreamMeta,
    submit: submitGenerate,
    isLoading: isGenerateLoading,
    error: generateError,
    stop: stopGenerate,
    activeRunId: generateStreamRunId,
  } = useWorkflowStream<PositioningOutput, PositioningGenerateStreamMeta>({
    api: '/api/positioning/generate',
    runId: positioningData?.workflow_run_id,
    runStatus: positioningData?.status,
    activeStatuses: ['generating'],
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(positioningIdParam) });
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(candidateId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Generation terminee avec succes');
    },
  });

  const analysisBusy = isServerAnalyzing || isAnalysisLoading;
  const genBusy = isServerGenerating || isGenerateLoading;

  useEffect(() => {
    if (analysisError) {
      toast.error('Analyse echouee. Reessayez ou contactez le support.', { duration: 8000 });
    }
  }, [analysisError]);

  useEffect(() => {
    if (generateError) {
      toast.error('Generation echouee. Reessayez ou contactez le support.', { duration: 8000 });
    }
  }, [generateError]);

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

  const pdfTemplateId =
    candidateData?.id !== undefined ? (candidateData.template_id ?? null) : undefined;

  usePdfPreview({
    data: tailoredCv,
    setPdfBlobUrl,
    setIsPdfLoading,
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

      const templateId = positioningData.candidates?.template_id;
      fetchTemplateConfig(templateId).then((config) => {
        setTemplateConfig(config);

        if (candidateData.extracted_data) {
          fetch('/api/pdf-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: candidateData.extracted_data,
              templateId: templateId ?? null,
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
    candidateData?.template_id,
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

  const handleExport = useCallback(() => {
    if (!positioningIdParam || !tailoredCv) return;
    exportPositioning.mutate({ id: positioningIdParam, tailoredCv, email, candidateEmail }, {
      onSuccess: (data) => {
        if (data.fileUrl) {
          const a = document.createElement('a');
          a.href = data.fileUrl;
          a.download = 'ESNEO_CV_positioning.pdf';
          a.target = '_blank';
          a.click();
        }
      },
    });
  }, [positioningIdParam, tailoredCv, email, candidateEmail, exportPositioning]);

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

  // Navigation
  const isStreaming = analysisBusy || genBusy;
  const analysisComplete = !!analysis?.matchScore && !analysisBusy;

  const canGoToStep = (step: 1 | 2 | 3) => {
    if (isStreaming) return false;
    if (step === 1) return true;
    if (step === 2 || step === 3) return analysisComplete;
    return false;
  };

  const candidateDisplayName = useMemo(() => {
    const pi = (candidateData?.extracted_data as ExtractedCV | null | undefined)?.personalInfo;
    if (!pi) return null;
    const name = [pi.firstName, pi.lastName].filter(Boolean).join(' ').trim();
    return name || null;
  }, [candidateData?.extracted_data]);

  /** Ligne sous le nom : intitulé CV, ou extrait du résumé. */
  const candidateDescriptionLine = useMemo(() => {
    const ex = candidateData?.extracted_data as ExtractedCV | null | undefined;
    const title = ex?.personalInfo?.title?.trim();
    if (title) return title;
    const summary = ex?.summary?.trim();
    if (!summary) return null;
    const oneLine = summary.replace(/\s+/g, ' ');
    return oneLine.length > 140 ? `${oneLine.slice(0, 137)}…` : oneLine;
  }, [candidateData?.extracted_data]);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-full bg-background text-foreground">
        <Loader2 className="animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col min-h-0 px-4 py-4 md:px-6">
        {/* Top bar */}
        <div className="rounded-2xl glass-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet/20 text-violet neon-ring">
                <Target className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Target className="h-3 w-3 text-violet" />
                  Positionnement
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold title-gradient">
                    Positionnement sur offre
                  </h1>
                  {(aiAnalysisDurationMs || aiGenerationDurationMs || userTimeSeconds) ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-overlay/6 px-2 py-0.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs font-medium tabular-nums text-muted-foreground">
                            {formatDuration(
                              (aiAnalysisDurationMs ?? 0) +
                              (aiGenerationDurationMs ?? 0) +
                              (userTimeSeconds ?? 0) * 1000
                            )}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <div className="space-y-1">
                          {aiAnalysisDurationMs != null && aiAnalysisDurationMs > 0 && (
                            <p className="flex items-center gap-1.5">
                              <Cpu className="h-3 w-3 text-violet" />
                              Analyse IA : <span className="font-semibold">{formatDuration(aiAnalysisDurationMs)}</span>
                            </p>
                          )}
                          {aiGenerationDurationMs != null && aiGenerationDurationMs > 0 && (
                            <p className="flex items-center gap-1.5">
                              <Cpu className="h-3 w-3 text-accent" />
                              Génération IA : <span className="font-semibold">{formatDuration(aiGenerationDurationMs)}</span>
                            </p>
                          )}
                          {userTimeSeconds != null && userTimeSeconds > 0 && (
                            <p className="flex items-center gap-1.5">
                              <Pencil className="h-3 w-3 text-amber-400" />
                              Edition : <span className="font-semibold">{formatSeconds(userTimeSeconds)}</span>
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Streaming indicator + cancel */}
              {isStreaming && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-violet/20 bg-violet/10 px-3 py-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet" />
                    <span className="text-xs font-medium text-violet">
                      {analysisBusy ? 'Analyse en cours...' : 'Génération en cours...'}
                    </span>
                  </div>
                  {positioningCancelRunId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelWorkflow}
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
                </>
              )}
            </div>
            {/* Key metrics — score + fiabilité, compétences + lacunes */}
            {analysis?.matchScore != null && !analysisBusy && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-overlay/6 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      className={`h-4 w-4 shrink-0 ${analysis.matchScore >= 70 ? 'text-neon' : analysis.matchScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}
                    />
                    <span
                      className={`text-lg font-bold tabular-nums ${analysis.matchScore >= 70 ? 'text-neon' : analysis.matchScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'}`}
                    >
                      {analysis.matchScore}%
                    </span>
                    <span className="hidden sm:inline text-xs text-muted-foreground">Score</span>
                  </div>
                  <span className="hidden sm:inline h-4 w-px bg-border" aria-hidden />
                  <Tooltip>
                    <TooltipTrigger
                      className={`flex cursor-help items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium outline-none ${matchScoreConfidenceBadgeClass(analysis.matchScoreConfidence)}`}
                    >
                      <span className="text-muted-foreground">Fiabilité</span>
                      <span>{matchScoreConfidenceShortLabel(analysis.matchScoreConfidence)}</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      {analysis.matchScoreConfidenceNote?.trim()
                        ? analysis.matchScoreConfidenceNote
                        : analysis.matchScoreConfidence
                          ? 'Indicateur produit par la synthèse d’analyse pour contextualiser le score.'
                          : 'Analyse antérieure : la fiabilité du score n’était pas encore calculée. Relancez l’analyse pour l’obtenir.'}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-overlay/6 px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-neon" />
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {(analysis.skillMatches?.filter((s) => s.relevance === 'strong').length ?? 0)}/
                      {analysis.skillMatches?.length ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">fortes</span>
                  </div>
                  <span className="hidden sm:inline text-xs text-muted-foreground">·</span>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle
                      className={`h-4 w-4 shrink-0 ${(analysis.gaps?.length ?? 0) > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
                    />
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {analysis.gaps?.length ?? 0}
                    </span>
                    <span className="text-xs text-muted-foreground">lacune{(analysis.gaps?.length ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CV | matching | fiche — cartes cliquables */}
          <div
            className={`mt-4 flex flex-col gap-3 ${positioningData?.mission_id && missionHeadlineForUi ? 'md:flex-row md:items-stretch' : ''}`}
          >
            <Link
              href={`/review/${candidateId}`}
              className={`group flex min-h-22 min-w-0 flex-col justify-between rounded-xl border border-neon/35 bg-neon/5 p-4 shadow-sm outline-none transition-colors hover:border-neon/55 hover:bg-neon/10 focus-visible:ring-2 focus-visible:ring-ring ${positioningData?.mission_id && missionHeadlineForUi ? 'flex-1 md:min-w-0' : 'w-full'}`}
              aria-label={`Ouvrir le CV de ${candidateDisplayName ?? 'ce candidat'}`}
            >
              <p className="text-lg font-semibold leading-snug text-foreground group-hover:text-neon/95">
                {candidateDisplayName ?? 'Candidat'}
              </p>
              {candidateDescriptionLine ? (
                <p className="truncate mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {candidateDescriptionLine}
                </p>
              ) : (
                <p className="truncate mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  Profil extrait du CV — cliquez pour ouvrir la fiche.
                </p>
              )}
            </Link>

            {positioningData?.mission_id && missionHeadlineForUi ? (
              <>
                <div className="flex shrink-0 items-center justify-center md:w-14 md:py-0">
                  <Tooltip>
                    <TooltipTrigger
                      type="button"
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-violet/30 bg-violet/15 text-violet shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Analyse de matching"
                    >
                      <GitCompare className="h-5 w-5" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      Analyse de matching : comparaison entre la fiche de poste et le profil candidat.
                    </TooltipContent>
                  </Tooltip>
                </div>

                <Link
                  href={`/positions/${positioningData.mission_id}`}
                  className="group flex min-h-0 min-w-0 flex-1 flex-col justify-between rounded-xl border border-violet/25 bg-violet/5 p-4 shadow-sm outline-none transition-colors hover:border-violet/45 hover:bg-violet/10 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Ouvrir la fiche de la position : ${missionHeadlineForUi}`}
                >
                  <p className="text-lg font-semibold leading-snug text-foreground group-hover:text-violet">
                    {missionHeadlineForUi}
                  </p>
                  <p className="truncate mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {usesStructuredMissionAnalysis
                      ? 'Matching basé sur l’analyse structurée de la fiche (barème « Comprendre la fiche »).'
                      : 'Enrichissez la fiche sur la page mission pour affiner le barème ; le texte du positionnement peut servir de secours.'}
                  </p>
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="mb-4 mt-3 flex w-full justify-center">
          <Tabs
            value={String(currentStep)}
            onValueChange={(v) => {
              const n = Number(v);
              if (n !== 1 && n !== 2 && n !== 3) return;
              if (canGoToStep(n)) setCurrentStep(n);
            }}
            className="w-full max-w-2xl"
          >
            <TabsList variant="segmented" className="grid w-full grid-cols-3 gap-1">
              <TabsTrigger value="1" disabled={!canGoToStep(1)} className="flex-col gap-0.5 py-2 sm:flex-row sm:gap-1">
                <span className="tabular-nums">1</span>
                <span className="text-center leading-tight sm:inline">Analyse & affinage</span>
              </TabsTrigger>
              <TabsTrigger value="2" disabled={!canGoToStep(2)} className="flex-col gap-0.5 py-2 sm:flex-row sm:gap-1">
                <span className="tabular-nums">2</span>
                <span className="text-center leading-tight">
                  <span className="sm:hidden">Emails</span>
                  <span className="hidden sm:inline">Emails (client & candidat)</span>
                </span>
              </TabsTrigger>
              <TabsTrigger value="3" disabled={!canGoToStep(3)} className="flex-col gap-0.5 py-2 sm:flex-row sm:gap-1">
                <span className="tabular-nums">3</span>
                <span className="text-center leading-tight sm:inline">CV retravaillé</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Split layout — étape 2 : emails client + candidat sur toute la largeur (pas de graphiques d’analyse à droite) */}
        <div
          className={`flex min-h-0 flex-1 flex-col gap-4 ${currentStep === 2 ? '' : 'lg:flex-row'}`}
        >
          {/* Left / principal */}
          <div
            className={`w-full flex flex-col min-h-0 ${currentStep === 2 ? 'flex-1' : 'lg:w-1/2'}`}
          >
            {currentStep === 1 && (
              <div className="flex flex-col min-h-0 gap-3 h-full">
                {/* Job description — editable before analysis, read-only after */}
                {(analysisBusy || analysisComplete) ? (
                  <JobInput
                    jobDescription={jobDescription}
                    onJobDescriptionChange={setJobDescription}
                    onAnalyze={handleReAnalyze}
                    onReAnalyze={analysisComplete ? handleReAnalyze : undefined}
                    isAnalyzing={analysisBusy}
                    positioningStatus={positioningData?.status}
                    readOnly
                    missionHeadline={missionHeadlineForUi}
                  />
                ) : (
                  <JobInput
                    jobDescription={jobDescription}
                    onJobDescriptionChange={setJobDescription}
                    onAnalyze={handleReAnalyze}
                    isAnalyzing={analysisBusy}
                    positioningStatus={positioningData?.status}
                  />
                )}

                {/* Analysis results during streaming — no tabs yet */}
                {analysisBusy && (
                  <div className="flex-1 overflow-y-auto">
                    <AnalysisView
                      analysis={analysis}
                      isAnalyzing={analysisBusy}
                      streamMeta={analysisStreamMeta}
                      analysisSnapshotRecruiterEntries={analysisSnapshotRecruiterEntries}
                      hideRecruiterSnapshot
                      recruiterDraftsDifferFromSnapshot={recruiterDraftsDifferFromSnapshot}
                    />
                  </div>
                )}

                {/* Tabs: Résultats | Questions — once analysis complete */}
                {analysisComplete && (
                  <Tabs defaultValue="results" className="flex flex-col min-h-0 flex-1">
                    <TabsList variant="segmented" className="w-full shrink-0 grid grid-cols-2">
                      <TabsTrigger value="results" className="text-xs">
                        Résultats
                      </TabsTrigger>
                      <TabsTrigger value="questions" className="text-xs">
                        Questions & Affinage
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="results" className="flex-1 overflow-y-auto mt-3 space-y-4 data-[state=inactive]:hidden">
                      <AnalysisView
                        analysis={analysis}
                        isAnalyzing={false}
                        onReAnalyze={handleReAnalyze}
                        analysisSnapshotRecruiterEntries={analysisSnapshotRecruiterEntries}
                        onRemoveRecruiterAnswerEntry={handleRemoveRecruiterAnswerEntry}
                        recruiterDraftsDifferFromSnapshot={recruiterDraftsDifferFromSnapshot}
                      />
                    </TabsContent>
                    <TabsContent value="questions" className="flex-1 overflow-y-auto mt-3 data-[state=inactive]:hidden">
                      <QuestionsPanel
                        analysis={analysis}
                        onNext={() => setCurrentStep(2)}
                        onReAnalyze={handleReAnalyze}
                        isAnalyzing={false}
                        recruiterAnswerEntries={recruiterAnswerEntries}
                        appendRecruiterAnswer={appendRecruiterAnswer}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex-1 overflow-y-auto">
                <EmailsGenerationStep
                  isStreaming={genBusy}
                  streamMeta={generateStreamMeta}
                  onGenerateEmails={handleGenerateEmails}
                  positioningStatus={positioningData?.status}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div className="flex-1 overflow-y-auto">
                <CvGenerationStep
                  isStreaming={genBusy}
                  streamMeta={generateStreamMeta}
                  onGenerateCv={handleGenerateCv}
                  onExport={handleExport}
                  exportPending={exportPositioning.isPending}
                  positioningStatus={positioningData?.status}
                />
              </div>
            )}
          </div>

          {/* Right panel — masqué à l’étape 2 (l’analyse est déjà à l’étape 1) */}
          {currentStep !== 2 && (
          <div className="w-full min-h-[400px] lg:min-h-0 lg:w-1/2">
            <div className="flex h-full flex-col rounded-2xl glass-panel overflow-hidden">
              {currentStep === 3 ? (
                <>
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h2 className="flex items-center text-sm font-semibold text-foreground">
                      <FileText className="mr-2 h-4 w-4 text-accent" />
                      Aperçu CV retravaillé
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setFullscreen(true)}
                        disabled={!pdfBlobUrl}
                        className="text-muted-foreground hover:text-foreground hover:bg-overlay/10"
                      >
                        <Maximize2 className="h-3.5 w-3.5" />
                      </Button>
                      {pdfBlobUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!pdfBlobUrl) return;
                            const a = document.createElement('a');
                            a.href = pdfBlobUrl;
                            a.download = 'ESNEO_CV_positioning.pdf';
                            a.click();
                          }}
                          className="border-accent/40 text-accent hover:bg-accent/15 hover:text-accent-foreground dark:text-accent-foreground"
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Télécharger
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="relative flex-1 bg-background dark:bg-shell">
                    {isPdfLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 dark:bg-shell/70">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    {pdfBlobUrl ? (
                      <iframe
                        src={pdfEmbedSrc(pdfBlobUrl)}
                        className="h-full w-full bg-background dark:bg-shell"
                        title="CV Preview"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                        <FileText className="mb-2 h-10 w-10" />
                        <p className="text-sm">Le CV retravaillé apparaîtra ici</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <h2 className="flex items-center text-sm font-semibold text-foreground">
                      <Target className="mr-2 h-4 w-4 text-violet" />
                      Visualisation de l&apos;analyse
                    </h2>
                  </div>
                  <div className="relative overflow-y-auto flex-1 bg-shell">
                    <AnalysisCharts
                      analysis={analysis}
                      isAnalyzing={analysisBusy}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Fullscreen comparison dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className="sm:max-w-[95vw] h-[92vh] flex flex-col gap-0 p-0 bg-background dark:bg-shell border border-border"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <DialogTitle className="flex items-center text-sm font-semibold text-foreground">
              <FileText className="mr-2 h-4 w-4 text-accent" />
              Comparaison des CV
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!pdfBlobUrl) return;
                  const a = document.createElement('a');
                  a.href = pdfBlobUrl;
                  a.download = 'ESNEO_CV_positioning.pdf';
                  a.click();
                }}
                disabled={!pdfBlobUrl}
                className="border-accent/40 text-accent hover:bg-accent/15 hover:text-accent-foreground dark:text-accent-foreground"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Télécharger
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreen(false)}
                className="text-muted-foreground hover:text-foreground hover:bg-overlay/10"
              >
                Fermer
              </Button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 gap-px bg-border">
            {/* Original CV */}
            <div className="flex flex-1 flex-col min-w-0">
              <div className="flex items-center gap-2 border-b border-border bg-overlay/[0.06] px-4 py-2">
                <FileInput className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">CV extrait</span>
              </div>
              <div className="relative flex-1 bg-background dark:bg-shell">
                {originalPdfBlobUrl ? (
                  <iframe
                    src={pdfEmbedSrc(originalPdfBlobUrl)}
                    className="h-full w-full bg-background dark:bg-shell"
                    title="CV Original"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="mb-2 h-8 w-8 animate-spin" />
                    <p className="text-sm">Génération du CV extrait...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tailored CV */}
            <div className="flex flex-1 flex-col min-w-0">
              <div className="flex items-center gap-2 border-b border-border bg-overlay/[0.06] px-4 py-2">
                <FileText className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-accent">CV retravaillé</span>
              </div>
              <div className="relative flex-1 bg-background dark:bg-shell">
                {isPdfLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 dark:bg-shell/70">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {pdfBlobUrl ? (
                  <iframe
                    src={pdfEmbedSrc(pdfBlobUrl)}
                    className="h-full w-full bg-background dark:bg-shell"
                    title="CV Retravaillé"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <FileText className="mb-2 h-10 w-10" />
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
