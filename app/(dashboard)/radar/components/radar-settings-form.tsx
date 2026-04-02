'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DEFAULT_LINKEDIN_DISCOVERY, DEFAULT_RADAR_SETTINGS, radarSettingsSchema, type LinkedInDiscovery, type RadarSettings } from '@/lib/radar/settings';

type ManualRun = {
  kind: string;
  runId: string;
};

type ManualRunStatus = ManualRun & {
  status: string;
  result?: unknown;
};

type SettingsFormState = {
  enabledSources: RadarSettings['enabledSources'];
  jobSearchQueriesText: string;
  pressRssUrlsText: string;
  linkedinCompanyUrlsText: string;
  matchThreshold: string;
  linkedinDiscovery: LinkedInDiscovery;
};

function toLines(values: string[]) {
  return values.join('\n');
}

function fromLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function RadarSettingsForm() {
  const { orgId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [refreshingResults, setRefreshingResults] = useState(false);
  const [manualRuns, setManualRuns] = useState<ManualRunStatus[]>([]);
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);

  const linkedinSessionQuery = useQuery({
    queryKey: ['radar', 'linkedin-session', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const res = await fetch('/api/radar/linkedin-session');
      if (!res.ok) throw new Error('Impossible de vérifier la session LinkedIn');
      return res.json() as Promise<{ connected: boolean }>;
    },
  });
  const [form, setForm] = useState<SettingsFormState>({
    enabledSources: DEFAULT_RADAR_SETTINGS.enabledSources,
    jobSearchQueriesText: toLines(DEFAULT_RADAR_SETTINGS.jobSearchQueries),
    pressRssUrlsText: toLines(DEFAULT_RADAR_SETTINGS.pressRssUrls),
    linkedinCompanyUrlsText: '',
    matchThreshold: String(DEFAULT_RADAR_SETTINGS.matchThreshold),
    linkedinDiscovery: DEFAULT_LINKEDIN_DISCOVERY,
  });

  const settingsQuery = useQuery({
    queryKey: ['radar', 'settings', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const response = await fetch('/api/radar/settings');
      if (!response.ok) throw new Error('Impossible de charger les parametres Radar');
      return radarSettingsSchema.parse(await response.json());
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setForm({
      enabledSources: settingsQuery.data.enabledSources,
      jobSearchQueriesText: toLines(settingsQuery.data.jobSearchQueries),
      pressRssUrlsText: toLines(settingsQuery.data.pressRssUrls),
      linkedinCompanyUrlsText: toLines(settingsQuery.data.linkedinCompanyUrls),
      matchThreshold: String(settingsQuery.data.matchThreshold),
      linkedinDiscovery: settingsQuery.data.linkedinDiscovery,
    });
  }, [settingsQuery.data]);

  useEffect(() => {
    const activeRuns = manualRuns.filter((run) => !['completed', 'failed', 'cancelled', 'not_found'].includes(run.status));
    if (activeRuns.length === 0) return;

    const interval = window.setInterval(async () => {
      const query = new URLSearchParams();
      for (const run of activeRuns) query.append('runId', run.runId);

      try {
        const response = await fetch(`/api/radar/runs?${query.toString()}`);
        if (!response.ok) return;
        const json = (await response.json()) as {
          runs?: Array<{ runId: string; status: string; result?: unknown }>;
        };

        setManualRuns((current) =>
          current.map((run) => {
            const next = json.runs?.find((candidate) => candidate.runId === run.runId);
            return next ? { ...run, status: next.status, result: next.result } : run;
          }),
        );
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [manualRuns]);

  function registerRuns(runs: ManualRun[]) {
    setManualRuns((current) => {
      const next = new Map(current.map((run) => [run.runId, run]));
      for (const run of runs) {
        next.set(run.runId, { ...run, status: 'queued' });
      }
      return Array.from(next.values());
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        enabledSources: form.enabledSources,
        jobSearchQueries: fromLines(form.jobSearchQueriesText),
        pressRssUrls: fromLines(form.pressRssUrlsText),
        linkedinCompanyUrls: fromLines(form.linkedinCompanyUrlsText),
        linkedinDiscovery: form.linkedinDiscovery,
        matchThreshold: Number(form.matchThreshold),
      };

      const response = await fetch('/api/radar/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message ?? error.error ?? 'Impossible de sauvegarder');
      }

      const next = radarSettingsSchema.parse(await response.json());
      queryClient.setQueryData(['radar', 'settings', orgId], next);
      toast.success('Parametres Radar enregistres');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function triggerManualCollect() {
    setCollecting(true);
    try {
      const response = await fetch('/api/radar/cron/collect-signals', {
        method: 'POST',
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? 'Impossible de lancer la collecte');
      }
      registerRuns(Array.isArray(json.runs) ? json.runs : []);
      toast.success(`Collecte manuelle lancee (${json.started} workflows)`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setCollecting(false);
    }
  }

  async function triggerManualScoring() {
    setScoring(true);
    try {
      const response = await fetch('/api/radar/cron/compute-scores', {
        method: 'POST',
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? 'Impossible de lancer le recalcul');
      }
      registerRuns(Array.isArray(json.runs) ? json.runs : []);
      toast.success('Recalcul manuel lance');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setScoring(false);
    }
  }

  async function triggerManualFullRefresh() {
    setRunningAll(true);
    try {
      const collectResponse = await fetch('/api/radar/cron/collect-signals', {
        method: 'POST',
      });
      const collectJson = await collectResponse.json().catch(() => ({}));
      if (!collectResponse.ok) {
        throw new Error(collectJson.error ?? 'Impossible de lancer la collecte');
      }
      registerRuns(Array.isArray(collectJson.runs) ? collectJson.runs : []);

      const scoreResponse = await fetch('/api/radar/cron/compute-scores', {
        method: 'POST',
      });
      const scoreJson = await scoreResponse.json().catch(() => ({}));
      if (!scoreResponse.ok) {
        throw new Error(scoreJson.error ?? 'Impossible de lancer le recalcul');
      }
      registerRuns(Array.isArray(scoreJson.runs) ? scoreJson.runs : []);

      toast.success('Collecte + recalcul manuels lances');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRunningAll(false);
    }
  }

  async function refreshResultsNow() {
    setRefreshingResults(true);
    try {
      const response = await fetch('/api/radar/refresh', { method: 'POST' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? 'Impossible de rafraichir les resultats');
      }
      router.refresh();
      toast.success('Cache Radar invalide, recharge les pages Radar');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRefreshingResults(false);
    }
  }

  async function handleLinkedInConnect() {
    setConnectingLinkedIn(true);
    try {
      const res = await fetch('/api/radar/linkedin-session', { method: 'POST' });
      if (!res.ok) throw new Error('Impossible de créer la session LinkedIn');
      const { liveUrl } = await res.json();
      window.open(liveUrl, '_blank');
      queryClient.invalidateQueries({ queryKey: ['radar', 'linkedin-session', orgId] });
      toast.success('Session créée — connectez-vous à LinkedIn dans l\'onglet ouvert');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setConnectingLinkedIn(false);
    }
  }

  async function handleLinkedInDisconnect() {
    try {
      const res = await fetch('/api/radar/linkedin-session', { method: 'DELETE' });
      if (!res.ok) throw new Error('Impossible de déconnecter la session LinkedIn');
      queryClient.invalidateQueries({ queryKey: ['radar', 'linkedin-session', orgId] });
      toast.success('Session LinkedIn déconnectée');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Declenchement manuel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={triggerManualCollect}
              disabled={collecting || runningAll}
            >
              {collecting ? 'Collecte...' : 'Lancer la collecte'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={triggerManualScoring}
              disabled={scoring || runningAll}
            >
              {scoring ? 'Recalcul...' : 'Recalculer les scores'}
            </Button>
            <Button
              type="button"
              onClick={triggerManualFullRefresh}
              disabled={runningAll || collecting || scoring}
            >
              {runningAll ? 'Execution...' : 'Collecte + scoring'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={refreshResultsNow}
              disabled={refreshingResults}
            >
              {refreshingResults ? 'Rafraichissement...' : 'Rafraichir les resultats'}
            </Button>
            <Link href="/radar">
              <Button type="button" variant="outline">
                Ouvrir le dashboard
              </Button>
            </Link>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="mb-2 text-sm font-medium">Execution en cours</div>
            {manualRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun run manuel suivi pour cette session.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {manualRuns.map((run) => (
                  <div key={run.runId} className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{run.kind}</div>
                      <div className="truncate text-xs text-muted-foreground">{run.runId}</div>
                      {run.result && typeof run.result === 'object' ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {Object.entries(run.result as Record<string, unknown>)
                            .map(([key, value]) => `${key}: ${String(value)}`)
                            .join(' · ')}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-full border border-border px-2 py-1 text-xs">
                      {run.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            La collecte est asynchrone. Quand les statuts passent a <span className="font-medium text-foreground">completed</span>,
            clique sur <span className="font-medium text-foreground">Rafraichir les resultats</span>, puis ouvre le dashboard Radar.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Sources actives</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {Object.entries(form.enabledSources).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
              <div>
                <Label className="capitalize">{key}</Label>
                <p className="text-sm text-muted-foreground">Active ou coupe cette source de collecte.</p>
              </div>
              <Switch
                checked={value}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    enabledSources: { ...current.enabledSources, [key]: checked },
                  }))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Requetes offres d&apos;emploi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="jobSearchQueries">Une requete par ligne</Label>
          <textarea
            id="jobSearchQueries"
            className="min-h-40 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm"
            value={form.jobSearchQueriesText}
            onChange={(event) => setForm((current) => ({ ...current, jobSearchQueriesText: event.target.value }))}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Flux presse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="pressRssUrls">URLs RSS, une par ligne</Label>
          <textarea
            id="pressRssUrls"
            className="min-h-32 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm"
            value={form.pressRssUrlsText}
            onChange={(event) => setForm((current) => ({ ...current, pressRssUrlsText: event.target.value }))}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Seed LinkedIn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="linkedinCompanyUrls">URLs entreprises LinkedIn, une par ligne</Label>
          <textarea
            id="linkedinCompanyUrls"
            className="min-h-32 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm"
            value={form.linkedinCompanyUrlsText}
            onChange={(event) =>
              setForm((current) => ({ ...current, linkedinCompanyUrlsText: event.target.value }))
            }
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Decouverte LinkedIn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-4">
            <div>
              <Label>Activer la decouverte automatique</Label>
              <p className="text-sm text-muted-foreground">
                Recherche de nouvelles entreprises via LinkedIn selon les filtres ci-dessous.
              </p>
            </div>
            <Switch
              checked={form.linkedinDiscovery.enabled}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  linkedinDiscovery: { ...current.linkedinDiscovery, enabled: checked },
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="ldSectors">Secteurs cibles (un par ligne)</Label>
            <textarea
              id="ldSectors"
              className="min-h-28 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm"
              value={toLines(form.linkedinDiscovery.sectors)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  linkedinDiscovery: { ...current.linkedinDiscovery, sectors: fromLines(event.target.value) },
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="ldRegions">Regions cibles (une par ligne)</Label>
            <textarea
              id="ldRegions"
              className="min-h-28 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm"
              value={toLines(form.linkedinDiscovery.regions)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  linkedinDiscovery: { ...current.linkedinDiscovery, regions: fromLines(event.target.value) },
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="ldKeywords">Mots-cles (un par ligne)</Label>
            <textarea
              id="ldKeywords"
              className="min-h-28 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm"
              value={toLines(form.linkedinDiscovery.keywords)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  linkedinDiscovery: { ...current.linkedinDiscovery, keywords: fromLines(event.target.value) },
                }))
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ldMinExternalRatio">Ratio externes minimum (0–1)</Label>
              <Input
                id="ldMinExternalRatio"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={form.linkedinDiscovery.minExternalRatio}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    linkedinDiscovery: {
                      ...current.linkedinDiscovery,
                      minExternalRatio: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ldMaxCompanies">Max entreprises par run</Label>
              <Input
                id="ldMaxCompanies"
                type="number"
                step="1"
                min="1"
                max="200"
                value={form.linkedinDiscovery.maxCompaniesPerRun}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    linkedinDiscovery: {
                      ...current.linkedinDiscovery,
                      maxCompaniesPerRun: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ldMinHeadcount">Effectif minimum</Label>
              <Input
                id="ldMinHeadcount"
                type="number"
                step="1"
                min="1"
                value={form.linkedinDiscovery.minHeadcount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    linkedinDiscovery: {
                      ...current.linkedinDiscovery,
                      minHeadcount: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ldMaxHeadcount">Effectif maximum</Label>
              <Input
                id="ldMaxHeadcount"
                type="number"
                step="1"
                min="1"
                value={form.linkedinDiscovery.maxHeadcount}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    linkedinDiscovery: {
                      ...current.linkedinDiscovery,
                      maxHeadcount: Number(event.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Matching vivier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="matchThreshold">Seuil de similarite pgvector</Label>
          <Input
            id="matchThreshold"
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={form.matchThreshold}
            onChange={(event) => setForm((current) => ({ ...current, matchThreshold: event.target.value }))}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Connexion LinkedIn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connectez un compte LinkedIn pour que le collecteur Stagehand puisse accéder aux pages protégées.
          </p>
          <div className="flex items-center gap-3">
            {linkedinSessionQuery.data?.connected ? (
              <>
                <Badge variant="default" className="bg-green-600">Connecté</Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLinkedInDisconnect}
                >
                  Déconnecter
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleLinkedInConnect}
                disabled={connectingLinkedIn}
              >
                {connectingLinkedIn ? 'Création de la session…' : 'Connecter mon LinkedIn'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || settingsQuery.isPending}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  );
}
