'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Save,
  FileText,
  GripVertical,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TemplateConfig } from '@/lib/schema';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';

// Sample CV data for preview
const SAMPLE_CV = {
  personalInfo: {
    firstName: 'Marie',
    lastName: 'Dupont',
    title: 'Développeuse Full Stack Senior',
    email: 'marie.dupont@email.com',
    phone: '06 12 34 56 78',
    location: 'Paris, France',
  },
  summary:
    'Développeuse full stack avec 8 ans d\'expérience en conception et développement d\'applications web. Expertise en React, Node.js et architectures cloud. Passionnée par les bonnes pratiques et la qualité logicielle.',
  experiences: [
    {
      role: 'Lead Développeuse Full Stack',
      company: 'TechCorp',
      companyDomain: 'techcorp.com',
      location: 'Paris',
      startDate: 'Jan 2021',
      endDate: '',
      isCurrent: true,
      description: [
        'Pilotage technique d\'une équipe de 5 développeurs',
        'Migration d\'une architecture monolithique vers des microservices',
        'Mise en place de CI/CD avec GitHub Actions',
      ],
    },
    {
      role: 'Développeuse Full Stack',
      company: 'WebAgency',
      location: 'Lyon',
      startDate: 'Mars 2017',
      endDate: 'Déc 2020',
      isCurrent: false,
      description: [
        'Développement d\'applications React / Node.js',
        'Intégration d\'APIs REST et GraphQL',
      ],
    },
  ],
  education: [
    { degree: 'Master Informatique', school: 'Université Paris-Saclay', year: '2016' },
  ],
  skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker', 'Git'],
  strengths: [
    'Leadership technique et mentorat d\'équipe',
    'Expertise en architectures scalables et cloud-native',
    'Forte capacité d\'analyse et résolution de problèmes complexes',
    'Communication efficace avec les parties prenantes métier',
  ],
};

const SECTION_LABELS: Record<string, string> = {
  strengths: 'Synthèse',
  summary: 'Résumé professionnel',
  skills: 'Compétences techniques',
  experiences: 'Expériences',
  education: 'Formations',
};

interface TemplateData {
  id: string;
  name: string;
  config: TemplateConfig;
  is_default: boolean;
}

export default function TemplateEditorPage() {
  const params = useParams();
  const templateId = params?.id as string;

  const [template, setTemplate] = useState<TemplateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // PDF preview
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Load template
  useEffect(() => {
    fetch(`/api/templates/${templateId}`)
      .then((res) => res.json())
      .then((data) => {
        const config = {
          ...DEFAULT_TEMPLATE_CONFIG,
          ...data.config,
          colors: { ...DEFAULT_TEMPLATE_CONFIG.colors, ...data.config?.colors },
          logo: { ...DEFAULT_TEMPLATE_CONFIG.logo, ...data.config?.logo },
          footer: { ...DEFAULT_TEMPLATE_CONFIG.footer, ...data.config?.footer },
          sections: data.config?.sections ?? DEFAULT_TEMPLATE_CONFIG.sections,
        };
        setTemplate({ ...data, config });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [templateId]);

  // PDF preview with debounce
  const refreshPreview = useCallback((config: TemplateConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsPdfLoading(true);
      try {
        const res = await fetch('/api/pdf-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: SAMPLE_CV, templateConfig: config }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('PDF generation failed');
        const blob = await res.blob();
        setPdfBlobUrl(URL.createObjectURL(blob));
      } catch (e) {
        if ((e as Error).name !== 'AbortError') console.error(e);
      } finally {
        if (!controller.signal.aborted) setIsPdfLoading(false);
      }
    }, 600);
  }, []);

  // Trigger preview on template change
  useEffect(() => {
    if (template) refreshPreview(template.config);
  }, [template, refreshPreview]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const updateConfig = (patch: Partial<TemplateConfig>) => {
    if (!template) return;
    setTemplate({
      ...template,
      config: { ...template.config, ...patch },
    });
  };

  const updateColors = (key: string, value: string) => {
    if (!template) return;
    updateConfig({
      colors: { ...template.config.colors, [key]: value },
    });
  };

  const updateFooter = (key: string, value: string) => {
    if (!template) return;
    updateConfig({
      footer: { ...template.config.footer, [key]: value },
    });
  };

  const handleSave = async () => {
    if (!template) return;
    setIsSaving(true);
    try {
      await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: template.name, config: template.config }),
      });
      toast.success('Template sauvegardé');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async () => {
    if (!template) return;
    try {
      await fetch(`/api/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      setTemplate({ ...template, is_default: true });
      toast.success('Défini comme template par défaut');
    } catch {
      toast.error('Erreur');
    }
  };

  // Section drag & drop
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || !template) return;
    const newSections = [...template.config.sections];
    const [moved] = newSections.splice(dragIndex, 1);
    newSections.splice(index, 0, moved);
    updateConfig({ sections: newSections });
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  if (isLoading || !template) {
    return (
      <div className="flex h-full items-center justify-center text-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col px-4 py-4 md:px-6">
        {/* Top bar */}
        <div className="mb-4 rounded-2xl glass-panel p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: template.config.colors.primary }}
              >
                <span
                  className="block h-4 w-4 rounded"
                  style={{ backgroundColor: template.config.colors.secondary }}
                />
              </div>
              <div>
                <Input
                  value={template.name}
                  onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                  className="h-7 border-none bg-transparent px-0 text-lg font-semibold text-foreground focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {!template.is_default && (
                <Button variant="outline" size="sm" onClick={handleSetDefault}>
                  <Star className="mr-1.5 h-3.5 w-3.5" />
                  Défaut
                </Button>
              )}
              {template.is_default && (
                <Badge variant="secondary" className="self-center">
                  <Star className="mr-1 h-3 w-3" /> Par défaut
                </Badge>
              )}
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>

        {/* Split layout */}
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Left: Config form */}
          <div className="w-1/2 overflow-y-auto pr-2 space-y-4">
            {/* Colors */}
            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Couleurs</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'primary', label: 'Principale' },
                  { key: 'secondary', label: 'Secondaire' },
                  { key: 'background', label: 'Fond' },
                  { key: 'text', label: 'Texte' },
                  { key: 'lightText', label: 'Texte léger' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={template.config.colors[key as keyof typeof template.config.colors]}
                      onChange={(e) => updateColors(key, e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent"
                    />
                    <Label className="text-xs">{label}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Pied de page</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Ligne 1</Label>
                  <Input
                    value={template.config.footer.line1}
                    onChange={(e) => updateFooter('line1', e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Ligne 2</Label>
                  <Input
                    value={template.config.footer.line2}
                    onChange={(e) => updateFooter('line2', e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Sections order */}
            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Ordre des sections</h3>
              <p className="mb-2 text-[10px] text-muted-foreground">Glisser pour réordonner</p>
              <div className="space-y-1">
                {template.config.sections.map((section, index) => (
                  <div
                    key={section}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-xs cursor-grab active:cursor-grabbing transition ${
                      dragIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-foreground">{SECTION_LABELS[section] ?? section}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: PDF preview */}
          <div className="w-1/2 sticky top-0">
            <div className="flex h-full flex-col rounded-2xl glass-panel overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="flex items-center text-sm font-semibold text-white">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  Aperçu avec données d'exemple
                </h2>
              </div>
              <div className="relative flex-1 bg-[#0a0d16]">
                {isPdfLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0d16]/70">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {pdfBlobUrl ? (
                  <iframe src={pdfBlobUrl} className="h-full w-full" title="Template Preview" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <FileText className="mb-2 h-10 w-10" />
                    <p className="text-sm">L'aperçu apparaîtra ici</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
