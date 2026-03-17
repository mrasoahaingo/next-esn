'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { positioningAnalysisSchema, positioningOutputSchema } from '@/lib/schema';
import type { ExtractedCV, PositioningAnalysis, PositioningOutput } from '@/lib/schema';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { useTemplateStore, fetchTemplateConfig } from '@/lib/stores/template.store';
import { usePositioningPdfPreview } from '@/lib/hooks/usePositioningPdfPreview';
import { useSessionTimer } from '@/lib/hooks/useSessionTimer';
import { usePositioning, useCandidate, useUpdatePositioning, useExportPositioning } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Download, Loader2, Target, FileText, TrendingUp, AlertTriangle, CheckCircle2, Maximize2, FileInput, Clock, Cpu, Pencil } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { StepIndicator } from './components/StepIndicator';
import { JobInput } from './components/JobInput';
import { AnalysisView } from './components/AnalysisView';
import { AnalysisCharts } from './components/AnalysisCharts';
import { QuestionsPanel } from './components/QuestionsPanel';
import { GenerationStep } from './components/GenerationStep';

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function useDebouncedSave(positioningId: string | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback((data: Record<string, unknown>) => {
    if (!positioningId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch(`/api/positioning/${positioningId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }, 1000);
  }, [positioningId]);
}

export default function PositioningWizardPage() {
  const params = useParams();
  const router = useRouter();
  const candidateId = params?.id as string;
  const positioningIdParam = params?.positioningId as string;

  const {
    jobDescription,
    analysis,
    tailoredCv,
    email,
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
    setCandidateEmail,
    setCurrentStep,
    setIsAnalyzing,
    setIsGenerating,
    setOriginalPdfBlobUrl,
    updateAnswer,
    reset,
  } = usePositioningStore();

  const setTemplateConfig = useTemplateStore((s) => s.setTemplateConfig);

  const { data: positioningData } = usePositioning(positioningIdParam);
  const { data: candidateData } = useCandidate(candidateId);
  const updatePositioning = useUpdatePositioning();
  const exportPositioning = useExportPositioning();

  const [isLoaded, setIsLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [aiAnalysisDurationMs, setAiAnalysisDurationMs] = useState<number | null>(null);
  const [aiGenerationDurationMs, setAiGenerationDurationMs] = useState<number | null>(null);
  const [userTimeSeconds, setUserTimeSeconds] = useState<number | null>(null);
  // Track if we already auto-launched analysis on mount
  const autoAnalyzedRef = useRef(false);

  const debouncedSave = useDebouncedSave(positioningIdParam);

  // Streaming hooks
  const {
    object: analysisObject,
    submit: submitAnalysis,
    isLoading: isAnalysisLoading,
  } = useObject({
    api: '/api/positioning/analyze',
    schema: positioningAnalysisSchema,
  });

  const {
    object: generateObject,
    submit: submitGenerate,
    isLoading: isGenerateLoading,
  } = useObject({
    api: '/api/positioning/generate',
    schema: positioningOutputSchema,
  });

  usePositioningPdfPreview();
  useSessionTimer({
    endpoint: `/api/positioning/${positioningIdParam}/time`,
    enabled: isLoaded && !isAnalyzing && !isAnalysisLoading && !isGenerating && !isGenerateLoading,
  });

  // Load positioning from DB via React Query
  useEffect(() => {
    if (!positioningData || !candidateData) return;
    setPositioningId(positioningIdParam);

    const data = positioningData;

    // Load template config from candidate
    const templateId = data.candidates?.template_id;
    fetchTemplateConfig(templateId).then((config) => {
      setTemplateConfig(config);

      // Generate PDF from extracted_data (original CV before positioning)
      if (candidateData.extracted_data) {
        fetch('/api/pdf-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: candidateData.extracted_data, templateConfig: config }),
        })
          .then((res) => res.blob())
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            setOriginalPdfBlobUrl(url);
          })
          .catch(console.error);
      }
    });

    setJobDescription(data.job_description ?? '');
    if (data.analysis) {
      setAnalysis(data.analysis);
    }
    if (data.tailored_cv) {
      setTailoredCv(data.tailored_cv);
    }
    if (data.email) {
      setEmail(data.email);
    }
    if (data.candidate_email) {
      setCandidateEmail(data.candidate_email);
    }

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

    // Store time tracking data
    if (data.ai_analysis_duration_ms) setAiAnalysisDurationMs(data.ai_analysis_duration_ms);
    if (data.ai_generation_duration_ms) setAiGenerationDurationMs(data.ai_generation_duration_ms);
    if (data.user_time_seconds) setUserTimeSeconds(data.user_time_seconds);

    // Determine initial step
    if (data.tailored_cv || data.email) {
      setCurrentStep(3);
    } else if (data.analysis) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }

    setIsLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positioningData, candidateData]);

  // Auto-launch analysis when landing on step 1 with no analysis (fresh positioning)
  useEffect(() => {
    if (!isLoaded || autoAnalyzedRef.current) return;
    if (currentStep === 1 && !analysis && jobDescription.trim()) {
      autoAnalyzedRef.current = true;
      setIsAnalyzing(true);
      submitAnalysis({ positioningId: positioningIdParam });
    }
  }, [isLoaded, currentStep, analysis, jobDescription, positioningIdParam, setIsAnalyzing, submitAnalysis]);

  // Sync streaming analysis to store
  useEffect(() => {
    if (analysisObject) {
      setAnalysis(analysisObject as Partial<PositioningAnalysis>);
    }
  }, [analysisObject, setAnalysis]);

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
      if (obj.candidateEmail) setCandidateEmail(obj.candidateEmail);
    }
  }, [generateObject, setTailoredCv, setEmail, setCandidateEmail]);

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

  const handleReAnalyze = useCallback(async () => {
    if (!jobDescription.trim()) return;

    updatePositioning.mutate(
      { id: positioningIdParam, job_description: jobDescription },
      {
        onSuccess: () => {
          setCurrentStep(1);
          setIsAnalyzing(true);
          setAnalysis(null);
          submitAnalysis({ positioningId: positioningIdParam });
        },
      }
    );
  }, [jobDescription, positioningIdParam, updatePositioning, setCurrentStep, setIsAnalyzing, setAnalysis, submitAnalysis]);

  const handleGenerate = useCallback(async () => {
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
          setCandidateEmail(null);
          submitGenerate({ positioningId: positioningIdParam, answers });
        },
      }
    );
  }, [positioningIdParam, analysis, updatePositioning, setIsGenerating, setTailoredCv, setEmail, setCandidateEmail, submitGenerate]);

  const handleExport = useCallback(async () => {
    if (!positioningIdParam || !tailoredCv) return;
    exportPositioning.mutate({ id: positioningIdParam, tailoredCv, email, candidateEmail }, {
      onSuccess: (data) => {
        if (data.fileUrl) {
          const a = document.createElement('a');
          a.href = data.fileUrl;
          a.download = 'HIMEO_CV_positioning.pdf';
          a.target = '_blank';
          a.click();
        }
      },
    });
  }, [positioningIdParam, tailoredCv, exportPositioning]);

  // Navigation
  const isStreaming = isAnalyzing || isAnalysisLoading || isGenerating || isGenerateLoading;
  const analysisComplete = !!analysis?.matchScore && !isAnalyzing && !isAnalysisLoading;

  const canGoToStep = (step: 1 | 2 | 3) => {
    if (isStreaming) return false;
    if (step === 1) return true;
    if (step === 2) return analysisComplete;
    if (step === 3) return analysisComplete; // accessible once analysis is done
    return false;
  };

  const handleStepClick = (step: 1 | 2 | 3) => {
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
                          Édition : <span className="font-semibold">{formatSeconds(userTimeSeconds)}</span>
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}

              <Button variant="ghost" size="sm" onClick={() => router.push(`/review/${candidateId}`)}>
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                CV
              </Button>
              {currentStep === 3 && (
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
          <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
            {currentStep === 1 && (
              <>
                <JobInput
                  jobDescription={jobDescription}
                  onJobDescriptionChange={setJobDescription}
                  onAnalyze={handleReAnalyze}
                  isAnalyzing={isAnalyzing || isAnalysisLoading}
                  disabled={false}
                />
                <AnalysisView
                  analysis={analysis}
                  isAnalyzing={isAnalyzing || isAnalysisLoading}
                />
              </>
            )}

            {currentStep === 2 && (
              <QuestionsPanel
                analysis={analysis}
                onUpdateAnswer={updateAnswer}
                onNext={() => setCurrentStep(3)}
              />
            )}

            {currentStep === 3 && (
              <GenerationStep
                positioningId={positioningIdParam}
                isStreaming={isGenerating || isGenerateLoading}
                onGenerate={handleGenerate}
              />
            )}
          </div>

          {/* Right panel */}
          <div className="w-1/2 sticky top-0">
            <div className="flex h-full flex-col rounded-2xl glass-panel overflow-hidden">
              {currentStep === 3 ? (
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
                            a.download = 'HIMEO_CV_positioning.pdf';
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
                  a.download = 'HIMEO_CV_positioning.pdf';
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
