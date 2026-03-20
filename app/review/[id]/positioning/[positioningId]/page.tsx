'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import type { ExtractedCV, PositioningAnalysis, PositioningOutput } from '@/lib/schema';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { useTemplateStore, fetchTemplateConfig } from '@/lib/stores/template.store';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { useAutoSave } from '@/lib/hooks/useAutoSave';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import { usePositioning, useCandidate, useUpdatePositioning, useExportPositioning, useCancelWorkflow } from '@/lib/queries';
import { queryKeys } from '@/lib/queries/keys';
import { formatDuration, formatSeconds } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Download, Loader2, Target, FileText, TrendingUp, AlertTriangle, CheckCircle2, Maximize2, FileInput, Clock, Cpu, Pencil, Square } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import dynamic from 'next/dynamic';
import { StepIndicator } from './components/StepIndicator';
import { JobInput } from './components/JobInput';
import { AnalysisView } from './components/AnalysisView';
import { QuestionsPanel } from './components/QuestionsPanel';
import { GenerationStep } from './components/GenerationStep';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AnalysisCharts = dynamic(
  () => import('./components/AnalysisCharts').then((m) => m.AnalysisCharts),
  { loading: () => <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-violet" /></div> },
);

export default function PositioningWizardPage() {
  const params = useParams();
  const router = useRouter();
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
    isAnalyzing,
    isGenerating,
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
    setIsAnalyzing,
    setIsGenerating,
    setOriginalPdfBlobUrl,
    setPdfBlobUrl,
    setIsPdfLoading,
    updateAnswer,
    reset,
  } = store;

  const setTemplateConfig = useTemplateStore((s) => s.setTemplateConfig);

  const { data: positioningData } = usePositioning(positioningIdParam);
  const { data: candidateData } = useCandidate(candidateId);
  const updatePositioning = useUpdatePositioning();
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
    stop: stopAnalysis,
  } = useWorkflowStream<PositioningAnalysis, PositioningAnalysisStreamMeta>({
    api: '/api/positioning/analyze',
    runId: positioningData?.workflow_run_id,
    runStatus: positioningData?.status,
    activeStatuses: ['analyzing'],
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(positioningIdParam) });
    },
  });

  const {
    object: generateObject,
    submit: submitGenerate,
    isLoading: isGenerateLoading,
    stop: stopGenerate,
  } = useWorkflowStream<PositioningOutput>({
    api: '/api/positioning/generate',
    runId: positioningData?.workflow_run_id,
    runStatus: positioningData?.status,
    activeStatuses: ['generating'],
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(positioningIdParam) });
    },
  });

  // Derive time tracking from server data (no useState + useEffect sync)
  const aiAnalysisDurationMs = positioningData?.ai_analysis_duration_ms ?? null;
  const aiGenerationDurationMs = positioningData?.ai_generation_duration_ms ?? null;
  const userTimeSeconds = positioningData?.user_time_seconds ?? null;

  // Track if we already auto-launched analysis on mount
  const autoAnalyzedRef = useRef(false);

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
    enabled: isLoaded && !isAnalyzing && !isAnalysisLoading && !isGenerating && !isGenerateLoading,
  });

  // Track the last positioning id we initialized for
  const initializedForId = useRef<string | null>(null);

  // Load positioning from DB via React Query
  useEffect(() => {
    if (!positioningData || !candidateData) return;

    // Don't reset while we're actively streaming
    if (isAnalysisLoading || isGenerateLoading) return;

    const isNewPositioning = initializedForId.current !== positioningData.id;

    if (isNewPositioning) {
      initializedForId.current = positioningData.id;
      setPositioningId(positioningIdParam);
      setTemplateConfig(null);

      // Load template config from candidate
      const templateId = positioningData.candidates?.template_id;
      fetchTemplateConfig(templateId).then((config) => {
        setTemplateConfig(config);

        // Generate PDF from extracted_data (original CV before positioning)
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

    const data = positioningData;

    setJobDescription(data.job_description ?? '');

    // In-progress operations — reconnection is handled by useWorkflowStream
    if (data.status === 'analyzing' || data.status === 'generating') {
      if (data.status === 'analyzing') {
        setCurrentStep(1);
      } else {
        setCurrentStep(2);
      }
      setIsLoaded(true);
      return;
    }

    if (data.analysis) setAnalysis(data.analysis);
    if (data.tailored_cv) setTailoredCv(data.tailored_cv);
    if (data.email) setEmail(data.email);
    if (data.email_first_contact) setEmailFirstContact(data.email_first_contact);
    if (data.email_bullet_points) setEmailBulletPoints(data.email_bullet_points);
    if (data.candidate_email) setCandidateEmail(data.candidate_email);

    // Restore answers into analysis questions if available
    if (data.analysis && data.answers) {
      const restored = { ...data.analysis };
      if (restored.candidateQuestions) {
        restored.candidateQuestions = restored.candidateQuestions.map(
          (q: { question: string; context: string; answer?: string }) => ({
            ...q,
            answer: data.answers[`candidat:${q.question}`] ?? data.answers[q.question] ?? q.answer ?? '',
          }),
        );
      }
      if (restored.clientQuestions) {
        restored.clientQuestions = restored.clientQuestions.map(
          (q: { question: string; context: string; answer?: string }) => ({
            ...q,
            answer: data.answers[`client:${q.question}`] ?? data.answers[q.question] ?? q.answer ?? '',
          }),
        );
      }
      setAnalysis(restored);
    }

    // Determine initial step
    if (data.tailored_cv || data.email) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }

    setIsLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positioningData?.id, positioningData?.status, candidateData?.id]);

  // Auto-launch analysis when landing on step 1 with no analysis (fresh positioning)
  useEffect(() => {
    if (!isLoaded || autoAnalyzedRef.current) return;
    if (isAnalysisLoading) return; // Don't auto-launch if already streaming
    const isCandidateReadyForAnalysis = !!candidateData?.extracted_data
      && ['reviewing', 'ready', 'generated'].includes(candidateData.status ?? '');

    if (currentStep === 1 && !analysis && jobDescription.trim() && isCandidateReadyForAnalysis) {
      autoAnalyzedRef.current = true;
      setIsAnalyzing(true);
      submitAnalysis({ positioningId: positioningIdParam });
      refreshMissionCards();
    }
  }, [
    isLoaded,
    currentStep,
    analysis,
    jobDescription,
    positioningIdParam,
    setIsAnalyzing,
    submitAnalysis,
    isAnalysisLoading,
    candidateData?.status,
    candidateData?.extracted_data,
    refreshMissionCards,
  ]);

  // Sync streaming analysis to store
  useEffect(() => {
    if (analysisObject) {
      setAnalysis(analysisObject as Partial<PositioningAnalysis>);
    }
  }, [analysisObject, setAnalysis]);

  // Derive: when analysis loading finishes, clear isAnalyzing flag
  useEffect(() => {
    if (!isAnalysisLoading && isAnalyzing) {
      setIsAnalyzing(false);
    }
  }, [isAnalysisLoading, isAnalyzing, setIsAnalyzing]);

  // Sync streaming generation to store
  useEffect(() => {
    if (generateObject) {
      const obj = generateObject as Partial<PositioningOutput>;
      if (obj.tailoredCv) setTailoredCv(obj.tailoredCv as Partial<ExtractedCV>);
      if (obj.email) setEmail(obj.email);
      if (obj.emailFirstContact) setEmailFirstContact(obj.emailFirstContact);
      if (obj.emailBulletPoints) setEmailBulletPoints(obj.emailBulletPoints);
      if (obj.candidateEmail) setCandidateEmail(obj.candidateEmail);
    }
  }, [generateObject, setTailoredCv, setEmail, setEmailFirstContact, setEmailBulletPoints, setCandidateEmail]);

  useEffect(() => {
    if (!isGenerateLoading && isGenerating) {
      setIsGenerating(false);
    }
  }, [isGenerateLoading, isGenerating, setIsGenerating]);

  // Persist answers to DB when they change (debounced)
  useEffect(() => {
    if (!isLoaded) return;
    if (!analysis?.candidateQuestions && !analysis?.clientQuestions) return;
    const answers: Record<string, string> = {};
    for (const q of analysis.candidateQuestions ?? []) {
      if (q.answer) answers[`candidat:${q.question}`] = q.answer;
    }
    for (const q of analysis.clientQuestions ?? []) {
      if (q.answer) answers[`client:${q.question}`] = q.answer;
    }
    debouncedSave({ answers });
  }, [isLoaded, analysis?.candidateQuestions, analysis?.clientQuestions, debouncedSave]);

  // Persist tailoredCv edits to DB (debounced)
  useEffect(() => {
    if (!isLoaded || !tailoredCv || isGenerating || isGenerateLoading) return;
    debouncedSave({ tailored_cv: tailoredCv });
  }, [isLoaded, tailoredCv, isGenerating, isGenerateLoading, debouncedSave]);

  // Persist email edits to DB (debounced)
  useEffect(() => {
    if (!isLoaded || !email || isGenerating || isGenerateLoading) return;
    debouncedSave({ email });
  }, [isLoaded, email, isGenerating, isGenerateLoading, debouncedSave]);

  // Persist emailFirstContact edits to DB (debounced)
  useEffect(() => {
    if (!isLoaded || !emailFirstContact || isGenerating || isGenerateLoading) return;
    debouncedSave({ email_first_contact: emailFirstContact });
  }, [isLoaded, emailFirstContact, isGenerating, isGenerateLoading, debouncedSave]);

  // Persist emailBulletPoints edits to DB (debounced)
  useEffect(() => {
    if (!isLoaded || !emailBulletPoints || isGenerating || isGenerateLoading) return;
    debouncedSave({ email_bullet_points: emailBulletPoints });
  }, [isLoaded, emailBulletPoints, isGenerating, isGenerateLoading, debouncedSave]);

  // Persist candidate email edits to DB (debounced)
  useEffect(() => {
    if (!isLoaded || !candidateEmail || isGenerating || isGenerateLoading) return;
    debouncedSave({ candidate_email: candidateEmail });
  }, [isLoaded, candidateEmail, isGenerating, isGenerateLoading, debouncedSave]);

  // Reset store on unmount
  useEffect(() => {
    return () => reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReAnalyze = useCallback(() => {
    if (!jobDescription.trim()) return;

    // Preserve current answers so the API can use them as context
    const savedAnswers: Record<string, string> = {};
    for (const q of analysis?.candidateQuestions ?? []) {
      if (q.answer) savedAnswers[`candidat:${q.question}`] = q.answer;
    }
    for (const q of analysis?.clientQuestions ?? []) {
      if (q.answer) savedAnswers[`client:${q.question}`] = q.answer;
    }

    updatePositioning.mutate(
      { id: positioningIdParam, job_description: jobDescription },
      {
        onSuccess: () => {
          setCurrentStep(1);
          setIsAnalyzing(true);
          setAnalysis(null);
          submitAnalysis({ positioningId: positioningIdParam, answers: savedAnswers });
          refreshMissionCards();
        },
      }
    );
  }, [jobDescription, analysis, positioningIdParam, updatePositioning, setCurrentStep, setIsAnalyzing, setAnalysis, submitAnalysis, refreshMissionCards]);

  const handleGenerate = useCallback(() => {
    if (!positioningIdParam || !analysis) return;

    const answers: Record<string, string> = {};
    for (const q of analysis.candidateQuestions ?? []) {
      if (q.answer) answers[`candidat:${q.question}`] = q.answer;
    }
    for (const q of analysis.clientQuestions ?? []) {
      if (q.answer) answers[`client:${q.question}`] = q.answer;
    }

    updatePositioning.mutate(
      { id: positioningIdParam, answers },
      {
        onSuccess: () => {
          setIsGenerating(true);
          setTailoredCv(null);
          setEmail(null);
          setEmailFirstContact(null);
          setEmailBulletPoints(null);
          setCandidateEmail(null);
          submitGenerate({ positioningId: positioningIdParam, answers });
          refreshMissionCards();
        },
      }
    );
  }, [positioningIdParam, analysis, updatePositioning, setIsGenerating, setTailoredCv, setEmail, setCandidateEmail, submitGenerate, refreshMissionCards]);

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

  const handleCancelWorkflow = useCallback(() => {
    const runId = positioningData?.workflow_run_id;
    if (!runId) return;
    const isAnalyzingNow = isAnalyzing || isAnalysisLoading;
    if (isAnalyzingNow) {
      stopAnalysis();
      setIsAnalyzing(false);
    } else {
      stopGenerate();
      setIsGenerating(false);
    }
    cancelWorkflow.mutate({
      runId,
      table: 'positionings',
      recordId: positioningIdParam,
      resetStatus: isAnalyzingNow ? 'draft' : 'analyzed',
    });
  }, [positioningData?.workflow_run_id, positioningIdParam, isAnalyzing, isAnalysisLoading, stopAnalysis, stopGenerate, setIsAnalyzing, setIsGenerating, cancelWorkflow]);

  // Navigation
  const isStreaming = isAnalyzing || isAnalysisLoading || isGenerating || isGenerateLoading;
  const analysisComplete = !!analysis?.matchScore && !isAnalyzing && !isAnalysisLoading;

  const canGoToStep = (step: 1 | 2) => {
    if (isStreaming) return false;
    if (step === 1) return true;
    if (step === 2) return analysisComplete;
    return false;
  };

  const handleStepClick = (step: 1 | 2) => {
    if (canGoToStep(step)) setCurrentStep(step);
  };

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-full bg-background text-foreground">
        <Loader2 className="animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col px-4 py-4 md:px-6">
        {/* Top bar */}
        <div className="mb-4 rounded-2xl glass-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/20 text-violet neon-ring">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                  <Target className="h-3 w-3 text-violet" />
                  Positionnement
                </div>
                <h1 className="text-lg font-semibold title-gradient">
                  Positionnement sur offre
                </h1>
              </div>
            </div>
            {/* Key metrics */}
            {analysis?.matchScore != null && !isAnalyzing && !isAnalysisLoading && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                  <TrendingUp className={`h-4 w-4 ${analysis.matchScore >= 70 ? 'text-neon' : analysis.matchScore >= 40 ? 'text-amber-400' : 'text-destructive'}`} />
                  <span className={`text-lg font-bold ${analysis.matchScore >= 70 ? 'text-neon' : analysis.matchScore >= 40 ? 'text-amber-400' : 'text-destructive'}`}>
                    {analysis.matchScore}%
                  </span>
                  <span className="text-xs text-slate-400">Score</span>
                </div>
                {analysis.skillMatches && (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                    <CheckCircle2 className="h-4 w-4 text-neon" />
                    <span className="text-sm font-semibold text-white">
                      {analysis.skillMatches.filter((s) => s.relevance === 'strong').length}/{analysis.skillMatches.length}
                    </span>
                    <span className="text-xs text-slate-400">Compétences</span>
                  </div>
                )}
                {analysis.gaps && analysis.gaps.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-semibold text-white">{analysis.gaps.length}</span>
                    <span className="text-xs text-slate-400">Lacunes</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Time tracking */}
              {(aiAnalysisDurationMs || aiGenerationDurationMs || userTimeSeconds) && (
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
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
              )}

              {/* Streaming indicator + cancel */}
              {isStreaming && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-violet/20 bg-violet/10 px-3 py-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet" />
                    <span className="text-xs font-medium text-violet">
                      {isAnalyzing || isAnalysisLoading ? 'Analyse en cours...' : 'Génération en cours...'}
                    </span>
                  </div>
                  {positioningData?.workflow_run_id && (
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

              <Button variant="ghost" size="sm" onClick={() => router.push(`/review/${candidateId}`)}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                CV
              </Button>
              {positioningData?.mission_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/positions/${positioningData.mission_id}`)}
                >
                  <Target className="mr-1.5 h-3.5 w-3.5" />
                  Position
                </Button>
              )}
              {currentStep === 2 && (
                <Button onClick={handleExport} disabled={exportPositioning.isPending || isStreaming || !tailoredCv}>
                  {exportPositioning.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Exporter
                </Button>
              )}
            </div>
          </div>

          <StepIndicator
            currentStep={currentStep}
            onStepClick={handleStepClick}
            canGoToStep={canGoToStep}
          />
        </div>

        {/* Split layout */}
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Left panel */}
          <div className="w-1/2 flex flex-col min-h-0">
            {currentStep === 1 && (
              <div className="flex flex-col min-h-0 gap-3 h-full">
                {/* Job description — editable before analysis, read-only after */}
                {(isAnalyzing || isAnalysisLoading || analysisComplete) ? (
                  <JobInput
                    jobDescription={jobDescription}
                    onJobDescriptionChange={setJobDescription}
                    onAnalyze={handleReAnalyze}
                    onReAnalyze={analysisComplete ? handleReAnalyze : undefined}
                    isAnalyzing={isAnalyzing || isAnalysisLoading}
                    readOnly
                  />
                ) : (
                  <JobInput
                    jobDescription={jobDescription}
                    onJobDescriptionChange={setJobDescription}
                    onAnalyze={handleReAnalyze}
                    isAnalyzing={isAnalyzing || isAnalysisLoading}
                  />
                )}

                {/* Analysis results during streaming — no tabs yet */}
                {(isAnalyzing || isAnalysisLoading) && (
                  <div className="flex-1 overflow-y-auto pr-2">
                    <AnalysisView
                      analysis={analysis}
                      isAnalyzing={isAnalyzing || isAnalysisLoading}
                      streamMeta={analysisStreamMeta}
                    />
                  </div>
                )}

                {/* Tabs: Résultats | Questions — once analysis complete */}
                {analysisComplete && (
                  <Tabs defaultValue="results" className="flex flex-col min-h-0 flex-1">
                    <TabsList className="w-full shrink-0 bg-white/5 border border-white/10 rounded-xl p-1">
                      <TabsTrigger value="results" className="flex-1 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">
                        Résultats
                      </TabsTrigger>
                      <TabsTrigger value="questions" className="flex-1 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-lg">
                        Questions & Affinage
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="results" className="flex-1 overflow-y-auto mt-3 pr-2 space-y-4 data-[state=inactive]:hidden">
                      <AnalysisView
                        analysis={analysis}
                        isAnalyzing={false}
                        onReAnalyze={handleReAnalyze}
                      />
                    </TabsContent>
                    <TabsContent value="questions" className="flex-1 overflow-y-auto mt-3 pr-2 data-[state=inactive]:hidden">
                      <QuestionsPanel
                        analysis={analysis}
                        onUpdateAnswer={updateAnswer}
                        onNext={() => setCurrentStep(2)}
                        onReAnalyze={handleReAnalyze}
                        isAnalyzing={false}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex-1 overflow-y-auto pr-2">
                <GenerationStep
                  isStreaming={isGenerating || isGenerateLoading}
                  onGenerate={handleGenerate}
                />
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="w-1/2 sticky top-0">
            <div className="flex h-full flex-col rounded-2xl glass-panel overflow-hidden">
              {currentStep === 2 ? (
                <>
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <h2 className="flex items-center text-sm font-semibold text-white">
                      <FileText className="mr-2 h-4 w-4 text-accent" />
                      Aperçu CV retravaillé
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setFullscreen(true)}
                        disabled={!pdfBlobUrl}
                        className="text-muted-foreground hover:text-white hover:bg-white/10"
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
                          className="border-accent/30 text-accent-foreground hover:bg-accent/10"
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Télécharger
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="relative flex-1 bg-[#0a0d16]">
                    {isPdfLoading && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0d16]/70">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    )}
                    {pdfBlobUrl ? (
                      <iframe src={pdfBlobUrl} className="h-full w-full" title="CV Preview" />
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
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                    <h2 className="flex items-center text-sm font-semibold text-white">
                      <Target className="mr-2 h-4 w-4 text-violet" />
                      Visualisation de l&apos;analyse
                    </h2>
                  </div>
                  <div className="relative overflow-y-auto flex-1 bg-[#0a0d16]">
                    <AnalysisCharts
                      analysis={analysis}
                      isAnalyzing={isAnalyzing || isAnalysisLoading}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen comparison dialog */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className="sm:max-w-[95vw] h-[92vh] flex flex-col gap-0 p-0 bg-[#0a0d16] border border-white/10"
          showCloseButton={false}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <DialogTitle className="flex items-center text-sm font-semibold text-white">
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
                className="border-accent/30 text-accent-foreground hover:bg-accent/10"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Télécharger
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFullscreen(false)}
                className="text-muted-foreground hover:text-white hover:bg-white/10"
              >
                Fermer
              </Button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 gap-px bg-white/10">
            {/* Original CV */}
            <div className="flex flex-1 flex-col min-w-0">
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
                <FileInput className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">CV extrait</span>
              </div>
              <div className="relative flex-1 bg-[#0a0d16]">
                {originalPdfBlobUrl ? (
                  <iframe
                    src={originalPdfBlobUrl}
                    className="h-full w-full"
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
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
                <FileText className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium text-accent">CV retravaillé</span>
              </div>
              <div className="relative flex-1 bg-[#0a0d16]">
                {isPdfLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0d16]/70">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {pdfBlobUrl ? (
                  <iframe
                    src={pdfBlobUrl}
                    className="h-full w-full"
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
