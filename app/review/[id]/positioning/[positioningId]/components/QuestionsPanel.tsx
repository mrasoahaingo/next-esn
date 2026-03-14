'use client';

import type { PositioningAnalysis } from '@/lib/schema';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageCircle, Building2 } from 'lucide-react';

interface QuestionsPanelProps {
  analysis: Partial<PositioningAnalysis> | null;
  onUpdateAnswer: (type: 'candidate' | 'client', index: number, answer: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function QuestionsPanel({
  analysis,
  onUpdateAnswer,
  onGenerate,
  isGenerating,
}: QuestionsPanelProps) {
  const candidateQuestions = analysis?.candidateQuestions ?? [];
  const clientQuestions = analysis?.clientQuestions ?? [];

  return (
    <div className="space-y-6">
      {/* Candidate questions */}
      <section className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-neon" />
          Questions candidat
        </h3>
        <div className="space-y-4">
          {candidateQuestions.map((q, i) => (
            <div key={i} className="space-y-2 pb-4 border-b border-white/5 last:border-0">
              <p className="text-sm font-medium text-white">{q.question}</p>
              <p className="text-xs text-slate-400">{q.context}</p>
              <Textarea
                value={q.answer ?? ''}
                onChange={(e) => onUpdateAnswer('candidate', i, e.target.value)}
                placeholder="Réponse du candidat... (laisser vide si N/A)"
                className="min-h-[60px] text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Client questions */}
      <section className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-violet" />
          Questions client
        </h3>
        <div className="space-y-4">
          {clientQuestions.map((q, i) => (
            <div key={i} className="space-y-2 pb-4 border-b border-white/5 last:border-0">
              <p className="text-sm font-medium text-white">{q.question}</p>
              <p className="text-xs text-slate-400">{q.context}</p>
              <Textarea
                value={q.answer ?? ''}
                onChange={(e) => onUpdateAnswer('client', i, e.target.value)}
                placeholder="Réponse... (laisser vide si N/A)"
                className="min-h-[60px] text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Match summary (editable) */}
      {analysis?.matchSummary && (
        <section className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-white mb-4 border-b border-white/10 pb-2">
            Synthèse du matching
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">{analysis.matchSummary}</p>
        </section>
      )}

      <div className="flex justify-end">
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Génération en cours...' : 'Générer le positionnement'}
        </Button>
      </div>
    </div>
  );
}
