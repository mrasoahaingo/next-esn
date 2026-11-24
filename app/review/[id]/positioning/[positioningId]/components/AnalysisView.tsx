'use client';

import type { PositioningAnalysis } from '@/lib/schema';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import { SectionShell } from '@/app/review/components/SectionShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { matchScoreConfidenceShortLabel } from '@/lib/utils/match-score-confidence';
import { scoreToneText } from '@/lib/utils/score-tone';
import type { PositioningRecruiterAnswerEntry } from '@/lib/services/positioning.service';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';
import { normalizeRelevance } from './matching-readout';

interface AnalysisViewProps {
  analysis: Partial<PositioningAnalysis> | null;
  isAnalyzing: boolean;
  streamMeta?: PositioningAnalysisStreamMeta | null;
  onReAnalyze?: () => void;
  reAnalyzeDisabled?: boolean;
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
  /** Identifiants gateway des modèles utilisés pour ce calcul (colonne `ai_analysis_models`). */
  modelsSummaryLabel?: string | null;
  /** Détail par tâche LLM pour l'affichage dans le tooltip. */
  modelsByTask?: Record<string, string> | null;
  /** Lien vers le positionnement (historique dans l’onglet dédié). */
  aiInfoHistoryHref?: string | null;
  aiInfoHistoryLinkLabel?: string | null;
}

const RELEVANCE_TEXT: Record<'strong' | 'partial' | 'missing', { label: string; className: string }> = {
  strong: { label: 'Fort', className: 'text-success' },
  partial: { label: 'Partiel', className: 'text-warning' },
  missing: { label: 'Manquant', className: 'text-destructive' },
};

function RelevanceText({ relevance }: { relevance: string | undefined }) {
  const level = normalizeRelevance(relevance);
  if (!level) return null;
  const { label, className } = RELEVANCE_TEXT[level];
  return (
    <span className={`shrink-0 font-mono text-xs ${className}`}>{label}</span>
  );
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-border pb-2 text-[0.9375rem] font-semibold text-foreground">
      {children}
    </h3>
  );
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
  const total = rows.reduce((n, r) => n + r.items.length, 0);

  return (
    <details className="group border-b border-border pb-4">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 py-2 text-[0.9375rem] font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
        <span>Contexte pris en compte</span>
        <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">
          {total} note{total > 1 ? 's' : ''} · <span className="group-open:hidden">afficher</span>
          <span className="hidden group-open:inline">masquer</span>
        </span>
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Notes et réponses qui ont servi au dernier calcul du score. Les ajouts de l’onglet Questions
        n’apparaissent ici qu’après une relance de l’analyse.
      </p>
      <div className="mt-4 space-y-6">
        {(['candidat', 'client'] as const).map((aud) => {
          const subset = rows.filter((r) => r.audience === aud);
          if (!subset.length) return null;
          return (
            <div key={aud}>
              <h4 className="mb-2 text-sm font-medium text-foreground">
                {aud === 'candidat' ? 'Candidat' : 'Client'}
              </h4>
              <ul className="divide-y divide-border">
                {subset.map(({ key, question, items }) => (
                  <li key={key} className="py-3 text-sm">
                    <p className="font-medium text-foreground">{question}</p>
                    <ul className="mt-2 space-y-2">
                      {items.map((e) => (
                        <li key={e.id} className="flex gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-mono text-xs tabular-nums text-muted-foreground">
                              {formatEntryDateShort(e.createdAt)}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                              {e.text}
                            </p>
                          </div>
                          {onRemoveRecruiterAnswerEntry && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => onRemoveRecruiterAnswerEntry(key, e.id)}
                            >
                              Retirer
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
    </details>
  );
}

export function AnalysisView({
  analysis,
  isAnalyzing,
  streamMeta,
  onReAnalyze,
  reAnalyzeDisabled,
  analysisSnapshotRecruiterEntries,
  hideRecruiterSnapshot,
  onRemoveRecruiterAnswerEntry,
  recruiterDraftsDifferFromSnapshot,
  modelsSummaryLabel,
  modelsByTask,
  aiInfoHistoryHref,
  aiInfoHistoryLinkLabel,
}: AnalysisViewProps) {
  if (!analysis && !isAnalyzing) return null;

  const score = analysis?.matchScore;
  const scoreClass = score != null ? scoreToneText(score) : 'text-muted-foreground';
  const confidence = analysis?.matchScoreConfidence;
  const showConfidence = confidence != null || !!analysis?.matchScoreConfidenceNote;

  return (
    <div className="space-y-8">
      {/* Score — après le détail (synthèse streamée en dernier) */}
      <SectionShell
        status={getSectionStatus(
          analysis,
          isAnalyzing,
          'matchScore',
          ['skillMatches', 'experienceRelevance', 'gaps'],
          streamMeta,
        )}
        label="Calcul du score…"
      >
        <section aria-labelledby="analysis-score-heading" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-2">
            <div className="flex min-w-0 items-center gap-1">
              <h3 id="analysis-score-heading" className="text-[0.9375rem] font-semibold text-foreground">
                Score
              </h3>
              <AiGenerationInfoIcon
                variant="positioning_analysis"
                modelsLabel={modelsSummaryLabel}
                modelsByTask={modelsByTask}
                historyHref={aiInfoHistoryHref ?? undefined}
                historyLinkLabel={aiInfoHistoryLinkLabel ?? undefined}
              />
            </div>
            {onReAnalyze && !isAnalyzing && analysis && (
              <Button variant="outline" size="sm" onClick={onReAnalyze} disabled={reAnalyzeDisabled}>
                Relancer l’analyse
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={`font-mono text-[1.75rem] font-semibold leading-none tabular-nums ${scoreClass}`}>
              {score != null ? score : '—'}
            </span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">/ 100</span>
            {showConfidence ? (
              <Tooltip>
                <TooltipTrigger
                  render={<span className="cursor-help text-xs text-muted-foreground underline decoration-dotted underline-offset-4" tabIndex={0} />}
                >
                  Fiabilité {matchScoreConfidenceShortLabel(confidence).toLowerCase()}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-sm">
                  {analysis?.matchScoreConfidenceNote?.trim()
                    ? analysis.matchScoreConfidenceNote
                    : 'Contexte non détaillé pour cette analyse.'}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>

          {analysis?.matchSummary && (
            <p className="max-w-prose text-sm leading-relaxed text-foreground">{analysis.matchSummary}</p>
          )}

          {recruiterDraftsDifferFromSnapshot && (
            <Alert className="border-warning/40 bg-warning/8 text-foreground">
              <AlertTitle>Contexte modifié depuis ce calcul</AlertTitle>
              <AlertDescription>
                L’onglet Questions contient des réponses ou notes qui ne sont pas encore dans ce score.
                Relancez l’analyse pour les prendre en compte.
              </AlertDescription>
            </Alert>
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
        label="Analyse des compétences…"
      >
        <section aria-label="Compétences">
          <SectionHeading>Compétences</SectionHeading>
          <ul className="divide-y divide-border">
            {(analysis?.skillMatches ?? []).map((sm, i) => (
              <li key={i} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{sm.skill}</p>
                    {sm.comment ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{sm.comment}</p>
                    ) : null}
                  </div>
                  <RelevanceText relevance={sm.relevance} />
                </div>
                {sm.note && (
                  <p className="mt-1.5 text-xs text-muted-foreground">{sm.note}</p>
                )}
              </li>
            ))}
          </ul>
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
        label="Analyse des expériences…"
      >
        <section aria-label="Expériences">
          <SectionHeading>Expériences</SectionHeading>
          <ul className="divide-y divide-border">
            {(analysis?.experienceRelevance ?? []).map((er, i) => (
              <li key={i} className="py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{er.experience}</p>
                    {er.comment ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{er.comment}</p>
                    ) : null}
                  </div>
                  <RelevanceText relevance={er.relevance} />
                </div>
                {er.note && (
                  <p className="mt-1.5 text-xs text-muted-foreground">{er.note}</p>
                )}
              </li>
            ))}
          </ul>
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
        label="Identification des lacunes…"
      >
        <section aria-label="Lacunes">
          <SectionHeading>Lacunes</SectionHeading>
          {(analysis?.gaps ?? []).length === 0 && !isAnalyzing ? (
            <p className="py-3 text-sm text-muted-foreground">Aucune lacune relevée.</p>
          ) : (
            <ul className="list-disc space-y-2 py-3 pl-5 marker:text-muted-foreground">
              {(analysis?.gaps ?? []).map((gapItem, i) => (
                <li key={i} className="text-sm text-foreground">
                  {typeof gapItem === 'string' ? gapItem : gapItem.gap}
                  {typeof gapItem !== 'string' && gapItem.note && (
                    <p className="mt-1 text-xs text-muted-foreground">{gapItem.note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </SectionShell>
    </div>
  );
}
