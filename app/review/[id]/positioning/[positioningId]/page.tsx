'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { positioningAnalysisSchema, positioningOutputSchema } from '@/lib/schema';
import type { ExtractedCV, PositioningAnalysis, PositioningOutput } from '@/lib/schema';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { usePositioningPdfPreview } from '@/lib/hooks/usePositioningPdfPreview';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2, Target, FileText, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { JobInput } from './components/JobInput';
import { AnalysisView } from './components/AnalysisView';
import { AnalysisCharts } from './components/AnalysisCharts';
import { QuestionsPanel } from './components/QuestionsPanel';
import { GenerationStep } from './components/GenerationStep';

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
    setPositioningId,
    setJobDescription,
    setAnalysis,
    setTailoredCv,
    setEmail,
    setCandidateEmail,
    setCurrentStep,
    setIsAnalyzing,
    setIsGenerating,
    updateAnswer,
    reset,
  } = usePositioningStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
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

  // Load positioning from DB on mount
  useEffect(() => {
    if (!positioningIdParam) return;
    setPositioningId(positioningIdParam);

    fetch(`/api/positioning/${positioningIdParam}`)
      .then((res) => res.json())
      .then((data) => {
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

        // Determine initial step
        if (data.tailored_cv || data.email) {
          setCurrentStep(3);
        } else if (data.analysis) {
          setCurrentStep(2);
        } else {
          setCurrentStep(1);
        }

        setIsLoaded(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positioningIdParam]);

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

    await fetch(`/api/positioning/${positioningIdParam}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jobDescription }),
    });

    setCurrentStep(1);
    setIsAnalyzing(true);
    setAnalysis(null);
    submitAnalysis({ positioningId: positioningIdParam });
  }, [jobDescription, positioningIdParam, setCurrentStep, setIsAnalyzing, setAnalysis, submitAnalysis]);

  const handleGenerate = useCallback(async () => {
    if (!positioningIdParam || !analysis) return;

    const answers: Record<string, string> = {};
    for (const q of analysis.candidateQuestions ?? []) {
      if (q.answer) answers[q.question] = q.answer;
    }
    for (const q of analysis.clientQuestions ?? []) {
      if (q.answer) answers[q.question] = q.answer;
    }

    await fetch(`/api/positioning/${positioningIdParam}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });

    setIsGenerating(true);
    setTailoredCv(null);
    setEmail(null);
    setCandidateEmail(null);
    submitGenerate({ positioningId: positioningIdParam, answers });
  }, [positioningIdParam, analysis, setCurrentStep, setIsGenerating, setTailoredCv, setEmail, setCandidateEmail, submitGenerate]);

  const handleExport = useCallback(async () => {
    if (!positioningIdParam || !tailoredCv) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/positioning/${positioningIdParam}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredCv, email, candidateEmail }),
      });
      const data = await res.json();
      if (data.fileUrl) {
        const a = document.createElement('a');
        a.href = data.fileUrl;
        a.download = 'HIMEO_CV_positioning.pdf';
        a.target = '_blank';
        a.click();
      }
    } finally {
      setIsExporting(false);
    }
  }, [positioningIdParam, tailoredCv, email, candidateEmail]);

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
      <div className="flex justify-center items-center h-screen bg-background text-foreground">
        <Loader2 className="animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1800px] px-4 py-4 md:px-6">
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

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push(`/review/${candidateId}`)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Retour au CV
              </Button>
              {currentStep === 3 && (
                <Button onClick={handleExport} disabled={isExporting || isStreaming || !tailoredCv}>
                  {isExporting ? (
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
        <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>
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
    </div>
  );
}
