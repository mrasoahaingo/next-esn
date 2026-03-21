'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { useOrgRole } from '@/lib/hooks/useOrgRole';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { useOrgBranding } from '@/components/org-branding-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

type SettingsForm = {
  display_name: string;
  contact_email: string;
  website_url: string;
  app_logo_url: string;
  positioning_brand_context: string;
};

const emptyForm: SettingsForm = {
  display_name: '',
  contact_email: '',
  website_url: '',
  app_logo_url: '',
  positioning_brand_context: '',
};

export default function OrganizationSettingsPage() {
  const { userId } = useAuth();
  const { isOrgAdmin, isLoaded: roleLoaded } = useOrgRole();
  const { isSuperAdmin } = useSuperAdmin();
  const canManage = isOrgAdmin || isSuperAdmin;
  const { refetch: refetchBranding } = useOrgBranding();

  const [form, setForm] = useState<SettingsForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/org/settings');
      if (!res.ok) throw new Error('Chargement impossible');
      const data = await res.json();
      setForm({
        display_name: data.display_name ?? '',
        contact_email: data.contact_email ?? '',
        website_url: data.website_url ?? '',
        app_logo_url: data.app_logo_url ?? '',
        positioning_brand_context: data.positioning_brand_context ?? '',
      });
    } catch {
      toast.error('Impossible de charger les paramètres');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (roleLoaded && !canManage) {
    redirect('/');
  }

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
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message ?? err.error ?? 'Erreur serveur');
      }
      const data = await res.json();
      setForm((prev) => ({
        ...prev,
        ...data,
        display_name: data.display_name ?? '',
        contact_email: data.contact_email ?? '',
        website_url: data.website_url ?? '',
        app_logo_url: data.app_logo_url ?? '',
        positioning_brand_context: data.positioning_brand_context ?? '',
      }));
      toast.success('Paramètres enregistrés');
      await refetchBranding();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

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
      const { url, settings } = await res.json();
      setForm((p) => ({
        ...p,
        app_logo_url: url ?? settings?.app_logo_url ?? p.app_logo_url,
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
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-8">
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
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            <div className="rounded-xl glass-panel space-y-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Identité</h2>
              <div className="space-y-1.5">
                <Label htmlFor="display_name" className="text-xs text-muted-foreground">
                  Nom affiché dans l&apos;application
                </Label>
                <Input
                  id="display_name"
                  value={form.display_name}
                  onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                  placeholder="Laissez vide pour utiliser le nom Clerk"
                  className="h-9 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact_email" className="text-xs text-muted-foreground">
                    Email de contact
                  </Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
                    placeholder="contact@entreprise.fr"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="website_url" className="text-xs text-muted-foreground">
                    Site web
                  </Label>
                  <Input
                    id="website_url"
                    type="url"
                    value={form.website_url}
                    onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))}
                    placeholder="https://www.entreprise.fr"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl glass-panel space-y-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Logo application</h2>
              <p className="text-xs text-muted-foreground">
                Barre latérale uniquement. PNG, JPEG, WebP ou SVG — max 2 Mo.
              </p>
              <div className="space-y-2">
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
                  <input
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

            <div className="rounded-xl glass-panel space-y-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">IA — positionnement</h2>
              <p className="text-xs text-muted-foreground">
                Texte injecté en tête des prompts d&apos;analyse et de génération (métier, ton, signature
                d&apos;équipe…).
              </p>
              <Textarea
                value={form.positioning_brand_context}
                onChange={(e) => setForm((p) => ({ ...p, positioning_brand_context: e.target.value }))}
                placeholder="Ex. : Nous sommes une ESN française spécialisée dans le placement de consultants IT."
                rows={6}
                className="min-h-[120px] resize-y text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
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
