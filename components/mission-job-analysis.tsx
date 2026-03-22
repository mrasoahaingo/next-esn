'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Loader2, Sparkles, BookOpen, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import type { JobPostingAnalysisStreamMeta } from '@/lib/types/job-posting-analysis-stream';
import type { JobPostingAnalysis, JobPostingKeyPointExplain, JobPostingKeyPointAspect } from '@/lib/schema';

type JobKeyPoint = NonNullable<JobPostingAnalysis['keyPoints']>[number];
import { jobPostingAspectLabel } from '@/lib/services/job-posting-analysis.service';
import { normalizeSkillKey } from '@/lib/utils/skill-key';
import { queryKeys } from '@/lib/queries/keys';
import { useCancelWorkflow } from '@/lib/queries/workflow';
import { cn } from '@/lib/utils';

function formatJobPostingStreamHint(meta: JobPostingAnalysisStreamMeta | null): string | null {
  if (!meta?.activeBranches?.length && meta?.phase === 'finalizing') {
    return 'Finalisation…';
  }
  if (!meta?.activeBranches?.length) return 'Analyse de la fiche…';
  const labels: Record<string, string> = {
    executive: 'Synthèse cadre',
    keyPoints: 'Points clés',
  };
  return `Analyse : ${meta.activeBranches.map((b) => labels[b] ?? b).join(' · ')}`;
}

interface MissionJobAnalysisProps {
  missionId: string;
  jobDescription: string;
  job_analysis: JobPostingAnalysis | null;
  job_analysis_workflow_run_id: string | null;
  job_analysis_stale: boolean;
  understood_point_ids: string[];
  /** Clés skills canoniques déjà marquées « comprises » (toutes missions de l’org). */
  global_skill_keys_understood: string[];
  /** Classes sur le conteneur (ex. grille 2 colonnes : retirer mb-6, overflow). */
  className?: string;
}

function AnalysisScrollBody({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
      {children}
    </div>
  );
}

export function MissionJobAnalysis({
  missionId,
  jobDescription,
  job_analysis,
  job_analysis_workflow_run_id,
  job_analysis_stale,
  understood_point_ids,
  global_skill_keys_understood,
  className,
}: MissionJobAnalysisProps) {
  const queryClient = useQueryClient();
  const cancelWorkflow = useCancelWorkflow();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(missionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.list() });
    queryClient.invalidateQueries({ queryKey: queryKeys.recruiterSkills.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.orgRecruiterSkills.all });
  };

  const jobAnalyzeActive = !!job_analysis_workflow_run_id;

  const stream = useWorkflowStream<Partial<JobPostingAnalysis>, JobPostingAnalysisStreamMeta>({
    api: `/api/missions/${missionId}/analyze-job`,
    runId: jobAnalyzeActive ? job_analysis_workflow_run_id ?? undefined : undefined,
    runStatus: jobAnalyzeActive ? 'extracting' : undefined,
    activeStatuses: ['extracting'],
    onFinish: invalidate,
  });

  const effectiveAnalysis = useMemo(() => {
    if (stream.isLoading && stream.object) return stream.object;
    return job_analysis ?? stream.object ?? null;
  }, [stream.isLoading, stream.object, job_analysis]);

  /** Regroupe par `category` ; ordre des blocs = importance la plus forte (min rank) dans la catégorie. */
  const keyPointsByCategory = useMemo(() => {
    const points = effectiveAnalysis?.keyPoints;
    if (!points?.length) return [] as [string, JobKeyPoint[]][];
    const map = new Map<string, JobKeyPoint[]>();
    for (const kp of points) {
      const cat = kp.category?.trim() || 'Autres';
      const list = map.get(cat);
      if (list) list.push(kp);
      else map.set(cat, [kp]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.importanceRank - b.importanceRank);
    }
    return [...map.entries()].sort((a, b) => {
      const minA = Math.min(...a[1].map((p) => p.importanceRank));
      const minB = Math.min(...b[1].map((p) => p.importanceRank));
      return minA - minB;
    });
  }, [effectiveAnalysis?.keyPoints]);

  const streamHint = formatJobPostingStreamHint(stream.streamMeta);

  const toggleUnderstood = useMutation({
    mutationFn: async ({ pointId, understood }: { pointId: string; understood: boolean }) => {
      const res = await fetch(`/api/missions/${missionId}/key-point-understood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointId, understood }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Échec');
      }
    },
    onSuccess: () => {
      invalidate();
    },
  });

  const [explainOpen, setExplainOpen] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainData, setExplainData] = useState<JobPostingKeyPointExplain | null>(null);

  const openExplain = async (pointId: string) => {
    setExplainOpen(true);
    setExplainData(null);
    setExplainLoading(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/key-points/${encodeURIComponent(pointId)}/explain`, {
        method: 'POST',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Erreur');
      }
      const data = (await res.json()) as JobPostingKeyPointExplain;
      setExplainData(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
      setExplainOpen(false);
    } finally {
      setExplainLoading(false);
    }
  };

  const hasDescription = jobDescription.trim().length > 0;
  const showAnalyzeCta = !job_analysis && !stream.isLoading && !jobAnalyzeActive;
  const showRelaunch = !!job_analysis && !jobAnalyzeActive && !stream.isLoading;

  return (
    <div className={cn('glass-panel flex min-h-0 flex-col overflow-hidden rounded-2xl p-6 mb-6', className)}>
      <div className="shrink-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-neon" />
          <h2 className="text-sm font-semibold text-foreground">Comprendre la fiche</h2>
          {streamHint && (stream.isLoading || jobAnalyzeActive) && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {streamHint}
            </span>
          )}
        </div>

        {!hasDescription && (
          <p className="text-xs text-muted-foreground">Ajoutez du texte à la fiche de poste pour lancer une analyse.</p>
        )}

        {hasDescription && (
          <div className="mb-4 flex flex-wrap gap-2">
            {showAnalyzeCta && (
              <Button
                size="sm"
                className="bg-neon text-neutral-950 hover:bg-neon/90"
                disabled={stream.isLoading}
                onClick={() => stream.submit({})}
              >
                Analyser la fiche
              </Button>
            )}
            {showRelaunch && !showAnalyzeCta && (
              <Button
                size="sm"
                variant="outline"
                className="border-neon/40 text-neon hover:bg-neon/10"
                disabled={stream.isLoading}
                onClick={() => stream.submit({})}
              >
                {job_analysis_stale ? 'Relancer l’analyse' : 'Réanalyser la fiche'}
              </Button>
            )}
            {jobAnalyzeActive && job_analysis_workflow_run_id && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() =>
                  cancelWorkflow.mutate({
                    runId: job_analysis_workflow_run_id,
                    table: 'missions',
                    recordId: missionId,
                    missionId,
                  })
                }
                disabled={cancelWorkflow.isPending}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Annuler
              </Button>
            )}
          </div>
        )}

        {job_analysis_stale && job_analysis && !stream.isLoading && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>La fiche a changé depuis la dernière analyse. Relancez pour une lecture à jour.</span>
          </div>
        )}
      </div>

      {hasDescription && (
      <AnalysisScrollBody>
      {effectiveAnalysis?.executiveSummary && (
        <div className="rounded-xl bg-overlay/20 border border-overlay/6 p-4 mb-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Synthèse
          </p>
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
            {effectiveAnalysis.executiveSummary}
          </p>
        </div>
      )}

      {effectiveAnalysis?.openQuestions && effectiveAnalysis.openQuestions.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            À clarifier avec le client
          </p>
          <ul className="flex flex-col gap-1 list-disc pl-4 text-xs text-muted-foreground">
            {effectiveAnalysis.openQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {effectiveAnalysis?.redFlags && effectiveAnalysis.redFlags.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-medium text-destructive/80 uppercase tracking-wider mb-2">
            Points de vigilance
          </p>
          <ul className="flex flex-col gap-1 list-disc pl-4 text-xs text-destructive/90">
            {effectiveAnalysis.redFlags.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {keyPointsByCategory.length > 0 && (
        <div className="flex flex-col gap-5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Points clés par catégories
          </p>
          <div className="flex flex-col gap-5 rounded-xl border border-overlay/6 bg-overlay/10 p-3">
            {keyPointsByCategory.map(([category, points]) => (
            <div key={category} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold text-foreground tracking-tight border-b border-overlay/10 pb-2">
                {category}
              </h3>
              <div className="flex flex-col gap-2">
                {points.map((kp) => {
                  const aspect = (kp.aspect ?? 'other') as JobPostingKeyPointAspect;
                  const technicalKey =
                    aspect === 'technical' && kp.canonicalSkillKey
                      ? normalizeSkillKey(kp.canonicalSkillKey)
                      : null;
                  const understoodGlobal =
                    technicalKey != null && global_skill_keys_understood.includes(technicalKey);
                  const understoodLocal = understood_point_ids.includes(kp.id);
                  const understood = technicalKey != null ? understoodGlobal : understoodLocal;

                  return (
                    <div
                      key={kp.id}
                      className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-xl border border-overlay/6 bg-overlay/15 px-3 py-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{kp.label}</span>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-violet/30 text-violet/90">
                            #{kp.importanceRank}
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            {jobPostingAspectLabel(aspect)}
                          </Badge>
                          {technicalKey && understoodGlobal && (
                            <Badge
                              variant="default"
                              className="text-[9px] px-1.5 py-0 gap-0.5 bg-neon/20 text-neon border-0"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Assimilé (profil)
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{kp.roleInMission}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <Checkbox
                            id={`understood-${kp.id}`}
                            checked={understood}
                            onCheckedChange={(v) =>
                              toggleUnderstood.mutate({ pointId: kp.id, understood: v === true })
                            }
                            disabled={toggleUnderstood.isPending}
                          />
                          <Label
                            htmlFor={`understood-${kp.id}`}
                            className="text-[10px] cursor-pointer text-muted-foreground"
                          >
                            Compris
                          </Label>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] border-violet/30"
                          title={
                            understoodGlobal
                              ? 'Explication contextualisée à cette fiche (la techno est déjà marquée comprise sur votre profil)'
                              : 'Explication contextualisée à cette fiche de poste'
                          }
                          onClick={() => openExplain(kp.id)}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          {understoodGlobal ? 'Expliquer (mission)' : 'Expliquer'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            ))}
          </div>
        </div>
      )}
      </AnalysisScrollBody>
      )}

      <Dialog
        open={explainOpen}
        onOpenChange={(o) => {
          setExplainOpen(o);
          if (!o) setExplainData(null);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>Détail du point clé</DialogTitle>
          </DialogHeader>
          {explainLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération…
            </div>
          )}
          {!explainLoading && explainData && (
            <div className="flex flex-col gap-4 text-sm">
              <section>
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Définition
                </h4>
                <p className="text-foreground/90 whitespace-pre-wrap">{explainData.definition}</p>
              </section>
              <Separator />
              <section>
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Dans cette mission
                </h4>
                <p className="text-foreground/90 whitespace-pre-wrap">{explainData.usageInMission}</p>
              </section>
              <Separator />
              <section>
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Questions au candidat
                </h4>
                <ul className="flex flex-col gap-1 list-disc pl-4 text-muted-foreground">
                  {explainData.candidateQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </section>
              <Separator />
              <section>
                <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Réponses attendues
                </h4>
                <div className="flex flex-col gap-2 text-xs">
                  <p>
                    <span className="text-neon font-medium">Débutant — </span>
                    {explainData.expectedAnswers.debutant}
                  </p>
                  <p>
                    <span className="text-violet font-medium">Confirmé — </span>
                    {explainData.expectedAnswers.confirme}
                  </p>
                  <p>
                    <span className="text-foreground font-medium">Senior — </span>
                    {explainData.expectedAnswers.senior}
                  </p>
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
