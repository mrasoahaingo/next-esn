'use client';

import type { PositioningAnalysis } from '@/lib/schema';
import { SectionShell } from '@/app/review/components/SectionShell';
import { Badge } from '@/components/ui/badge';

interface AnalysisViewProps {
  analysis: Partial<PositioningAnalysis> | null;
  isAnalyzing: boolean;
}

function getRelevanceBadge(relevance: string) {
  switch (relevance) {
    case 'strong':
    case 'high':
      return <Badge className="bg-neon/15 text-neon border-neon/25 shrink-0">Fort</Badge>;
    case 'partial':
    case 'medium':
      return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 shrink-0">Partiel</Badge>;
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

function getSectionStatus(
  analysis: Partial<PositioningAnalysis> | null,
  isAnalyzing: boolean,
  key: string,
  prevKeys: string[],
): 'pending' | 'streaming' | 'done' {
  if (!isAnalyzing) return hasData(analysis, key) ? 'done' : 'pending';
  if (hasData(analysis, key)) return 'done';
  const allPrevDone = prevKeys.every((k) => hasData(analysis, k));
  return allPrevDone ? 'streaming' : 'pending';
}

export function AnalysisView({ analysis, isAnalyzing }: AnalysisViewProps) {
  if (!analysis && !isAnalyzing) return null;

  const score = analysis?.matchScore;
  const scoreColor = score != null
    ? score >= 70 ? 'text-neon' : score >= 40 ? 'text-amber-400' : 'text-destructive'
    : 'text-slate-500';

  return (
    <div className="space-y-4">
      {/* Score */}
      <SectionShell
        status={getSectionStatus(analysis, isAnalyzing, 'matchScore', [])}
        label="Calcul du score..."
      >
        <section className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-white">Score de matching</h3>
            <span className={`text-3xl font-bold ${scoreColor}`}>
              {score != null ? `${score}%` : '—'}
            </span>
          </div>
          {analysis?.matchSummary && (
            <p className="text-sm text-slate-300 leading-relaxed">{analysis.matchSummary}</p>
          )}
        </section>
      </SectionShell>

      {/* Skills */}
      <SectionShell
        status={getSectionStatus(analysis, isAnalyzing, 'skillMatches', ['matchScore'])}
        label="Analyse des compétences..."
      >
        <section className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
            Compétences
          </h3>
          <div className="space-y-3">
            {(analysis?.skillMatches ?? []).map((sm, i) => (
              <div key={i} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">{sm.skill}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{sm.comment}</p>
                  </div>
                  {getRelevanceBadge(sm.relevance)}
                </div>
                {sm.note && (
                  <p className="mt-1.5 text-xs text-slate-500 italic pl-3 border-l-2 border-white/10">
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
        status={getSectionStatus(analysis, isAnalyzing, 'experienceRelevance', ['matchScore', 'skillMatches'])}
        label="Analyse des expériences..."
      >
        <section className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
            Pertinence des expériences
          </h3>
          <div className="space-y-3">
            {(analysis?.experienceRelevance ?? []).map((er, i) => (
              <div key={i} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">{er.experience}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{er.comment}</p>
                  </div>
                  {getRelevanceBadge(er.relevance)}
                </div>
                {er.note && (
                  <p className="mt-1.5 text-xs text-slate-500 italic pl-3 border-l-2 border-white/10">
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
        status={getSectionStatus(analysis, isAnalyzing, 'gaps', ['matchScore', 'skillMatches', 'experienceRelevance'])}
        label="Identification des lacunes..."
      >
        <section className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
            Lacunes identifiées
          </h3>
          <div className="space-y-3">
            {(analysis?.gaps ?? []).map((gapItem, i) => (
              <div key={i} className="py-2 border-b border-white/5 last:border-0">
                <div className="flex items-start text-sm text-slate-300">
                  <span className="mr-2 text-destructive mt-0.5 shrink-0">!</span>
                  {typeof gapItem === 'string' ? gapItem : gapItem.gap}
                </div>
                {typeof gapItem !== 'string' && gapItem.note && (
                  <p className="mt-1.5 text-xs text-slate-500 italic pl-3 border-l-2 border-white/10 ml-4">
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
