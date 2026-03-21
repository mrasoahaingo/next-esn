'use client';

import type { PositioningAnalysis } from '@/lib/schema';
import type { PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import { SectionShell } from '@/app/review/components/SectionShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

interface AnalysisViewProps {
  analysis: Partial<PositioningAnalysis> | null;
  isAnalyzing: boolean;
  streamMeta?: PositioningAnalysisStreamMeta | null;
  onReAnalyze?: () => void;
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

export function AnalysisView({ analysis, isAnalyzing, streamMeta, onReAnalyze }: AnalysisViewProps) {
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
      {activeHint && (
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
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-foreground">Score de matching</h3>
            <div className="flex items-center gap-3">
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
            </div>
          </div>
          {analysis?.matchSummary && (
            <p className="text-sm text-foreground/90 leading-relaxed">{analysis.matchSummary}</p>
          )}
        </section>
      </SectionShell>
    </div>
  );
}
