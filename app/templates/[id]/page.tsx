'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function normalizeTemplateConfig(raw: Partial<TemplateConfig>): TemplateConfig {
  return {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...raw,
    colors: { ...DEFAULT_TEMPLATE_CONFIG.colors, ...raw.colors },
    logo: { ...DEFAULT_TEMPLATE_CONFIG.logo, ...raw.logo },
    footer: { ...DEFAULT_TEMPLATE_CONFIG.footer, ...raw.footer },
    sections: raw.sections ?? DEFAULT_TEMPLATE_CONFIG.sections,
    exportFilePrefix: raw.exportFilePrefix ?? DEFAULT_TEMPLATE_CONFIG.exportFilePrefix,
  };
}
import { useTemplate, useUpdateTemplate } from '@/lib/queries';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';

// Sample CV data for preview
const SAMPLE_CV = {
  personalInfo: {
    firstName: 'Marie',
    lastName: 'Dupont',
    title: 'Développeuse Full Stack Senior',
    email: 'marie.dupont@email.com',
    phone: '06 12 34 56 78',
    location: 'Paris, France',
    yearsOfExperience: '8 ans',
    availability: 'Immédiate',
  },
  summary:
    'Développeuse full stack avec **8 ans d\'expérience** en conception et développement d\'applications web. Expertise en **React**, **Node.js** et **architectures cloud**. Passionnée par les bonnes pratiques et la qualité logicielle.',
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
  skills: {
    technologies: [
      { name: 'React', source: 'extracted' as const, starred: true, added: true },
      { name: 'TypeScript', source: 'extracted' as const, starred: true, added: true },
      { name: 'Node.js', source: 'extracted' as const, starred: true, added: true },
      { name: 'PostgreSQL', source: 'extracted' as const, starred: true, added: true },
      { name: 'AWS', source: 'inferred' as const, starred: true, added: true },
      { name: 'Docker', source: 'inferred' as const, starred: false, added: false },
      { name: 'Git', source: 'extracted' as const, starred: false, added: false },
    ],
    softSkills: [
      { name: 'Leadership', source: 'extracted' as const, starred: true, added: true },
      { name: 'Communication', source: 'inferred' as const, starred: false, added: false },
      { name: 'Esprit d\'équipe', source: 'inferred' as const, starred: false, added: false },
    ],
    expertises: [
      { name: 'Architecture microservices', source: 'extracted' as const, starred: true, added: true },
      { name: 'Cloud-native', source: 'inferred' as const, starred: true, added: true },
      { name: 'CI/CD', source: 'extracted' as const, starred: true, added: true },
    ],
    methodologies: [
      { name: 'Agile', source: 'extracted' as const, starred: true, added: true },
      { name: 'Scrum', source: 'extracted' as const, starred: true, added: true },
      { name: 'DevOps', source: 'inferred' as const, starred: false, added: false },
    ],
  },
};

const SECTION_LABELS: Record<string, string> = {
  summary: 'Synthèse du profil',
  skills: 'Compétences',
  education: 'Formations',
  experiences: 'Expériences',
};

export default function TemplateEditorPage() {
  const params = useParams();
  const templateId = params?.id as string;

  // React Query for template data
  const { data: template, isLoading } = useTemplate(templateId);
  const updateTemplateMutation = useUpdateTemplate();

  // Local editable state derived from query data
  const [localName, setLocalName] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<TemplateConfig | null>(null);

  // Derive current values: local edits override server data
  const name = localName ?? template?.name ?? '';
  const config =
    localConfig ?? (template?.config ? normalizeTemplateConfig(template.config as Partial<TemplateConfig>) : null);

  // PDF preview state
  const [pdfBlobUrl, setPdfBlobUrlRaw] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Revoke previous blob URL before setting new one (fixes leak)
  const setPdfBlobUrl = useCallback((url: string | null) => {
    setPdfBlobUrlRaw((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  usePdfPreview({
    data: config ? SAMPLE_CV : null,
    setPdfBlobUrl,
    setIsPdfLoading,
    templateConfigOverride: config,
  });

  const updateConfig = (patch: Partial<TemplateConfig>) => {
    if (!config) return;
    setLocalConfig({ ...config, ...patch });
  };

  const updateColors = (key: string, value: string) => {
    if (!config) return;
    updateConfig({
      colors: { ...config.colors, [key]: value },
    });
  };

  const updateFooter = (key: string, value: string) => {
    if (!config) return;
    updateConfig({
      footer: { ...config.footer, [key]: value },
    });
  };

  const updateLogo = (key: string, value: string | number) => {
    if (!config) return;
    updateConfig({
      logo: { ...config.logo, [key]: value },
    });
  };

  const handleSave = () => {
    if (!config) return;
    updateTemplateMutation.mutate(
      { id: templateId, name, config },
      {
        onSuccess: () => toast.success('Template sauvegardé'),
        onError: () => toast.error('Erreur lors de la sauvegarde'),
      },
    );
  };

  const handleSetDefault = () => {
    updateTemplateMutation.mutate(
      { id: templateId, is_default: true },
      {
        onSuccess: () => toast.success('Défini comme template par défaut'),
        onError: () => toast.error('Erreur'),
      },
    );
  };

  // Section drag & drop
  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || !config) return;
    const newSections = [...config.sections];
    const [moved] = newSections.splice(dragIndex, 1);
    newSections.splice(index, 0, moved);
    updateConfig({ sections: newSections });
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  if (isLoading || !config) {
    return (
      <div className="flex h-full items-center justify-center text-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Chargement...
      </div>
    );
  }

  const isDefault = template?.is_default ?? false;

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-col px-4 py-4 md:px-6">
        {/* Top bar */}
        <div className="mb-4 rounded-2xl glass-panel p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: config.colors.primary }}
              >
                <span
                  className="block h-4 w-4 rounded"
                  style={{ backgroundColor: config.colors.secondary }}
                />
              </div>
              <div>
                <Input
                  value={name}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="h-7 border-none bg-transparent px-0 text-lg font-semibold text-foreground focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="flex gap-2">
              {!isDefault && (
                <Button variant="outline" size="sm" onClick={handleSetDefault} disabled={updateTemplateMutation.isPending}>
                  <Star className="mr-1.5 h-3.5 w-3.5" />
                  Défaut
                </Button>
              )}
              {isDefault && (
                <Badge variant="secondary" className="self-center">
                  <Star className="mr-1 h-3 w-3" /> Par défaut
                </Badge>
              )}
              <Button size="sm" onClick={handleSave} disabled={updateTemplateMutation.isPending}>
                {updateTemplateMutation.isPending ? (
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
                      value={config.colors[key as keyof typeof config.colors]}
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
                    value={config.footer.line1}
                    onChange={(e) => updateFooter('line1', e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Ligne 2</Label>
                  <Input
                    value={config.footer.line2}
                    onChange={(e) => updateFooter('line2', e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Logo PDF */}
            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Logo en-tête PDF</h3>
              <p className="mb-2 text-[10px] text-muted-foreground">
                URL publique (ex. fichier hébergé). Laisser vide pour le logo graphique par défaut.
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">URL</Label>
                  <Input
                    value={config.logo.url}
                    onChange={(e) => updateLogo('url', e.target.value)}
                    placeholder="https://…"
                    className="mt-1 font-mono text-[11px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Largeur (px)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.logo.width}
                      onChange={(e) => updateLogo('width', Number(e.target.value) || 90)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hauteur (px)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.logo.height}
                      onChange={(e) => updateLogo('height', Number(e.target.value) || 20)}
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Export filename */}
            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Export PDF</h3>
              <p className="mb-2 text-[10px] text-muted-foreground">
                Préfixe des noms de fichier pour les CV générés avec ce gabarit (caractères spéciaux exclus côté serveur).
              </p>
              <div>
                <Label className="text-xs">Préfixe</Label>
                <Input
                  value={config.exportFilePrefix ?? 'CV'}
                  onChange={(e) => updateConfig({ exportFilePrefix: e.target.value })}
                  placeholder="CV"
                  className="mt-1 max-w-xs text-xs"
                />
              </div>
            </div>

            {/* Sections order */}
            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Ordre des sections</h3>
              <p className="mb-2 text-[10px] text-muted-foreground">Glisser pour réordonner</p>
              <div className="space-y-1">
                {config.sections.map((section, index) => (
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
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="flex items-center text-sm font-semibold text-foreground">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  Aperçu avec données d&apos;exemple
                </h2>
              </div>
              <div className="relative flex-1 bg-shell">
                {isPdfLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-shell/70">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                {pdfBlobUrl ? (
                  <iframe src={pdfBlobUrl} className="h-full w-full" title="Template Preview" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <FileText className="mb-2 h-10 w-10" />
                    <p className="text-sm">L&apos;aperçu apparaîtra ici</p>
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
