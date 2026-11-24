'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useProspectionSettings, useUpdateProspectionSettings } from '@/lib/queries';
import {
  DEFAULT_HEAT_THRESHOLD,
  HEAT_THRESHOLD_MAX,
  HEAT_THRESHOLD_MIN,
} from '@/lib/prospection/constants';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

/** Saisie brute → entier 0..100, ou null si invalide. */
function parseThreshold(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n >= HEAT_THRESHOLD_MIN && n <= HEAT_THRESHOLD_MAX ? n : null;
}

/** Réglage du seuil de chaleur de l'org (CONT-04). Formulaire autonome, hors du formulaire de la page. */
export function ProspectionSettingsCard() {
  const { orgId } = useAuth();
  const { data: settings, isPending, isError } = useProspectionSettings();
  const updateSettings = useUpdateProspectionSettings();

  // Saisie locale rattachée à l'org (Pitfall 8, sans effet) : tant que l'utilisateur n'a rien
  // touché, on affiche la valeur serveur ; ensuite un refetch n'écrase plus sa saisie. Un
  // changement d'org invalide la saisie, qui repart de la valeur serveur de la nouvelle org.
  const [edit, setEdit] = useState<{ orgId: string; raw: string } | null>(null);
  const draft =
    edit && edit.orgId === orgId
      ? edit.raw
      : String(settings?.heat_threshold ?? DEFAULT_HEAT_THRESHOLD);
  const setDraft = (raw: string) => {
    if (orgId) setEdit({ orgId, raw });
  };

  const value = parseThreshold(draft);
  const invalid = value === null;
  const unchanged = !!settings && value === settings.heat_threshold;
  const sliderValue = value ?? settings?.heat_threshold ?? DEFAULT_HEAT_THRESHOLD;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value === null) return;
    updateSettings.mutate(
      { heat_threshold: value },
      {
        onSuccess: () => toast.success('Seuil de prospection enregistré'),
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Card className="glass-panel border-0">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground">Prospection</CardTitle>
        <CardDescription className="text-xs">
          Seuil de chaleur à partir duquel la recherche du décideur et de son email est autorisée
          pour une entreprise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending && !settings ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Impossible de charger les réglages de prospection
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field data-invalid={invalid ? true : undefined}>
              <FieldLabel htmlFor="heat_threshold" className="text-xs text-muted-foreground">
                Seuil de chaleur
              </FieldLabel>
              <div className="flex items-center gap-4">
                <Slider
                  aria-label="Seuil de chaleur"
                  min={HEAT_THRESHOLD_MIN}
                  max={HEAT_THRESHOLD_MAX}
                  step={1}
                  value={[sliderValue]}
                  onValueChange={(v) => setDraft(String(Array.isArray(v) ? v[0] : v))}
                  className="flex-1"
                />
                <Input
                  id="heat_threshold"
                  type="number"
                  inputMode="numeric"
                  min={HEAT_THRESHOLD_MIN}
                  max={HEAT_THRESHOLD_MAX}
                  step={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  aria-invalid={invalid}
                  className="h-9 w-20 text-sm"
                />
              </div>
              <FieldDescription className="text-xs">
                Défaut : {DEFAULT_HEAT_THRESHOLD}. En dessous de ce score, la recherche de contact
                est désactivée.
              </FieldDescription>
              {settings?.is_default ? (
                <FieldDescription className="text-xs">
                  Valeur par défaut — aucun réglage enregistré pour cette organisation.
                </FieldDescription>
              ) : null}
              {invalid ? <FieldError>Entrez un nombre entier entre 0 et 100.</FieldError> : null}
            </Field>

            <Button
              type="submit"
              disabled={updateSettings.isPending || invalid || unchanged}
              className="self-start bg-neon text-neutral-950 hover:bg-neon/90"
            >
              {updateSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Enregistrer le seuil'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
