'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { positioningAnalysisSchema, positioningOutputSchema } from '@/lib/schema';
import type { ExtractedCV, PositioningAnalysis, PositioningOutput } from '@/lib/schema';
import { usePositioningStore } from '@/lib/stores/positioning.store';
import { usePositioningPdfPreview } from '@/lib/hooks/usePositioningPdfPreview';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Loader2, Target, FileText } from 'lucide-react';
import { StepIndicator } from './components/StepIndicator';
import { JobInput } from './components/JobInput';
import { AnalysisView } from './components/AnalysisView';
import { QuestionsPanel } from './components/QuestionsPanel';
import { EmailEditor } from './components/EmailEditor';
import { TailoredCvForm } from './components/TailoredCvForm';

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
    positioningId,
    jobDescription,
    analysis,
    tailoredCv,
    email,
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
    setCurrentStep,
    setIsAnalyzing,
    setIsGenerating,
    updateAnswer,
    updateTailoredCvField,
    reset,
  } = usePositioningStore();

  const originalPdfBlobUrl = useCvBuilderStore((s) => s.pdfBlobUrl);

  const [activeTab, setActiveTab] = useState<'email' | 'cv'>('email');
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
    }
  }, [generateObject, setTailoredCv, setEmail]);

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

    setCurrentStep(3);
    setIsGenerating(true);
    setTailoredCv(null);
    setEmail(null);
    submitGenerate({ positioningId: positioningIdParam, answers });
  }, [positioningIdParam, analysis, setCurrentStep, setIsGenerating, setTailoredCv, setEmail, submitGenerate]);

  const handleExport = useCallback(async () => {
    if (!positioningIdParam || !tailoredCv) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/positioning/${positioningIdParam}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tailoredCv, email }),
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
  }, [positioningIdParam, tailoredCv, email]);

  // Navigation
  const isStreaming = isAnalyzing || isAnalysisLoading || isGenerating || isGenerateLoading;
  const analysisComplete = !!analysis?.matchScore && !isAnalyzing && !isAnalysisLoading;
  const hasGenerated = !!tailoredCv || !!email;

  const canGoToStep = (step: 1 | 2 | 3) => {
    if (isStreaming) return false;
    if (step === 1) return true;
    if (step === 2) return analysisComplete;
    if (step === 3) return hasGenerated; // only via "Générer" button or if already generated
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
                onGenerate={handleGenerate}
                isGenerating={isGenerating || isGenerateLoading}
              />
            )}

            {currentStep === 3 && (
              <>
                {(isGenerating || isGenerateLoading) && !tailoredCv && !email && (
                  <section className="glass-panel rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-shimmer" />
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-xl bg-violet/20 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-violet" />
                        </div>
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-violet" />
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Génération en cours...</p>
                        <p className="text-xs text-slate-400 mt-1">L'IA retravaille le CV et rédige l'email de positionnement</p>
                      </div>
                      <div className="w-full max-w-xs space-y-3 mt-2">
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-violet/40 animate-pulse" style={{ width: '60%' }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>CV retravaillé</span>
                          <span>Email</span>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {(tailoredCv || email) && (
                  <>
                    {(isGenerating || isGenerateLoading) && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet/10 border border-violet/20">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet" />
                        </span>
                        <span className="text-xs font-medium text-violet">Génération en cours...</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('email')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeTab === 'email'
                            ? 'bg-violet/15 text-violet border border-violet/30'
                            : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                        }`}
                      >
                        Email de positionnement
                      </button>
                      <button
                        onClick={() => setActiveTab('cv')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          activeTab === 'cv'
                            ? 'bg-violet/15 text-violet border border-violet/30'
                            : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                        }`}
                      >
                        CV retravaillé
                      </button>
                    </div>

                    {activeTab === 'email' && (
                      <EmailEditor
                        email={email}
                        onChange={setEmail}
                        readOnly={isGenerating || isGenerateLoading}
                      />
                    )}

                    {activeTab === 'cv' && (
                      <TailoredCvForm
                        data={tailoredCv}
                        onUpdateField={updateTailoredCvField}
                        readOnly={isGenerating || isGenerateLoading}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* Right panel - PDF Preview */}
          <div className="w-1/2 sticky top-0">
            <div className="flex h-full flex-col rounded-2xl glass-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="flex items-center text-sm font-semibold text-white">
                  <FileText className="mr-2 h-4 w-4 text-accent" />
                  {currentStep === 3 ? 'Aperçu CV retravaillé' : 'CV original'}
                </h2>
                {currentStep === 3 && pdfBlobUrl && (
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
                {currentStep === 3 && isPdfLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0d16]/70">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}

                {currentStep === 3 ? (
                  pdfBlobUrl ? (
                    <iframe src={pdfBlobUrl} className="h-full w-full" title="CV Preview" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                      <FileText className="mb-2 h-10 w-10" />
                      <p className="text-sm">Le CV retravaillé apparaîtra ici</p>
                    </div>
                  )
                ) : (
                  originalPdfBlobUrl ? (
                    <iframe src={originalPdfBlobUrl} className="h-full w-full" title="CV Original" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                      <FileText className="mb-2 h-10 w-10" />
                      <p className="text-sm">CV original</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
