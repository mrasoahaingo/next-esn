'use client';

import { Fragment, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { BookOpen, CheckCircle2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { PanelEmpty } from '@/components/dashboard/panel-empty';
import type { JobPostingAnalysis, JobPostingKeyPointExplain, JobPostingKeyPointAspect } from '@/lib/schema';
import { jobPostingAspectLabel } from '@/lib/services/job-posting-analysis.service';
import { normalizeSkillKey } from '@/lib/utils/skill-key';
import { queryKeys } from '@/lib/queries/keys';
import {
  EVIDENCE_TYPE_LABEL,
  REQUIREMENT_TIER_LABEL,
  REQUIREMENT_TIER_TONE,
  formatWeight,
} from '@/components/missions/mission-format';

type JobKeyPoint = NonNullable<JobPostingAnalysis['keyPoints']>[number];

export interface MissionJobAnalysisProps {
  missionId: string;
  /** Analyse affichée (persistée ou en cours de flux), fournie par `useMissionJobAnalysis`. */
  analysis: Partial<JobPostingAnalysis> | null;
  isStreaming: boolean;
  /** Clés skills marquées « comprises » par le recruteur (toutes missions de l’org). */
  global_skill_keys_understood: string[];
  /** La fiche est vide ou pas encore analysée : le panneau invite. */
  onAnalyze?: () => void;
  canAnalyze?: boolean;
}

const SKELETON = 'motion-reduce:animate-none';
const HEAD = 'h-9 text-xs text-muted-foreground';

/**
 * Panneau « Points clés et barème » : les critères tirés de la fiche, en tableau
 * groupé par catégorie (point clé et son rôle, importance et niveau d'exigence,
 * preuve attendue, « Compris », explication). Le flux d'analyse vit dans
 * `useMissionJobAnalysis` ; ici restent la mutation « compris » et le dialogue
 * d'explication, inchangés.
 */
export function MissionJobAnalysis({
  missionId,
  analysis,
  isStreaming,
  global_skill_keys_understood,
  onAnalyze,
  canAnalyze = true,
}: MissionJobAnalysisProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  const invalidate = () => {
    const oid = orgId ?? '';
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, missionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.recruiterSkills.all(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.orgRecruiterSkills.all(oid) });
  };

  /** Regroupe par `category` ; ordre des blocs = importance la plus forte (min rank) dans la catégorie. */
  const keyPointsByCategory = useMemo(() => {
    const points = analysis?.keyPoints;
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
  }, [analysis?.keyPoints]);

  const totalPoints = analysis?.keyPoints?.length ?? 0;

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
  const [explainLabel, setExplainLabel] = useState<string | null>(null);
  const [explainCache, setExplainCache] = useState<Record<string, JobPostingKeyPointExplain>>({});

  const openExplain = async (kp: JobKeyPoint) => {
    const pointId = kp.id;
    setExplainLabel(kp.label);
    const cached = explainCache[pointId] ?? analysis?.keyPointExplanations?.[pointId];
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

  const showTable = keyPointsByCategory.length > 0;

  return (
    <Panel aria-labelledby="key-points-title">
      <PanelHeader
        id="key-points-title"
        icon={ListChecks}
        title="Points clés et barème"
        count={totalPoints > 0 ? totalPoints : undefined}
        description={showTable ? 'Cochez « Compris » pour les critères que vous maîtrisez : ils le restent sur toutes les missions.' : undefined}
        actions={
          isStreaming ? (
            <StatusBadge tone="info" pulse>
              En cours
            </StatusBadge>
          ) : undefined
        }
      />
      <PanelBody padded={false}>
        {showTable ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className={`${HEAD} w-full pl-4`}>Point clé</TableHead>
                <TableHead className={HEAD}>Importance</TableHead>
                <TableHead className={`${HEAD} hidden lg:table-cell`}>Preuve attendue</TableHead>
                <TableHead className={`${HEAD} text-center`}>Compris</TableHead>
                <TableHead className={`${HEAD} pr-3 text-right`}>
                  <span className="sr-only">Expliquer</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keyPointsByCategory.map(([category, points]) => (
                <Fragment key={category}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={5} className="py-1.5 pl-4">
                      <span className="text-xs font-semibold text-foreground">{category}</span>
                      <span className="ml-2 font-mono text-xs tabular-nums text-muted-foreground">{points.length}</span>
                    </TableCell>
                  </TableRow>
                  {points.map((kp) => {
                    const aspect = (kp.aspect ?? 'other') as JobPostingKeyPointAspect;
                    const skillKey = kp.canonicalSkillKey?.trim() ? normalizeSkillKey(kp.canonicalSkillKey) : kp.id;
                    const understood = global_skill_keys_understood.includes(skillKey);
                    const weight = kp.requirementTier !== 'hard_constraint' ? formatWeight(kp.importanceWeight) : null;
                    const checkboxId = `understood-${kp.id}`;
                    return (
                      <TableRow key={kp.id} className="align-top hover:bg-muted/50">
                        <TableCell className="max-w-0 whitespace-normal py-2.5 pl-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">{kp.label}</span>
                              <span className="text-xs text-muted-foreground">{jobPostingAspectLabel(aspect)}</span>
                              {understood ? (
                                <StatusBadge tone="ok" className="h-5">
                                  <CheckCircle2 className="size-3" aria-hidden />
                                  Assimilé
                                </StatusBadge>
                              ) : null}
                            </div>
                            {kp.roleInMission ? (
                              <p className="text-xs leading-relaxed text-muted-foreground">{kp.roleInMission}</p>
                            ) : null}
                            {kp.valueSought?.trim() ? (
                              <p className="text-xs text-foreground">
                                <span className="text-muted-foreground">Exigence : </span>
                                {kp.valueSought}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex flex-col items-start gap-1">
                            <span className="flex items-center gap-1.5">
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">#{kp.importanceRank}</span>
                              {kp.requirementTier ? (
                                <StatusBadge tone={REQUIREMENT_TIER_TONE[kp.requirementTier]}>
                                  {REQUIREMENT_TIER_LABEL[kp.requirementTier]}
                                </StatusBadge>
                              ) : null}
                            </span>
                            {weight ? (
                              <span className="font-mono text-xs tabular-nums text-muted-foreground">poids {weight}</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-2.5 text-xs text-muted-foreground lg:table-cell">
                          {kp.evidenceTypeExpected ? EVIDENCE_TYPE_LABEL[kp.evidenceTypeExpected] : '—'}
                        </TableCell>
                        <TableCell className="py-2.5 text-center">
                          <Checkbox
                            id={checkboxId}
                            aria-label={`Compris : ${kp.label}`}
                            checked={understood}
                            onCheckedChange={(v) => toggleUnderstood.mutate({ pointId: kp.id, understood: v === true })}
                            disabled={toggleUnderstood.isPending}
                          />
                        </TableCell>
                        <TableCell className="py-2 pr-3 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            title="Explication contextualisée à cette fiche de poste"
                            aria-label={`Expliquer ${kp.label}`}
                            onClick={() => openExplain(kp)}
                          >
                            <BookOpen data-icon="inline-start" />
                            Expliquer
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        ) : isStreaming ? (
          <div className="flex flex-col gap-3 p-4" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className={`h-4 w-48 ${SKELETON}`} />
                  <Skeleton className={`h-3 w-72 ${SKELETON}`} />
                </div>
                <Skeleton className={`h-6 w-24 rounded-full ${SKELETON}`} />
              </div>
            ))}
          </div>
        ) : (
          <PanelEmpty
            icon={ListChecks}
            title="Aucun point clé pour l’instant."
            description="Les critères, leur importance et leur barème viennent de l’analyse de la fiche."
            action={
              <Button type="button" variant="outline" size="sm" onClick={onAnalyze} disabled={!canAnalyze || !onAnalyze}>
                Analyser la fiche
              </Button>
            }
          />
        )}
      </PanelBody>

      <Dialog
        open={explainOpen}
        onOpenChange={(o) => {
          setExplainOpen(o);
          if (!o) setExplainData(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>{explainLabel ?? 'Point clé'}</DialogTitle>
            <DialogDescription>Explication contextualisée à cette fiche de poste.</DialogDescription>
          </DialogHeader>
          {explainLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground" aria-live="polite">
              <Spinner />
              Génération…
            </div>
          ) : null}
          {!explainLoading && explainData ? (
            <div className="divide-y divide-border text-sm">
              <section className="flex flex-col gap-1 pb-4">
                <h4 className="text-xs font-semibold text-foreground">Définition</h4>
                <p className="whitespace-pre-wrap text-foreground">{explainData.definition}</p>
              </section>
              <section className="flex flex-col gap-1 py-4">
                <h4 className="text-xs font-semibold text-foreground">Dans cette mission</h4>
                <p className="whitespace-pre-wrap text-foreground">{explainData.usageInMission}</p>
              </section>
              <section className="flex flex-col gap-1 py-4">
                <h4 className="text-xs font-semibold text-foreground">Questions au candidat</h4>
                <ul className="flex flex-col gap-1 text-muted-foreground">
                  {explainData.candidateQuestions.map((q, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-[0.5rem] size-1 shrink-0 rounded-full bg-current opacity-60" aria-hidden />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="flex flex-col gap-2 pt-4">
                <h4 className="text-xs font-semibold text-foreground">Réponses attendues</h4>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                  <dt className="font-medium text-foreground">Débutant</dt>
                  <dd className="text-muted-foreground">{explainData.expectedAnswers.debutant}</dd>
                  <dt className="font-medium text-foreground">Confirmé</dt>
                  <dd className="text-muted-foreground">{explainData.expectedAnswers.confirme}</dd>
                  <dt className="font-medium text-foreground">Senior</dt>
                  <dd className="text-muted-foreground">{explainData.expectedAnswers.senior}</dd>
                </dl>
              </section>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
