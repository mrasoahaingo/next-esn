'use client';

import { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, GripVertical, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  DEFAULT_TEMPLATE_CONFIG,
  type TemplateBlock,
  type TemplateBlockType,
  type TemplateConfig,
} from '@/lib/schema';
import { usePdfPreview } from '@/lib/hooks/usePdfPreview';
import { useTemplate, useUpdateTemplate } from '@/lib/queries';
import { normalizeTemplateConfig } from '@/lib/utils/template';

const SAMPLE_CV = {
  personalInfo: {
    firstName: 'Sonia',
    lastName: 'Benhamou',
    title: 'Lead Developpeuse Java / React',
    email: 'sonia.benhamou@email.com',
    phone: '06 18 42 57 90',
    location: 'Paris / Remote hybride',
    yearsOfExperience: '11 ans',
    availability: 'Preavis 1 mois',
  },
  summary:
    "Consultante full stack avec **11 ans d'experience** en delivery de plateformes B2B et SI critiques pour des contextes **retail**, **banque** et **energie**. Expertise en **Java / Spring Boot**, **React**, **TypeScript**, **AWS** et modernisation d'applications legacy. Habitude des environnements ESN avec pilotage technique, cadrage, accompagnement d'equipe et forte attention a la qualite, la maintenabilite et la tenue des engagements client.",
  experiences: [
    {
      role: 'Lead Developpeuse Java / React',
      company: 'Groupe Retail Europe',
      companyDomain: 'carrefour.com',
      location: 'Paris',
      startDate: 'Fev 2022',
      endDate: '',
      isCurrent: true,
      description: [
        "Pilotage technique d'une squad de 7 personnes sur la refonte du portail fournisseurs europeen.",
        'Decoupage progressif du monolithe vers une architecture de services Spring Boot exposes via API Gateway.',
        "Mise en place d'un front React / TypeScript mutualise avec design system, feature flags et monitoring produit.",
        'Cadrage des chantiers transverses avec le client, priorisation backlog et accompagnement des mises en production.',
      ],
      skills: ['Java 21', 'Spring Boot', 'React', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker', 'GitHub Actions'],
    },
    {
      role: 'Referente technique Full Stack',
      company: 'Banque de financement',
      companyDomain: 'societegenerale.com',
      location: 'La Defense',
      startDate: 'Jan 2020',
      endDate: 'Jan 2022',
      isCurrent: false,
      description: [
        "Conception et developpement d'une plateforme interne de suivi des risques et de production de reportings reglementaires.",
        "Refonte de modules AngularJS vers React et exposition de services REST securises avec OAuth2.",
        'Animation des revues de code, industrialisation Sonar / quality gates et support recette metier.',
      ],
      skills: ['Java', 'Spring', 'React', 'Redux', 'Oracle', 'Kafka', 'Jenkins', 'SonarQube'],
    },
    {
      role: 'Developpeuse Full Stack',
      company: 'Operateur energie',
      companyDomain: 'edf.fr',
      location: 'Lyon',
      startDate: 'Juin 2016',
      endDate: 'Dec 2019',
      isCurrent: false,
      description: [
        "Developpement d'applications de supervision et d'outils internes pour les equipes d'exploitation.",
        'Participation a la migration progressive vers des stacks cloud-ready et conteneurisees.',
        "Contribution aux ateliers d'architecture, documentation technique et transfert de competences vers les equipes internes.",
      ],
      skills: ['Node.js', 'React', 'TypeScript', 'MongoDB', 'Docker', 'Kubernetes', 'Azure DevOps'],
    },
    {
      role: 'Ingenieure etudes et developpement',
      company: 'ESN nationale',
      location: 'Paris',
      startDate: 'Sept 2013',
      endDate: 'Mai 2016',
      isCurrent: false,
      description: [
        'Interventions en TMA evolutive et corrective sur plusieurs applications metier Java.',
        'Developpement de nouveaux modules, correction de bugs de production et support utilisateurs niveau 3.',
      ],
      skills: ['Java', 'Spring MVC', 'JavaScript', 'SQL', 'Maven'],
    },
  ],
  education: [
    { degree: 'Master 2 Genie Logiciel', school: 'Universite Paris-Saclay', year: '2013' },
    { degree: 'Licence Informatique', school: 'Universite d Evry', year: '2011' },
  ],
  skills: {
    technologies: [
      { name: 'Java', source: 'extracted' as const, starred: true, added: true },
      { name: 'Spring Boot', source: 'extracted' as const, starred: true, added: true },
      { name: 'React', source: 'extracted' as const, starred: true, added: true },
      { name: 'TypeScript', source: 'extracted' as const, starred: true, added: true },
      { name: 'Node.js', source: 'extracted' as const, starred: false, added: true },
      { name: 'PostgreSQL', source: 'extracted' as const, starred: true, added: true },
      { name: 'AWS', source: 'inferred' as const, starred: true, added: true },
      { name: 'Docker', source: 'inferred' as const, starred: true, added: true },
      { name: 'Kubernetes', source: 'inferred' as const, starred: false, added: true },
      { name: 'Kafka', source: 'extracted' as const, starred: false, added: true },
    ],
    softSkills: [
      { name: 'Leadership', source: 'extracted' as const, starred: true, added: true },
      { name: 'Communication client', source: 'inferred' as const, starred: true, added: true },
      { name: 'Mentorat', source: 'inferred' as const, starred: false, added: true },
      { name: 'Animation dateliers', source: 'inferred' as const, starred: false, added: true },
    ],
    expertises: [
      { name: 'Architecture microservices', source: 'extracted' as const, starred: true, added: true },
      { name: 'Modernisation legacy', source: 'inferred' as const, starred: true, added: true },
      { name: 'Cloud-native', source: 'inferred' as const, starred: true, added: true },
      { name: 'CI/CD', source: 'extracted' as const, starred: true, added: true },
      { name: 'Cadrage technique', source: 'inferred' as const, starred: false, added: true },
    ],
    methodologies: [
      { name: 'Agile', source: 'extracted' as const, starred: true, added: true },
      { name: 'Scrum', source: 'extracted' as const, starred: true, added: true },
      { name: 'Kanban', source: 'inferred' as const, starred: false, added: true },
      { name: 'TDD', source: 'inferred' as const, starred: false, added: true },
      { name: 'DevOps', source: 'inferred' as const, starred: false, added: true },
    ],
  },
};

const BLOCK_LABELS: Record<TemplateBlockType, string> = {
  'profile-info': 'Infos profil',
  summary: 'Synthese',
  skills: 'Competences',
  education: 'Formations',
  experiences: 'Experiences',
};

const BLOCK_VARIANT_OPTIONS: Record<TemplateBlockType, Array<{ value: TemplateBlock['variant']; label: string }>> = {
  'profile-info': [
    { value: 'default', label: 'Standard' },
    { value: 'detailed', label: 'Detaille' },
  ],
  summary: [{ value: 'default', label: 'Standard' }],
  skills: [
    { value: 'default', label: 'Standard' },
    { value: 'compact', label: 'Compact' },
  ],
  education: [
    { value: 'default', label: 'Standard' },
    { value: 'compact', label: 'Compact' },
  ],
  experiences: [
    { value: 'detailed', label: 'Detaille' },
    { value: 'compact', label: 'Compact' },
  ],
};

function getVariantValue(block: TemplateBlock): string {
  if (block.variant) return block.variant;
  return block.type === 'experiences' ? 'detailed' : 'default';
}

export default function TemplateEditorPage() {
  const params = useParams();
  const templateId = params?.id as string;
  const { data: template, isLoading } = useTemplate(templateId);
  const updateTemplateMutation = useUpdateTemplate();
  const [localName, setLocalName] = useState<string | null>(null);
  const [localConfig, setLocalConfig] = useState<TemplateConfig | null>(null);
  const [pdfBlobUrl, setPdfBlobUrlRaw] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const name = localName ?? template?.name ?? '';
  const config = localConfig ?? (template?.config ? normalizeTemplateConfig(template.config) : null);

  const setPdfBlobUrl = useCallback((url: string | null) => {
    setPdfBlobUrlRaw((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }, []);

  usePdfPreview({
    data: config ? SAMPLE_CV : null,
    setPdfBlobUrl,
    setIsPdfLoading,
    templateConfigOverride: config,
  });

  const updateConfig = (patch: Partial<TemplateConfig>) => {
    if (!config) return;
    setLocalConfig(normalizeTemplateConfig({ ...config, ...patch }));
  };

  const updateBlock = (index: number, patch: Partial<TemplateBlock>) => {
    if (!config) return;
    const blocks = config.blocks.map((block, currentIndex) =>
      currentIndex === index ? { ...block, ...patch } : block,
    );
    updateConfig({ blocks });
  };

  const handleSave = () => {
    if (!config) return;
    updateTemplateMutation.mutate(
      { id: templateId, name, config },
      {
        onSuccess: () => toast.success('Template sauvegarde'),
        onError: () => toast.error('Erreur lors de la sauvegarde'),
      },
    );
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || !config) return;
    const next = [...config.blocks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    updateConfig({ blocks: next });
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
        <div className="mb-4 rounded-2xl glass-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: config.colors.primary }}
              >
                <span
                  className="block h-4 w-4 rounded"
                  style={{ backgroundColor: config.colors.secondary }}
                />
              </div>
              <Input
                value={name}
                onChange={(e) => setLocalName(e.target.value)}
                className="h-7 border-none bg-transparent px-0 text-lg font-semibold text-foreground focus-visible:ring-0"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="template-is-default" className="text-xs text-muted-foreground whitespace-nowrap">
                  Gabarit de repli (plateforme)
                </Label>
                <Switch
                  id="template-is-default"
                  size="sm"
                  checked={isDefault}
                  onCheckedChange={(checked) => {
                    updateTemplateMutation.mutate(
                      { id: templateId, is_default: checked },
                      {
                        onSuccess: () =>
                          toast.success(
                            checked
                              ? 'Gabarit defini comme repli plateforme'
                              : 'Ce gabarit n’est plus le repli plateforme',
                          ),
                        onError: () => toast.error('Erreur'),
                      },
                    );
                  }}
                  disabled={updateTemplateMutation.isPending}
                />
              </div>
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

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <div className="w-full space-y-4 overflow-y-auto pr-0 lg:w-1/2 lg:pr-2">
            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Theme global</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'primary', label: 'Principale' },
                    { key: 'secondary', label: 'Secondaire' },
                    { key: 'background', label: 'Fond' },
                    { key: 'text', label: 'Texte' },
                    { key: 'lightText', label: 'Texte secondaire' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={config.colors[key as keyof typeof config.colors]}
                        onChange={(e) =>
                          updateConfig({
                            colors: { ...config.colors, [key]: e.target.value },
                          })
                        }
                        className="h-8 w-8 min-w-8 cursor-pointer rounded border border-border bg-transparent p-0 shadow-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-moz-color-swatch]:rounded-md"
                      />
                      <Label className="text-xs">{label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Entete</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Nom societe</Label>
                  <Input
                    value={config.header.companyName}
                    onChange={(e) =>
                      updateConfig({ header: { ...config.header, companyName: e.target.value } })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Titre du document</Label>
                  <Input
                    value={config.header.documentTitle}
                    onChange={(e) =>
                      updateConfig({ header: { ...config.header, documentTitle: e.target.value } })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Ligne secondaire</Label>
                  <Input
                    value={config.header.tagLine}
                    onChange={(e) =>
                      updateConfig({ header: { ...config.header, tagLine: e.target.value } })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Ligne meta</Label>
                  <Input
                    value={config.header.metaLine}
                    onChange={(e) =>
                      updateConfig({ header: { ...config.header, metaLine: e.target.value } })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={config.header.showCandidateName}
                    onCheckedChange={(checked) =>
                      updateConfig({
                        header: { ...config.header, showCandidateName: checked === true },
                      })
                    }
                  />
                  <Label className="text-xs">Afficher le nom du consultant dans l&apos;entete</Label>
                </div>
              </div>
            </div>

            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Logo en-tete PDF</h3>
              <p className="mb-2 text-[10px] text-muted-foreground">
                SVG colle (converti en image pour le PDF), sinon URL publique, sinon le logo par defaut.
              </p>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Code SVG (optionnel)</Label>
                  <Textarea
                    value={config.logo.svgInline ?? ''}
                    onChange={(e) =>
                      updateConfig({
                        logo: { ...config.logo, svgInline: e.target.value || undefined },
                      })
                    }
                    placeholder={'Coller ici le fichier .svg (balise <svg>...)'}
                    rows={5}
                    className="mt-1 max-h-48 min-h-20 resize-y overflow-y-auto font-mono text-[11px]"
                  />
                </div>
                <div>
                  <Label className="text-xs">URL du logo</Label>
                  <Input
                    value={config.logo.url}
                    onChange={(e) => updateConfig({ logo: { ...config.logo, url: e.target.value } })}
                    placeholder="https://..."
                    className="mt-1 font-mono text-[11px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Largeur</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.logo.width}
                      onChange={(e) =>
                        updateConfig({
                          logo: { ...config.logo, width: Number(e.target.value) || DEFAULT_TEMPLATE_CONFIG.logo.width },
                        })
                      }
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hauteur</Label>
                    <Input
                      type="number"
                      min={1}
                      value={config.logo.height}
                      onChange={(e) =>
                        updateConfig({
                          logo: { ...config.logo, height: Number(e.target.value) || DEFAULT_TEMPLATE_CONFIG.logo.height },
                        })
                      }
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Pied de page</h3>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Colonne gauche</Label>
                  <Input
                    value={config.footer.leftText}
                    onChange={(e) =>
                      updateConfig({ footer: { ...config.footer, leftText: e.target.value } })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Colonne centre</Label>
                  <Input
                    value={config.footer.centerText}
                    onChange={(e) =>
                      updateConfig({ footer: { ...config.footer, centerText: e.target.value } })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Colonne droite</Label>
                  <Input
                    value={config.footer.rightText}
                    onChange={(e) =>
                      updateConfig({ footer: { ...config.footer, rightText: e.target.value } })
                    }
                    className="mt-1 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Export PDF</h3>
              <div>
                <Label className="text-xs">Prefixe</Label>
                <Input
                  value={config.exportFilePrefix ?? 'CV'}
                  onChange={(e) => updateConfig({ exportFilePrefix: e.target.value })}
                  placeholder="CV"
                  className="mt-1 max-w-xs text-xs"
                />
              </div>
            </div>

            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Blocs</h3>
              <p className="mb-2 text-[10px] text-muted-foreground">
                Active, desactive et reordonne les blocs du document.
              </p>
              <div className="space-y-2">
                {config.blocks.map((block, index) => (
                  <div
                    key={`${block.type}-${index}`}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-lg border border-border bg-card/50 px-3 py-3 transition ${
                      dragIndex === index ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <GripVertical className="mt-1 h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                      <div className="flex min-w-0 flex-1 flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={block.enabled}
                            onCheckedChange={(checked) =>
                              updateBlock(index, { enabled: checked === true })
                            }
                          />
                          <span className="text-xs font-medium text-foreground">
                            {BLOCK_LABELS[block.type]}
                          </span>
                        </div>
                        <div>
                          <Label className="text-[10px]">Variante</Label>
                          <Select
                            value={getVariantValue(block)}
                            onValueChange={(value) =>
                              updateBlock(index, { variant: value as TemplateBlock['variant'] })
                            }
                          >
                            <SelectTrigger className="mt-1 w-full text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {BLOCK_VARIANT_OPTIONS[block.type].map((option) => (
                                <SelectItem key={option.value} value={option.value ?? 'default'}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl glass-panel p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Notes</h3>
              <Textarea
                value={`Blocs actifs: ${config.blocks.filter((block) => block.enabled).map((block) => BLOCK_LABELS[block.type]).join(', ')}`}
                readOnly
                className="min-h-20 resize-none text-[11px] text-muted-foreground"
              />
            </div>
          </div>

          <div className="sticky top-0 w-full lg:w-1/2">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl glass-panel">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="flex items-center text-sm font-semibold text-foreground">
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  Apercu avec donnees d&apos;exemple
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
                    <p className="text-sm">L&apos;apercu apparaitra ici</p>
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
