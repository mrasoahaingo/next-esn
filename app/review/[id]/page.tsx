'use client';

import { useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { extractionSchema, ExtractedCV } from '@/lib/schema';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';
import { Loader2, AlertCircle, Sparkles, PanelLeft, BadgeCheck } from 'lucide-react';
import { PersonalInfo } from '../components/PersonalInfo';
import { Skills } from '../components/Skills';
import { Strengths } from '../components/Strengths';
import { Experiences } from '../components/Experiences';
import { Education } from '../components/Education';
import { Summary } from '../components/Summary';
import { PdfPreview } from '../components/PdfPreview';

export default function ReviewPage() {
  const params = useParams();
  const {
    cvData,
    isStreaming,
    setCvData,
    updateField,
    setStreaming,
  } = useCvBuilderStore();

  const { object, submit, isLoading, error } = useObject({
    api: '/api/extract',
    schema: extractionSchema,
  });

  // Activate PDF preview hook
  usePdfPreview();

  // Load candidate and start extraction
  useEffect(() => {
    if (params?.id) {
      fetch(`/api/candidates/${params.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.extracted_data && !isLoading) {
            setCvData(data.extracted_data);
          }
          if (data.status === 'uploaded' || data.status === 'extracting') {
            setStreaming(true);
            submit({ candidateId: params.id });
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  // Pipe streaming object into store
  useEffect(() => {
    if (object) {
      setCvData(object as Partial<ExtractedCV>);
    }
  }, [object, setCvData]);

  // Track streaming state
  useEffect(() => {
    if (!isLoading && isStreaming) {
      setStreaming(false);
    }
  }, [isLoading, isStreaming, setStreaming]);

  const handleUpdate = useCallback((field: keyof ExtractedCV, value: unknown) => {
    updateField(field, value);
  }, [updateField]);

  const handleSave = async () => {
    if (!cvData) return;
    await fetch(`/api/candidates/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extracted_data: cvData, status: 'ready' }),
    });
  };

  const safeData = cvData as Partial<ExtractedCV> | undefined;
  const safeExperiences = (safeData?.experiences ?? []).filter(Boolean);
  const safeEducation = (safeData?.education ?? []).filter(Boolean);
  const safeSkills = (safeData?.skills ?? []).filter(Boolean);
  const safeStrengths = (safeData?.strengths ?? []).filter(Boolean);

  if (!cvData && !isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-shell text-white">
        <Loader2 className="animate-spin mr-2" /> Chargement...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-shell text-white">
      <div className="mx-auto max-w-[1800px] px-4 py-4 md:px-6">
        {/* Top bar */}
        <div className="mb-4 rounded-2xl glass-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon/20 text-neon neon-ring">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                  <PanelLeft className="h-3 w-3 text-violet" />
                  CV Builder
                </div>
                <h1 className="text-lg font-semibold title-gradient">
                  {isLoading ? 'Extraction en cours...' : 'Édition du CV'}
                </h1>
              </div>
            </div>
            <div className="flex gap-3">
              {isLoading && (
                <span className="inline-flex items-center rounded-xl border border-neon/25 bg-neon/10 px-3 py-2 text-sm text-neon">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI Extracting...
                </span>
              )}
              <button
                onClick={handleSave}
                className="inline-flex items-center rounded-xl bg-neon px-5 py-2 font-semibold text-black transition hover:bg-neon/90 disabled:opacity-50"
                disabled={isLoading || !cvData}
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                Sauvegarder
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            <AlertCircle className="mr-2 h-5 w-5" />
            {error.message}
          </div>
        )}

        {/* Split layout: form left, PDF right */}
        <div className="flex gap-4" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Left: Form */}
          <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <PersonalInfo
                data={safeData?.personalInfo}
                onChange={(val) => handleUpdate('personalInfo', val)}
                readOnly={isLoading}
              />
              <Summary
                data={safeData?.summary}
                onChange={(val) => handleUpdate('summary', val)}
                readOnly={isLoading}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Skills
                data={safeSkills}
                onChange={(val) => handleUpdate('skills', val)}
                readOnly={isLoading}
              />
              <Strengths
                data={safeStrengths}
                onChange={(val) => handleUpdate('strengths', val)}
                readOnly={isLoading}
              />
            </div>
            <Experiences
              data={safeExperiences}
              onChange={(val) => handleUpdate('experiences', val)}
              readOnly={isLoading}
            />
            <Education
              data={safeEducation}
              onChange={(val) => handleUpdate('education', val)}
              readOnly={isLoading}
            />
          </div>

          {/* Right: PDF Preview */}
          <div className="w-1/2 sticky top-0">
            <PdfPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
