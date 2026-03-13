'use client';

import { useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { extractionSchema, ExtractedCV } from '@/lib/schema';
import { useCvBuilderStore } from '@/lib/stores/cv-builder.store';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Sparkles, PanelLeft, BadgeCheck, Plus } from 'lucide-react';
import { PersonalInfo } from '../components/PersonalInfo';
import { Skills } from '../components/Skills';
import { Strengths } from '../components/Strengths';
import { Experiences } from '../components/Experiences';
import { Education } from '../components/Education';
import { Summary } from '../components/Summary';
import { PdfPreview } from '../components/PdfPreview';
import { SectionShell } from '../components/SectionShell';
import { ExtractionProgress, getSectionStatus } from '../components/ExtractionProgress';

export default function ReviewPage() {
  const params = useParams();
  const {
    cvData,
    isStreaming,
    setCvData,
    updateField,
    setStreaming,
  } = useCvBuilderStore();

  const router = useRouter();

  const { object, submit, isLoading, error } = useObject({
    api: '/api/extract',
    schema: extractionSchema,
  });

  usePdfPreview();

  useEffect(() => {
    if (params?.id) {
      fetch(`/api/candidates/${params.id}`)
        .then(res => res.json())
        .then(data => {
          // Already extracted — load data without triggering AI
          if (data.extracted_data && ['reviewing', 'ready', 'generated'].includes(data.status)) {
            setCvData(data.extracted_data);
            return;
          }
          // Not yet extracted — start extraction
          if (data.status === 'uploaded' || data.status === 'extracting') {
            setStreaming(true);
            submit({ candidateId: params.id });
          }
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  useEffect(() => {
    if (object) {
      setCvData(object as Partial<ExtractedCV>);
    }
  }, [object, setCvData]);

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

  // Section status helper
  const status = (field: keyof ExtractedCV) =>
    getSectionStatus(cvData, isLoading, field);

  if (!cvData && !isLoading) {
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
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary neon-ring">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                  <PanelLeft className="h-3 w-3 text-accent" />
                  CV Builder
                </div>
                <h1 className="text-lg font-semibold title-gradient">
                  {isLoading ? 'Extraction en cours...' : 'Édition du CV'}
                </h1>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => router.push('/')}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nouveau CV
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || !cvData}
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                Sauvegarder
              </Button>
            </div>
          </div>

          {/* Extraction progress */}
          <ExtractionProgress data={cvData} isStreaming={isLoading} />
        </div>

        {error && (
          <div className="mb-4 flex items-center rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" />
            {error.message}
          </div>
        )}

        {/* Split layout: form left, PDF right */}
        <div className="flex gap-4" style={{ height: 'calc(100vh - 200px)' }}>
          {/* Left: Form */}
          <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionShell status={status('personalInfo')} label="Extraction de l'identité...">
                <PersonalInfo
                  data={safeData?.personalInfo}
                  onChange={(val) => handleUpdate('personalInfo', val)}
                  readOnly={isLoading}
                />
              </SectionShell>
              <SectionShell status={status('summary')} label="Rédaction du résumé...">
                <Summary
                  data={safeData?.summary}
                  onChange={(val) => handleUpdate('summary', val)}
                  readOnly={isLoading}
                />
              </SectionShell>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionShell status={status('skills')} label="Analyse des compétences...">
                <Skills
                  data={safeSkills}
                  onChange={(val) => handleUpdate('skills', val)}
                  readOnly={isLoading}
                />
              </SectionShell>
              <SectionShell status={status('strengths')} label="Génération des points forts...">
                <Strengths
                  data={safeStrengths}
                  onChange={(val) => handleUpdate('strengths', val)}
                  readOnly={isLoading}
                />
              </SectionShell>
            </div>
            <SectionShell status={status('experiences')} label="Analyse des expériences...">
              <Experiences
                data={safeExperiences}
                onChange={(val) => handleUpdate('experiences', val)}
                readOnly={isLoading}
              />
            </SectionShell>
            <SectionShell status={status('education')} label="Extraction des formations...">
              <Education
                data={safeEducation}
                onChange={(val) => handleUpdate('education', val)}
                readOnly={isLoading}
              />
            </SectionShell>
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
