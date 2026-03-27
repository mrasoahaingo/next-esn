'use client';

import type { PositioningAnalysis } from '@/lib/schema';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import { SectionShell } from '@/app/review/components/SectionShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  matchScoreConfidenceBadgeClass,
  matchScoreConfidenceShortLabel,
} from '@/lib/utils/match-score-confidence';
import { MessageCircle, Building2, Trash2 } from 'lucide-react';
import type { PositioningRecruiterAnswerEntry } from '@/lib/services/positioning.service';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import type { StepStateRow } from '@/lib/workflow/compute-step-status';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';

interface AnalysisViewProps {
  analysis: Partial<PositioningAnalysis> | null;
  isAnalyzing: boolean;
  streamMeta?: PositioningAnalysisStreamMeta | null;
  onReAnalyze?: () => void;
  /**
   * Contexte recruteur **tel qu’injecté pour le dernier calcul** (colonne `analysis_recruiter_answers`),
   * pas la saisie live de l’affinage.
   */
  analysisSnapshotRecruiterEntries: Record<string, PositioningRecruiterAnswerEntry[]>;
  /** Masquer le bloc (ex. streaming : le snapshot du nouveau calcul n’est pas encore écrit). */
  hideRecruiterSnapshot?: boolean;
  onRemoveRecruiterAnswerEntry?: (key: string, entryId: string) => void;
  /** Affinage modifié par rapport au snapshot : relancer pour intégrer au score. */
  recruiterDraftsDifferFromSnapshot?: boolean;
  workflowStepRows?: StepStateRow[];
  workflowSummaryLine?: string | null;
  /** Identifiants gateway des modèles utilisés pour ce calcul (colonne `ai_analysis_models`). */
  modelsSummaryLabel?: string | null;
  /** Lien vers le positionnement (historique dans l’onglet dédié). */
  aiInfoHistoryHref?: string | null;
  aiInfoHistoryLinkLabel?: string | null;
}

function getRelevanceBadge(relevance: string) {
  switch (relevance) {
    case 'strong':
    case 'high':
      return <Badge className="bg-neon/15 text-neon border-neon/25 shrink-0">Fort</Badge>;
    case 'partial':
    case 'medium':
      return <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/25 shrink-0">Partiel</Badge>;
    case 'missing':
    case 'low':
      return <Badge className="bg-destructive/15 text-destructive border-destructive/25 shrink-0">Manquant</Badge>;
    default:
      return null;
  }
}

function hasData(analysis: Partial<PositioningAnalysis> | null, key: string): boolean {
  if (!analysis) return false;
  const val = (analysis as Record<string, unknown>)[key];
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'number') return true;
  return !!val;
}

function branchActiveForSection(
  sectionKey: string,
  meta: PositioningAnalysisStreamMeta | null | undefined,
): boolean {
  const b = meta?.activeBranches;
  if (!b?.length) return false;
  if (sectionKey === 'skillMatches') return b.includes('skills');
  if (sectionKey === 'experienceRelevance') return b.includes('experiences');
  if (sectionKey === 'gaps') return b.includes('gaps');
  if (sectionKey === 'matchScore') return b.includes('synthesis');
  return false;
}

/** Ordre logique d’affichage : compétences → expériences → lacunes → score (synthèse en dernier). */
function getSectionStatus(
  analysis: Partial<PositioningAnalysis> | null,
  isAnalyzing: boolean,
  key: string,
  prevKeys: string[],
  streamMeta?: PositioningAnalysisStreamMeta | null,
): 'pending' | 'streaming' | 'done' {
  if (!isAnalyzing) {
    if (hasData(analysis, key)) return 'done';
    // Après sauvegarde / rechargement : [] est un résultat valide (aucune ligne extraite), pas « en attente »
    const raw = analysis && (analysis as Record<string, unknown>)[key];
    if (Array.isArray(raw)) return 'done';
    return 'pending';
  }
  if (hasData(analysis, key)) return 'done';

  if (streamMeta?.activeBranches?.length && branchActiveForSection(key, streamMeta)) {
    return 'streaming';
  }

  const parallelPhase =
    streamMeta?.phase === 'extracting' && (streamMeta.activeBranches?.length ?? 0) > 0;
  if (parallelPhase) {
    return 'pending';
  }

  const allPrevDone = prevKeys.every((k) => hasData(analysis, k));
  return allPrevDone ? 'streaming' : 'pending';
}

const BRANCH_LABELS: Record<string, string> = {
  skills: 'Compétences',
  experiences: 'Expériences',
  gaps: 'Lacunes',
  questions: 'Questions',
  synthesis: 'Synthèse',
};

function parseAnswerKey(key: string): { audience: 'candidat' | 'client' | 'autre'; question: string } {
  if (key.startsWith('candidat:')) return { audience: 'candidat', question: key.slice('candidat:'.length) };
  if (key.startsWith('client:')) return { audience: 'client', question: key.slice('client:'.length) };
  return { audience: 'autre', question: key };
}

function formatEntryDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function RecruiterContextSection({
  recruiterAnswerEntries,
  onRemoveRecruiterAnswerEntry,
}: {
  recruiterAnswerEntries: Record<string, PositioningRecruiterAnswerEntry[]>;
  onRemoveRecruiterAnswerEntry?: (key: string, entryId: string) => void;
}) {
  const keys = Object.keys(recruiterAnswerEntries).filter((k) => (recruiterAnswerEntries[k]?.length ?? 0) > 0);
  if (keys.length === 0) return null;

  const sorted = [...keys].sort((a, b) => a.localeCompare(b, 'fr'));
  const rows = sorted.map((key) => ({
    key,
    question: parseAnswerKey(key).question,
    audience: parseAnswerKey(key).audience,
    items: recruiterAnswerEntries[key] ?? [],
  }));

  return (
    <section className="glass-panel p-6 rounded-2xl border border-violet/15">
      <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-overlay/10 pb-2">
        Contexte pris en compte pour ce calcul
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Ce bloc correspond aux notes et réponses qui ont servi au dernier calcul du score ci-dessus. Les
        ajouts dans l’onglet Questions & affinage n’apparaissent ici qu’après une relance d’analyse.
        Retirez une ligne si elle n’est plus pertinente pour les prochains échanges.
      </p>
      <div className="space-y-6">
        {(['candidat', 'client'] as const).map((aud) => {
          const subset = rows.filter((r) => r.audience === aud);
          if (!subset.length) return null;
          return (
            <div key={aud}>
              <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                {aud === 'candidat' ? (
                  <MessageCircle className="h-3.5 w-3.5 text-neon" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 text-violet" />
                )}
                {aud === 'candidat' ? 'Candidat' : 'Client'}
              </h4>
              <ul className="space-y-4">
                {subset.map(({ key, question, items }) => (
                  <li key={key} className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 text-sm">
                    <p className="font-medium text-foreground mb-2">{question}</p>
                    <ul className="space-y-2">
                      {items.map((e) => (
                        <li
                          key={e.id}
                          className="flex gap-2 rounded-md border border-border/40 bg-background/50 p-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {formatEntryDateShort(e.createdAt)}
                            </p>
                            <p className="mt-1 text-sm text-foreground/95 whitespace-pre-wrap leading-relaxed">
                              {e.text}
                            </p>
                          </div>
                          {onRemoveRecruiterAnswerEntry && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              title="Retirer cette note"
                              onClick={() => onRemoveRecruiterAnswerEntry(key, e.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AnalysisView({
  analysis,
  isAnalyzing,
  streamMeta,
  onReAnalyze,
  analysisSnapshotRecruiterEntries,
  hideRecruiterSnapshot,
  onRemoveRecruiterAnswerEntry,
  recruiterDraftsDifferFromSnapshot,
  workflowStepRows,
  workflowSummaryLine,
  modelsSummaryLabel,
  aiInfoHistoryHref,
  aiInfoHistoryLinkLabel,
}: AnalysisViewProps) {
  if (!analysis && !isAnalyzing) return null;

  const score = analysis?.matchScore;
  const scoreColor = score != null
    ? score >= 70 ? 'text-neon' : score >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
    : 'text-muted-foreground';

  const activeHint =
    isAnalyzing && streamMeta?.activeBranches?.length
      ? streamMeta.activeBranches.map((id) => BRANCH_LABELS[id] ?? id).join(' · ')
      : null;

  return (
    <div className="space-y-4">
      {workflowStepRows && workflowStepRows.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/30 px-3 py-3">
          <WorkflowStepList rows={workflowStepRows} summaryLine={workflowSummaryLine ?? null} />
        </div>
      )}
      {activeHint && !(workflowStepRows && workflowStepRows.length > 0) && (
        <div className="flex items-center gap-2 rounded-lg border border-violet/25 bg-violet/10 px-3 py-2 text-xs text-accent-foreground">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          <span>
            {streamMeta?.phase === 'synthesizing'
              ? 'Synthèse du score…'
              : 'Analyse en cours'}
            <span className="ml-1.5 text-violet dark:text-violet-200/90">({activeHint})</span>
          </span>
        </div>
      )}


      {/* Score — après le détail (synthèse streamée en dernier) */}
      <SectionShell
        status={getSectionStatus(
          analysis,
          isAnalyzing,
          'matchScore',
          ['skillMatches', 'experienceRelevance', 'gaps'],
          streamMeta,
        )}
        label="Calcul du score..."
      >
        <section className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <h3 className="text-lg font-semibold text-foreground truncate">Score de matching</h3>
              <AiGenerationInfoIcon
                variant="positioning_analysis"
                modelsLabel={modelsSummaryLabel}
                historyHref={aiInfoHistoryHref ?? undefined}
                historyLinkLabel={aiInfoHistoryLinkLabel ?? undefined}
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              {onReAnalyze && !isAnalyzing && analysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReAnalyze}
                  className="text-violet hover:text-violet hover:bg-violet/10 text-xs h-7 px-2"
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Relancer
                </Button>
              )}
              <span className={`text-3xl font-bold ${scoreColor}`}>
                {score != null ? `${score}%` : '—'}
              </span>
              {(analysis?.matchScoreConfidence != null || analysis?.matchScoreConfidenceNote) && (
                <Tooltip>
                  <TooltipTrigger
                    className={`cursor-help rounded-md border px-2 py-1 text-xs font-medium outline-none ${matchScoreConfidenceBadgeClass(analysis?.matchScoreConfidence)}`}
                  >
                    Fiabilité : {matchScoreConfidenceShortLabel(analysis?.matchScoreConfidence)}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm text-xs">
                    {analysis?.matchScoreConfidenceNote?.trim()
                      ? analysis.matchScoreConfidenceNote
                      : 'Contexte non détaillé pour cette analyse.'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          {analysis?.matchSummary && (
            <p className="text-sm text-foreground/90 leading-relaxed">{analysis.matchSummary}</p>
          )}
          {recruiterDraftsDifferFromSnapshot && (
            <p className="mt-3 text-xs text-amber-700 dark:text-amber-300/95 leading-relaxed rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2">
              L’onglet Questions & affinage contient des réponses ou notes qui ne sont pas encore dans ce
              calcul. Relancez l’analyse pour recalculer le score et mettre à jour le bloc « contexte »
              ci-dessous.
            </p>
          )}
        </section>
      </SectionShell>

      {!hideRecruiterSnapshot && (
        <RecruiterContextSection
          recruiterAnswerEntries={analysisSnapshotRecruiterEntries}
          onRemoveRecruiterAnswerEntry={onRemoveRecruiterAnswerEntry}
        />
      )}

      {/* Skills */}
      <SectionShell
        status={getSectionStatus(analysis, isAnalyzing, 'skillMatches', [], streamMeta)}
        label="Analyse des compétences..."
      >
        <section className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-overlay/10 pb-2">
            Compétences
          </h3>
          <div className="space-y-3">
            {(analysis?.skillMatches ?? []).map((sm, i) => (
              <div key={i} className="py-2 border-b border-border/60 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{sm.skill}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{sm.comment}</p>
                  </div>
                  {getRelevanceBadge(sm.relevance)}
                </div>
                {sm.note && (
                  <p className="mt-1.5 text-xs text-muted-foreground italic pl-3 border-l-2 border-overlay/10">
                    {sm.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </SectionShell>

      {/* Experiences */}
      <SectionShell
        status={getSectionStatus(
          analysis,
          isAnalyzing,
          'experienceRelevance',
          ['skillMatches'],
          streamMeta,
        )}
        label="Analyse des expériences..."
      >
        <section className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-overlay/10 pb-2">
            Pertinence des expériences
          </h3>
          <div className="space-y-3">
            {(analysis?.experienceRelevance ?? []).map((er, i) => (
              <div key={i} className="py-2 border-b border-border/60 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{er.experience}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{er.comment}</p>
                  </div>
                  {getRelevanceBadge(er.relevance)}
                </div>
                {er.note && (
                  <p className="mt-1.5 text-xs text-muted-foreground italic pl-3 border-l-2 border-overlay/10">
                    {er.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </SectionShell>

      {/* Gaps */}
      <SectionShell
        status={getSectionStatus(
          analysis,
          isAnalyzing,
          'gaps',
          ['skillMatches', 'experienceRelevance'],
          streamMeta,
        )}
        label="Identification des lacunes..."
      >
        <section className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-overlay/10 pb-2">
            Lacunes identifiées
          </h3>
          <div className="space-y-3">
            {(analysis?.gaps ?? []).map((gapItem, i) => (
              <div key={i} className="py-2 border-b border-border/60 last:border-0">
                <div className="flex items-start text-sm text-foreground">
                  <span className="mr-2 text-destructive mt-0.5 shrink-0">!</span>
                  {typeof gapItem === 'string' ? gapItem : gapItem.gap}
                </div>
                {typeof gapItem !== 'string' && gapItem.note && (
                  <p className="mt-1.5 text-xs text-muted-foreground italic pl-3 border-l-2 border-overlay/10 ml-4">
                    {gapItem.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </SectionShell>
    </div>
  );
}
