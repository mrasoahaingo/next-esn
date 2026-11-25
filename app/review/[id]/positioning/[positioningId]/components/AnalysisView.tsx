'use client';

import { useState } from 'react';
import { AlertTriangle, Briefcase, ChevronDown, Gauge, Wrench } from 'lucide-react';
import type { PositioningAnalysis } from '@/lib/schema';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import { SectionShell } from '@/app/review/components/SectionShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { scoreToneText } from '@/lib/utils/score-tone';
import type { PositioningRecruiterAnswerEntry } from '@/lib/services/positioning.service';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';
import { cn } from '@/lib/utils';
import { countStrongSkills } from './matching-readout';
import {
  confidenceBadge,
  experienceRelevanceBadge,
  formatCount,
  formatStrongSkillsCount,
  skillRelevanceBadge,
} from './relevance-badge';

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

type SectionStatus = 'pending' | 'streaming' | 'done';

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
): SectionStatus {
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

/** Pied du panneau Score : le contexte recruteur du dernier calcul, replié par défaut. */
function RecruiterContextFooter({
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
    <details className="group/context border-t border-border">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-2.5 text-xs text-muted-foreground outline-none',
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden',
        )}
      >
        <span className="font-medium text-foreground">Contexte pris en compte</span>
        <span className="flex items-center gap-2 font-mono tabular-nums">
          {formatCount(total, 'note', 'notes')}
          <ChevronDown
            className="size-4 transition-transform duration-[220ms] ease-out group-open/context:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </span>
      </summary>
      <div className="border-t border-border px-4 py-4">
        <p className="text-xs text-muted-foreground">
          Notes et réponses qui ont servi au dernier calcul du score. Les ajouts du panneau Questions
          n’apparaissent ici qu’après une relance de l’analyse.
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          {(['candidat', 'client'] as const).map((aud) => {
            const subset = rows.filter((r) => r.audience === aud);
            if (!subset.length) return null;
            return (
              <div key={aud} className="min-w-0">
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
      </div>
    </details>
  );
}

type SkillMatch = NonNullable<PositioningAnalysis['skillMatches']>[number];

/** Une ligne du tableau des compétences : commentaire sur une ligne, dépliable (note détaillée). */
function SkillRow({ skill }: { skill: Partial<SkillMatch> }) {
  const [open, setOpen] = useState(false);
  const badge = skillRelevanceBadge(skill.relevance);
  const comment = skill.comment?.trim() ?? '';
  const note = skill.note?.trim() ?? '';
  const expandable = !!note || comment.length > 80;

  return (
    <TableRow
      className={cn(expandable && 'cursor-pointer', open && 'bg-muted/30 hover:bg-muted/30')}
      onClick={expandable ? () => setOpen((v) => !v) : undefined}
      aria-expanded={expandable ? open : undefined}
    >
      <TableCell className="whitespace-normal pl-4 align-top text-sm font-medium text-foreground">
        {skill.skill}
      </TableCell>
      <TableCell className="align-top">
        {badge ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge> : null}
      </TableCell>
      <TableCell className="w-full max-w-0 align-top">
        {comment ? (
          <p className={cn('text-sm text-muted-foreground', open ? 'whitespace-normal' : 'truncate')}>
            {comment}
          </p>
        ) : null}
        {open && note ? (
          <p className="mt-1.5 whitespace-normal text-xs leading-relaxed text-muted-foreground">{note}</p>
        ) : null}
      </TableCell>
      <TableCell className="pr-3 align-top">
        {expandable ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-expanded={open}
            aria-label={open ? 'Masquer le détail' : 'Afficher le détail'}
            className="text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            <ChevronDown
              className={cn(
                'transition-transform duration-[220ms] ease-out motion-reduce:transition-none',
                open && 'rotate-180',
              )}
            />
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

/**
 * Résultats de l'analyse en quatre panneaux (DESIGN.md § Révision v2) : Score en deux
 * colonnes (chiffre + fiabilité / texte), Compétences en tableau, Expériences et
 * Lacunes en listes. Pendant l'analyse, `SectionShell` vit dans le corps de chaque
 * panneau : l'en-tête reste, le corps attend ou dit « En cours ».
 */
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
  const confidence = confidenceBadge(analysis?.matchScoreConfidence);
  const confidenceNote = analysis?.matchScoreConfidenceNote?.trim();

  const skills = analysis?.skillMatches ?? [];
  const experiences = analysis?.experienceRelevance ?? [];
  const gaps = analysis?.gaps ?? [];

  const scoreStatus = getSectionStatus(
    analysis,
    isAnalyzing,
    'matchScore',
    ['skillMatches', 'experienceRelevance', 'gaps'],
    streamMeta,
  );
  const skillsStatus = getSectionStatus(analysis, isAnalyzing, 'skillMatches', [], streamMeta);
  const experiencesStatus = getSectionStatus(
    analysis,
    isAnalyzing,
    'experienceRelevance',
    ['skillMatches'],
    streamMeta,
  );
  const gapsStatus = getSectionStatus(
    analysis,
    isAnalyzing,
    'gaps',
    ['skillMatches', 'experienceRelevance'],
    streamMeta,
  );

  return (
    <div className="space-y-4">
      {/* Score — après le détail (synthèse streamée en dernier) */}
      <Panel aria-labelledby="analysis-score-heading">
        <PanelHeader
          id="analysis-score-heading"
          icon={Gauge}
          title="Score"
          actions={
            <>
              <AiGenerationInfoIcon
                variant="positioning_analysis"
                modelsLabel={modelsSummaryLabel}
                modelsByTask={modelsByTask}
                historyHref={aiInfoHistoryHref ?? undefined}
                historyLinkLabel={aiInfoHistoryLinkLabel ?? undefined}
                className="h-7 w-7"
              />
              {onReAnalyze && !isAnalyzing && analysis ? (
                <Button variant="outline" size="sm" onClick={onReAnalyze} disabled={reAnalyzeDisabled}>
                  Relancer l’analyse
                </Button>
              ) : null}
            </>
          }
        />
        <PanelBody>
          <SectionShell status={scoreStatus} label="Calcul du score…">
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-6">
              <div className="flex flex-col items-start gap-2.5">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={cn(
                      'font-mono text-4xl font-semibold leading-none tabular-nums tracking-[-0.01em]',
                      scoreClass,
                    )}
                  >
                    {score != null ? score : '—'}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">/ 100</span>
                </div>
                <Tooltip>
                  <TooltipTrigger
                    render={<StatusBadge tone={confidence.tone} className="cursor-help" tabIndex={0} />}
                  >
                    {confidence.label}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-sm">
                    {confidenceNote ? confidenceNote : 'Contexte non détaillé pour cette analyse.'}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="min-w-0 space-y-3">
                {analysis?.matchSummary ? (
                  <p className="text-sm leading-relaxed text-foreground">{analysis.matchSummary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune synthèse pour ce calcul.</p>
                )}

                {recruiterDraftsDifferFromSnapshot && (
                  <Alert className="border-warning/40 bg-warning/8 text-foreground">
                    <AlertTitle>Contexte modifié depuis ce calcul</AlertTitle>
                    <AlertDescription>
                      Le panneau Questions contient des réponses ou notes qui ne sont pas encore dans ce score.
                      Relancez l’analyse pour les prendre en compte.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </SectionShell>
        </PanelBody>
        {!hideRecruiterSnapshot && (
          <RecruiterContextFooter
            recruiterAnswerEntries={analysisSnapshotRecruiterEntries}
            onRemoveRecruiterAnswerEntry={onRemoveRecruiterAnswerEntry}
          />
        )}
      </Panel>

      {/* Compétences */}
      <Panel aria-labelledby="analysis-skills-heading">
        <PanelHeader
          id="analysis-skills-heading"
          icon={Wrench}
          title="Compétences"
          count={formatStrongSkillsCount(countStrongSkills(skills))}
        />
        <PanelBody padded={skillsStatus !== 'done'}>
          <SectionShell status={skillsStatus} label="Analyse des compétences…">
            {skills.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Aucune compétence évaluée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4 text-xs text-muted-foreground">Compétence</TableHead>
                    <TableHead className="text-xs text-muted-foreground">Niveau</TableHead>
                    <TableHead className="w-full text-xs text-muted-foreground">Commentaire</TableHead>
                    <TableHead className="pr-3">
                      <span className="sr-only">Détail</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map((sm, i) => (
                    <SkillRow key={`${sm.skill ?? ''}-${i}`} skill={sm} />
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionShell>
        </PanelBody>
      </Panel>

      {/* Expériences */}
      <Panel aria-labelledby="analysis-experiences-heading">
        <PanelHeader
          id="analysis-experiences-heading"
          icon={Briefcase}
          title="Expériences"
          count={experiences.length > 0 ? experiences.length : undefined}
        />
        <PanelBody padded={experiencesStatus !== 'done'}>
          <SectionShell status={experiencesStatus} label="Analyse des expériences…">
            {experiences.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Aucune expérience évaluée.</p>
            ) : (
              <ul className="divide-y divide-border">
                {experiences.map((er, i) => {
                  const badge = experienceRelevanceBadge(er.relevance);
                  return (
                    <li key={i} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-4">
                        <p className="min-w-0 flex-1 text-sm font-medium text-foreground">{er.experience}</p>
                        {badge ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge> : null}
                      </div>
                      {er.comment ? (
                        <p className="mt-1 text-sm text-muted-foreground">{er.comment}</p>
                      ) : null}
                      {er.note ? (
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{er.note}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionShell>
        </PanelBody>
      </Panel>

      {/* Lacunes */}
      <Panel aria-labelledby="analysis-gaps-heading">
        <PanelHeader
          id="analysis-gaps-heading"
          icon={AlertTriangle}
          title="Lacunes"
          count={formatCount(gaps.length, 'lacune', 'lacunes')}
        />
        <PanelBody padded={gapsStatus !== 'done'}>
          <SectionShell status={gapsStatus} label="Identification des lacunes…">
            {gaps.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Aucune lacune relevée.</p>
            ) : (
              <ul className="divide-y divide-border">
                {gaps.map((gapItem, i) => (
                  <li key={i} className="px-4 py-3">
                    <p className="text-sm text-foreground">
                      {typeof gapItem === 'string' ? gapItem : gapItem.gap}
                    </p>
                    {typeof gapItem !== 'string' && gapItem.note ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{gapItem.note}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </SectionShell>
        </PanelBody>
      </Panel>
    </div>
  );
}
