'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useOrgRole } from '@/lib/hooks/useOrgRole';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { useOrgBranding } from '@/components/org-branding-provider';
import { useOrgSettings } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_MATCHING_WEIGHTS,
  mergeMatchingWeights,
  type MatchingWeightsConfig,
} from '@/lib/config/matching-weights';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SettingsForm = {
  display_name: string;
  contact_email: string;
  website_url: string;
  app_logo_url: string;
  positioning_brand_context: string;
  matching: MatchingWeightsConfig;
  explicitWeightsText: string;
};

const emptyForm: SettingsForm = {
  display_name: '',
  contact_email: '',
  website_url: '',
  app_logo_url: '',
  positioning_brand_context: '',
  matching: { ...DEFAULT_MATCHING_WEIGHTS },
  explicitWeightsText: '',
};

export default function OrganizationSettingsPage() {
  const { orgId } = useAuth();
  const { isOrgAdmin, isLoaded: roleLoaded } = useOrgRole();
  const { isSuperAdmin } = useSuperAdmin();
  const canManage = isOrgAdmin || isSuperAdmin;
  const { refetch: refetchBranding } = useOrgBranding();

  const { data: settings, isPending, isError } = useOrgSettings();

  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const seededForOrg = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!orgId) return;
    if (!settings) return;
    if (seededForOrg.current === orgId) return;
    seededForOrg.current = orgId;
    const mw = mergeMatchingWeights(settings.matching_weights);
    setForm({
      display_name: settings.display_name ?? '',
      contact_email: settings.contact_email ?? '',
      website_url: settings.website_url ?? '',
      app_logo_url: settings.app_logo_url ?? '',
      positioning_brand_context: settings.positioning_brand_context ?? '',
      matching: mw,
      explicitWeightsText: mw.recencyExplicitWeights?.join(', ') ?? '',
    });
  }, [orgId, settings]);

  if (roleLoaded && !canManage) {
    redirect('/dashboard');
  }

  const loading = !!orgId && isPending && !settings;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/org/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          contact_email: form.contact_email,
          website_url: form.website_url,
          app_logo_url: form.app_logo_url,
          positioning_brand_context: form.positioning_brand_context,
          matching_weights: {
            ...form.matching,
            recencyExplicitWeights:
              form.matching.recencyMode === 'explicit' && form.explicitWeightsText.trim()
                ? form.explicitWeightsText
                    .split(/[,;]+/)
                    .map((s) => parseFloat(s.trim()))
                    .filter((n) => !Number.isNaN(n))
                : undefined,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? 'Erreur serveur');
      }
      const data = await res.json();
      const mw = mergeMatchingWeights(data.matching_weights);
      setForm((prev) => ({
        ...prev,
        ...data,
        display_name: data.display_name ?? '',
        contact_email: data.contact_email ?? '',
        website_url: data.website_url ?? '',
        app_logo_url: data.app_logo_url ?? '',
        positioning_brand_context: data.positioning_brand_context ?? '',
        matching: mw,
        explicitWeightsText: mw.recencyExplicitWeights?.join(', ') ?? '',
      }));
      toast.success('Paramètres enregistrés');
      await refetchBranding();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const contactEmailInvalid =
    form.contact_email.trim().length > 0 &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim());

  async function handleLogoFile(file: File | null) {
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/org/settings/logo', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Upload échoué');
      }
      const { url, settings: nextSettings } = await res.json();
      setForm((p) => ({
        ...p,
        app_logo_url: url ?? nextSettings?.app_logo_url ?? p.app_logo_url,
      }));
      toast.success('Logo application mis à jour');
      await refetchBranding();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingLogo(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/15 text-violet">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="title-gradient inline-block text-2xl font-bold">Organisation</h1>
            <p className="text-sm text-muted-foreground">
              Identité dans l&apos;app et contexte IA — le rendu PDF du CV se configure dans les{' '}
              <span className="text-foreground">Templates</span>.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Impossible de charger les paramètres</p>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-8">
            <div className="rounded-xl glass-panel flex flex-col gap-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Identité</h2>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="display_name" className="text-xs text-muted-foreground">
                    Nom affiché dans l&apos;application
                  </FieldLabel>
                  <Input
                    id="display_name"
                    value={form.display_name}
                    onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                    placeholder="Laissez vide pour utiliser le nom Clerk"
                    className="h-9 text-sm"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={contactEmailInvalid ? true : undefined}>
                    <FieldLabel htmlFor="contact_email" className="text-xs text-muted-foreground">
                      Email de contact
                    </FieldLabel>
                    <Input
                      id="contact_email"
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                      placeholder="contact@entreprise.fr"
                      className="h-9 text-sm"
                      aria-invalid={contactEmailInvalid}
                    />
                    {contactEmailInvalid && (
                      <FieldError>Format d&apos;email invalide</FieldError>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="website_url" className="text-xs text-muted-foreground">
                      Site web
                    </FieldLabel>
                    <Input
                      id="website_url"
                      type="url"
                      value={form.website_url}
                      onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))}
                      placeholder="https://www.entreprise.fr"
                      className="h-9 text-sm"
                    />
                  </Field>
                </div>
              </FieldGroup>
            </div>

            <div className="rounded-xl glass-panel flex flex-col gap-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Logo application</h2>
              <p className="text-xs text-muted-foreground">
                Barre latérale uniquement. PNG, JPEG, WebP ou SVG — max 2 Mo.
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    disabled={uploadingLogo}
                    onClick={() => document.getElementById('logo-app-file')?.click()}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Envoyer un fichier
                  </Button>
                  <Input
                    id="logo-app-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={(e) => {
                      handleLogoFile(e.target.files?.[0] ?? null);
                      e.target.value = '';
                    }}
                  />
                </div>
                <Input
                  value={form.app_logo_url}
                  onChange={(e) => setForm((p) => ({ ...p, app_logo_url: e.target.value }))}
                  placeholder="Ou URL publique du logo"
                  className="h-9 font-mono text-xs"
                />
              </div>
            </div>

            <div className="rounded-xl glass-panel flex flex-col gap-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">IA — positionnement</h2>
              <p className="text-xs text-muted-foreground">
                Texte injecté en tête des prompts d&apos;analyse et de génération (métier, ton, signature
                d&apos;équipe…).
              </p>
              <Field>
                <FieldLabel htmlFor="positioning_brand_context" className="sr-only">
                  Contexte marque pour l&apos;IA
                </FieldLabel>
                <Textarea
                  id="positioning_brand_context"
                  value={form.positioning_brand_context}
                  onChange={(e) => setForm((p) => ({ ...p, positioning_brand_context: e.target.value }))}
                  placeholder="Ex. : Nous sommes une ESN française spécialisée dans le placement de consultants IT."
                  rows={6}
                  className="min-h-[120px] resize-y text-sm"
                />
              </Field>
            </div>

            <div className="rounded-xl glass-panel flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Pondération du matching</h2>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Paramètres par organisation pour l&apos;analyse CV ↔ fiche : les missions récentes peuvent
                    compter plus que les anciennes (sortie de poste similaire, mission précédente).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 text-xs"
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      matching: { ...DEFAULT_MATCHING_WEIGHTS },
                      explicitWeightsText: '',
                    }))
                  }
                >
                  Défauts
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-overlay/10 bg-overlay/[0.04] px-3 py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="recency-enabled" className="text-sm font-medium text-foreground">
                    Pondération par récence des expériences
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Si désactivé, aucun poids automatique par ancienneté de poste n&apos;est injecté dans les
                    prompts.
                  </p>
                </div>
                <Switch
                  id="recency-enabled"
                  checked={form.matching.experienceRecencyEnabled}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({
                      ...p,
                      matching: { ...p.matching, experienceRecencyEnabled: checked },
                    }))
                  }
                />
              </div>

              {form.matching.experienceRecencyEnabled && (
                <div className="flex flex-col gap-4">
                  <Field>
                    <FieldLabel className="text-xs text-muted-foreground">Mode de calcul des poids</FieldLabel>
                    <Select
                      value={form.matching.recencyMode}
                      onValueChange={(v: string | null) => {
                        if (v === 'exponential' || v === 'explicit') {
                          setForm((p) => ({
                            ...p,
                            matching: { ...p.matching, recencyMode: v },
                          }));
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 w-full max-w-md text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exponential">Décroissance exponentielle (facteur + plancher)</SelectItem>
                        <SelectItem value="explicit">Poids explicites par rang (liste)</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  {form.matching.recencyMode === 'exponential' ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="recency-decay" className="text-xs text-muted-foreground">
                          Facteur par rang (0,1–0,99)
                        </FieldLabel>
                        <Input
                          id="recency-decay"
                          type="number"
                          step={0.01}
                          min={0.1}
                          max={0.99}
                          value={form.matching.recencyDecayPerRank}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value);
                            setForm((p) => ({
                              ...p,
                              matching: {
                                ...p.matching,
                                recencyDecayPerRank: Number.isNaN(n)
                                  ? p.matching.recencyDecayPerRank
                                  : Math.min(0.99, Math.max(0.1, n)),
                              },
                            }));
                          }}
                          className="h-9 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Poids relatif du rang suivant (ex. 0,74 : chaque poste plus ancien vaut ~74 % du
                          précédent).
                        </p>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="recency-floor" className="text-xs text-muted-foreground">
                          Plancher (0–1)
                        </FieldLabel>
                        <Input
                          id="recency-floor"
                          type="number"
                          step={0.01}
                          min={0}
                          max={1}
                          value={form.matching.recencyWeightFloor}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value);
                            setForm((p) => ({
                              ...p,
                              matching: {
                                ...p.matching,
                                recencyWeightFloor: Number.isNaN(n)
                                  ? p.matching.recencyWeightFloor
                                  : Math.min(1, Math.max(0, n)),
                              },
                            }));
                          }}
                          className="h-9 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Minimum pour les postes très anciens.
                        </p>
                      </Field>
                    </div>
                  ) : (
                    <Field>
                      <FieldLabel htmlFor="recency-explicit" className="text-xs text-muted-foreground">
                        Poids par rang (séparés par des virgules)
                      </FieldLabel>
                      <Textarea
                        id="recency-explicit"
                        value={form.explicitWeightsText}
                        onChange={(e) => setForm((p) => ({ ...p, explicitWeightsText: e.target.value }))}
                        placeholder="1, 0.85, 0.7, 0.55, 0.4"
                        rows={3}
                        className="font-mono text-xs resize-y min-h-[72px]"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Rang 1 = expérience la plus récente, puis poste précédent, etc. Valeurs entre 0 et 1.
                      </p>
                    </Field>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={saving || contactEmailInvalid}
              className="bg-neon text-neutral-950 hover:bg-neon/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
