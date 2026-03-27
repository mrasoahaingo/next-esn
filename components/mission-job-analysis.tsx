'use client';

import { useMemo, useState, useEffect, type ReactNode } from 'react';
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
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';
import type { JobPostingAnalysisStreamMeta } from '@/lib/types/job-posting-analysis-stream';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import { computeJobPostingStepStates, formatStepSummaryLine } from '@/lib/workflow/compute-step-status';
import { getFrenchStepShortLabel } from '@/lib/workflow/workflow-step-labels';
import type {
  JobPostingAnalysis,
  JobPostingExpertiseBand,
  JobPostingKeyPointExplain,
  JobPostingKeyPointAspect,
  JobPostingRequirementTier,
} from '@/lib/schema';

type JobKeyPoint = NonNullable<JobPostingAnalysis['keyPoints']>[number];

const INTERPRETED_BAND_LABEL: Record<JobPostingExpertiseBand, string> = {
  junior: 'Junior',
  confirmed: 'Confirmé',
  senior: 'Senior',
  expert_lead: 'Expert / lead',
  unclear: 'Indéterminé',
};

const REQUIREMENT_TIER_LABEL: Record<JobPostingRequirementTier, string> = {
  hard_constraint: 'Bloquant',
  must_have: 'Indispensable',
  should_have: 'Important',
  nice_to_have: 'Souhaitable',
};
import {
  jobPostingAspectLabel,
  withMandatoryJobPostingLists,
} from '@/lib/services/job-posting-analysis.service';
import { normalizeSkillKey } from '@/lib/utils/skill-key';
import { useAuth } from '@clerk/nextjs';
import { queryKeys } from '@/lib/queries/keys';
import { useCancelWorkflow } from '@/lib/queries/workflow';
import { cn } from '@/lib/utils';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';

function formatJobPostingStreamHint(meta: JobPostingAnalysisStreamMeta | null): string | null {
  if (!meta) return null;
  if (!meta.activeBranches?.length && meta.phase === 'finalizing') {
    return 'Finalisation…';
  }
  if (!meta.activeBranches?.length) return 'Analyse de la fiche…';
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
  workflow_last_error?: WorkflowLastError | null;
  /** Clés skills marquées « comprises » par le recruteur (toutes missions de l’org). */
  global_skill_keys_understood: string[];
  /** Classes sur le conteneur (ex. grille 2 colonnes : retirer mb-6, overflow). */
  className?: string;
}

function AnalysisScrollBody({ children }: { children: ReactNode }) {
  return (
    <div className="pr-1">
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
  workflow_last_error = null,
  global_skill_keys_understood,
  className,
}: MissionJobAnalysisProps) {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const cancelWorkflow = useCancelWorkflow();

  const invalidate = () => {
    const oid = orgId ?? '';
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, missionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.recruiterSkills.all(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.orgRecruiterSkills.all(oid) });
  };

  const jobAnalyzeActive = !!job_analysis_workflow_run_id;

  const stream = useWorkflowStream<Partial<JobPostingAnalysis>, JobPostingAnalysisStreamMeta>({
    api: `/api/missions/${missionId}/analyze-job`,
    runId: jobAnalyzeActive ? job_analysis_workflow_run_id ?? undefined : undefined,
    runStatus: jobAnalyzeActive ? 'extracting' : undefined,
    activeStatuses: ['extracting'],
    onFinish: () => {
      invalidate();
      toast.success('Analyse terminee avec succes');
    },
    onStartOnly: async () => {
      await queryClient.refetchQueries({ queryKey: queryKeys.missions.detail(orgId ?? '', missionId) });
    },
  });

  const cancelRunId = stream.activeRunId;

  useEffect(() => {
    if (!stream.error) return;
    const key = stream.errorStepKey ?? workflow_last_error?.stepKey;
    const label = key ? getFrenchStepShortLabel('jobPosting', key) : 'Analyse fiche';
    toast.error(`${label} : échec. Réessayez ou contactez le support.`, { duration: 8000 });
  }, [stream.error, stream.errorStepKey, workflow_last_error?.stepKey]);

  const effectiveAnalysis = useMemo(() => {
    const raw =
      stream.isLoading && stream.object ? stream.object : job_analysis ?? stream.object ?? null;
    if (!raw) return null;
    const hasAnyContent =
      !!raw.expectedExpertiseLevel ||
      !!raw.executiveSummary?.trim() ||
      (raw.keyPoints?.length ?? 0) > 0 ||
      (raw.openQuestions?.length ?? 0) > 0 ||
      (raw.redFlags?.length ?? 0) > 0;
    if (!hasAnyContent) return raw;
    return withMandatoryJobPostingLists(raw);
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

  /** Analyse déjà persistée en base : ne pas afficher le bandeau « en cours » si le run est obsolète. */
  const hasPersistedJobAnalysis =
    !!job_analysis &&
    (!!job_analysis.expectedExpertiseLevel ||
      !!job_analysis.executiveSummary?.trim() ||
      (job_analysis.keyPoints?.length ?? 0) > 0);

  const showAnalysisProgressHint =
    stream.isLoading || (jobAnalyzeActive && !hasPersistedJobAnalysis);

  const jobPostingRows = useMemo(
    () =>
      computeJobPostingStepStates({
        streamMeta: stream.streamMeta,
        partialData: stream.object ?? job_analysis ?? null,
        isStreaming: stream.isLoading,
        errorStepKey: stream.errorStepKey,
        persistedError: workflow_last_error,
        workflowFailed: !!(workflow_last_error ?? stream.error),
        workflowRunActive: jobAnalyzeActive,
      }),
    [
      stream.streamMeta,
      stream.object,
      stream.isLoading,
      stream.errorStepKey,
      stream.error,
      job_analysis,
      workflow_last_error,
      jobAnalyzeActive,
    ],
  );

  const jobPostingSummary = useMemo(
    () => formatStepSummaryLine('jobPosting', jobPostingRows),
    [jobPostingRows],
  );

  const showJobStepList =
    stream.isLoading || (jobAnalyzeActive && !hasPersistedJobAnalysis) || !!workflow_last_error;

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
  const [explainCache, setExplainCache] = useState<Record<string, JobPostingKeyPointExplain>>({});

  const openExplain = async (pointId: string) => {
    const cached = explainCache[pointId] ?? effectiveAnalysis?.keyPointExplanations?.[pointId];
    if (cached) {
      setExplainData(cached);
      setExplainLoading(false);
      setExplainOpen(true);
      return;
    }

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
      setExplainCache((prev) => ({ ...prev, [pointId]: data }));
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
    <div className={cn('glass-panel flex flex-col rounded-2xl p-6 mb-6', className)}>
      <div className="shrink-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-neon" />
          <h2 className="text-sm font-semibold text-foreground">Comprendre la fiche</h2>
          <AiGenerationInfoIcon variant="mission_job_analysis" className="h-7 w-7" />
          {showAnalysisProgressHint && !showJobStepList && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {formatJobPostingStreamHint(stream.streamMeta) ?? 'Analyse de la fiche…'}
            </span>
          )}
        </div>

        {showJobStepList && (
          <div className="mb-4 rounded-xl border border-border/60 bg-card/30 px-3 py-3">
            <WorkflowStepList rows={jobPostingRows} summaryLine={jobPostingSummary} />
          </div>
        )}

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
                onClick={() => stream.submit({ startOnly: true })}
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
                onClick={() => stream.submit({ startOnly: true })}
              >
                {job_analysis_stale ? 'Relancer l’analyse' : 'Réanalyser la fiche'}
              </Button>
            )}
            {cancelRunId && (stream.isLoading || jobAnalyzeActive) && (
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => {
                  stream.stop();
                  cancelWorkflow.mutate({
                    runId: cancelRunId,
                    table: 'missions',
                    recordId: missionId,
                    missionId,
                  });
                }}
                disabled={cancelWorkflow.isPending}
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Annuler l’analyse
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
      {effectiveAnalysis?.expectedExpertiseLevel &&
        effectiveAnalysis.expectedExpertiseLevel.summary?.trim() && (
        <div className="rounded-xl border border-violet/35 bg-violet/10 p-4 mb-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet">
              Niveau d&apos;expertise attendu
            </p>
            {effectiveAnalysis.expectedExpertiseLevel.interpretedBand && (
              <Badge variant="secondary" className="text-[10px] font-normal">
                {INTERPRETED_BAND_LABEL[effectiveAnalysis.expectedExpertiseLevel.interpretedBand]}
              </Badge>
            )}
            {effectiveAnalysis.expectedExpertiseLevel.hardOnLevel && (
              <Badge variant="outline" className="border-destructive/40 text-[10px] text-destructive">
                Non négociable
              </Badge>
            )}
          </div>
          {effectiveAnalysis.expectedExpertiseLevel.statedLevel?.trim() && (
            <p className="text-xs font-medium text-foreground/95 mb-1">
              {effectiveAnalysis.expectedExpertiseLevel.statedLevel}
            </p>
          )}
          <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mb-3">
            {effectiveAnalysis.expectedExpertiseLevel.summary}
          </p>
          {effectiveAnalysis.expectedExpertiseLevel.minYearsHint != null && (
            <p className="text-xs text-muted-foreground mb-2">
              Indication d&apos;ancienneté (fiche) :{' '}
              <span className="font-medium text-foreground">
                {effectiveAnalysis.expectedExpertiseLevel.minYearsHint} an(s) ou équivalent
              </span>
            </p>
          )}
          {(effectiveAnalysis.expectedExpertiseLevel.signalsFromPosting?.length ?? 0) > 0 && (
            <>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Signaux dans la fiche
              </p>
              <ul className="mb-3 list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                {(effectiveAnalysis.expectedExpertiseLevel.signalsFromPosting ?? []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {(effectiveAnalysis.expectedExpertiseLevel.recruiterCalibrationQuestions?.length ?? 0) > 0 && (
            <>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Questions pour calibrer avec le client
              </p>
              <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                {(effectiveAnalysis.expectedExpertiseLevel.recruiterCalibrationQuestions ?? []).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

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

      {effectiveAnalysis?.cvSearchKeywords && effectiveAnalysis.cvSearchKeywords.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Mots-clés matching (priorité CV)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {effectiveAnalysis.cvSearchKeywords.map((kw, i) => (
              <Badge
                key={`${kw}-${i}`}
                variant="secondary"
                className="text-[10px] font-normal px-2 py-0.5 font-mono text-muted-foreground"
              >
                {kw}
              </Badge>
            ))}
          </div>
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
                  const skillKey = kp.canonicalSkillKey?.trim()
                    ? normalizeSkillKey(kp.canonicalSkillKey)
                    : kp.id;
                  const understood = global_skill_keys_understood.includes(skillKey);

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
                          {kp.requirementTier && (
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 ${
                                kp.requirementTier === 'hard_constraint'
                                  ? 'border-destructive/50 text-destructive/90'
                                  : 'border-neon/40 text-neon/90'
                              }`}
                            >
                              {REQUIREMENT_TIER_LABEL[kp.requirementTier]}
                            </Badge>
                          )}
                          {kp.importanceWeight != null && kp.requirementTier !== 'hard_constraint' && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/20 text-white/60">
                              poids {Math.round(kp.importanceWeight * 100)}%
                            </Badge>
                          )}
                          {kp.evidenceTypeExpected && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/15 text-muted-foreground">
                              preuve : {kp.evidenceTypeExpected.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          {understood && (
                            <Badge
                              variant="default"
                              className="text-[9px] px-1.5 py-0 gap-0.5 bg-neon/20 text-neon border-0"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Assimilé
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-white/70 leading-relaxed">{kp.roleInMission}</p>
                        {kp.valueSought?.trim() && (
                          <p className="text-[10px] text-muted-foreground">
                            <span className="text-white/50">Exigence : </span>
                            {kp.valueSought}
                          </p>
                        )}
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
                            className="text-[10px] cursor-pointer text-white/70"
                          >
                            Compris
                          </Label>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] border-violet/30"
                          title="Explication contextualisée à cette fiche de poste"
                          onClick={() => openExplain(kp.id)}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          Expliquer
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
