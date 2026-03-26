'use client';

import { useState, useCallback } from 'react';
import type { PositioningAnalysis } from '@/lib/schema';
import type { PositioningRecruiterAnswerEntry } from '@/lib/services/positioning.service';
import {
  POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY,
  POSITIONING_ANALYSIS_FREEFORM_CLIENT_KEY,
} from '@/lib/services/positioning.service';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Building2, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';

interface QuestionsPanelProps {
  analysis: Partial<PositioningAnalysis> | null;
  onNext: () => void;
  onReAnalyze?: () => void;
  isAnalyzing?: boolean;
  recruiterAnswerEntries: Record<string, PositioningRecruiterAnswerEntry[]>;
  appendRecruiterAnswer: (key: string, text: string) => void;
}

function formatEntryDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function QuestionHistoryBlock({
  questionKey,
  questionLabel,
  context,
  entries,
  draft,
  onDraftChange,
  onAppend,
  placeholder,
}: {
  questionKey: string;
  questionLabel: string;
  context: string;
  entries: PositioningRecruiterAnswerEntry[];
  draft: string;
  onDraftChange: (v: string) => void;
  onAppend: (key: string, text: string) => void;
  placeholder: string;
}) {
  const filled = entries.length > 0;
  return (
    <div className="space-y-2 pb-4 border-b border-border/60 last:border-0">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground min-w-0">{questionLabel}</p>
        {filled && (
          <Badge
            variant="outline"
            className="shrink-0 border-neon/30 bg-neon/10 text-[10px] font-medium text-neon uppercase tracking-wide"
          >
            Rempli
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{context}</p>
      {entries.map((e) => (
        <div
          key={e.id}
          className="rounded-lg border border-border/50 bg-background/30 px-3 py-2 text-sm"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
            {formatEntryDate(e.createdAt)}
          </p>
          <p className="text-sm text-foreground/95 whitespace-pre-wrap leading-relaxed">{e.text}</p>
        </div>
      ))}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Textarea
          value={draft}
          onChange={(ev) => onDraftChange(ev.target.value)}
          placeholder={placeholder}
          className="min-h-[60px] text-sm flex-1"
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="shrink-0"
          disabled={!draft.trim()}
          onClick={() => {
            const t = draft.trim();
            if (!t) return;
            onAppend(questionKey, t);
            onDraftChange('');
          }}
          title="Enregistré dans le contexte pour la prochaine relance d’analyse (pas dans l’onglet Résultats tant que vous n’avez pas relancé)."
        >
          Ajouter au contexte
        </Button>
      </div>
    </div>
  );
}

function QuestionList({
  items,
  type,
  recruiterAnswerEntries,
  drafts,
  setDraft,
  appendRecruiterAnswer,
  placeholder,
}: {
  items: { q: { question: string; context: string }; i: number }[];
  type: 'candidate' | 'client';
  recruiterAnswerEntries: Record<string, PositioningRecruiterAnswerEntry[]>;
  drafts: Record<string, string>;
  setDraft: (key: string, v: string) => void;
  appendRecruiterAnswer: (key: string, text: string) => void;
  placeholder: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune question pour cette section.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map(({ q, i }) => {
        const prefix = type === 'candidate' ? 'candidat' : 'client';
        const key = `${prefix}:${q.question}`;
        const draftKey = `${prefix}-${i}`;
        return (
          <QuestionHistoryBlock
            key={draftKey}
            questionKey={key}
            questionLabel={q.question}
            context={q.context}
            entries={recruiterAnswerEntries[key] ?? []}
            draft={drafts[draftKey] ?? ''}
            onDraftChange={(v) => setDraft(draftKey, v)}
            onAppend={appendRecruiterAnswer}
            placeholder={placeholder}
          />
        );
      })}
    </div>
  );
}

export function QuestionsPanel({
  analysis,
  onNext,
  onReAnalyze,
  isAnalyzing = false,
  recruiterAnswerEntries,
  appendRecruiterAnswer,
}: QuestionsPanelProps) {
  const [drafts, setDraftsState] = useState<Record<string, string>>({});
  const setDraft = useCallback((key: string, v: string) => {
    setDraftsState((prev) => ({ ...prev, [key]: v }));
  }, []);

  const allCandidate = analysis?.candidateQuestions ?? [];
  const allClient = analysis?.clientQuestions ?? [];

  const candidateIndexed = allCandidate.map((q, i) => ({ q, i }));
  const clientIndexed = allClient.map((q, i) => ({ q, i }));

  const hasEntry = (key: string) => (recruiterAnswerEntries[key]?.length ?? 0) > 0;

  const hasAnyAnswer =
    Object.values(recruiterAnswerEntries).some((arr) => arr && arr.length > 0);
  const hasUnanswered =
    allCandidate.some((q) => !hasEntry(`candidat:${q.question}`)) ||
    allClient.some((q) => !hasEntry(`client:${q.question}`));

  const nudgeText = !hasUnanswered
    ? hasAnyAnswer
      ? 'Relancez l’analyse pour que le score et l’onglet Résultats intègrent ce contexte (les ajouts ci-dessus ne s’y appliquent qu’après relance).'
      : 'Saisissez des réponses ou notes ici, puis relancez l’analyse : elles seront fusionnées avec l’existant et prises en compte pour le nouveau calcul.'
    : hasAnyAnswer
      ? 'Complétez les questions restantes ou relancez l’analyse pour recalculer le score avec vos notes.'
      : 'Ajoutez des réponses ou notes, puis utilisez « Relancer l’analyse » pour les intégrer au score et à l’onglet Résultats.';

  return (
    <div className="space-y-6">
      {onReAnalyze && (
        <div className="flex items-center justify-between rounded-xl border border-violet/20 bg-violet/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0 text-violet" />
            <p className="text-xs text-foreground/90">{nudgeText}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReAnalyze}
            disabled={isAnalyzing}
            className="ml-3 shrink-0 text-violet hover:text-violet hover:bg-violet/10 text-xs h-7 px-2.5"
          >
            <RefreshCw className={`mr-1.5 h-3 w-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Relancer l&apos;analyse
          </Button>
        </div>
      )}

      <section className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-overlay/10 pb-2 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-neon" />
          Questions candidat
        </h3>
        <QuestionList
          items={candidateIndexed}
          type="candidate"
          recruiterAnswerEntries={recruiterAnswerEntries}
          drafts={drafts}
          setDraft={setDraft}
          appendRecruiterAnswer={appendRecruiterAnswer}
          placeholder="Texte ajouté au contexte pour la prochaine relance (l’onglet Résultats se met à jour après relance)."
        />
        <div className="pt-4 mt-4 border-t border-border/60">
          <QuestionHistoryBlock
            questionKey={POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY}
            questionLabel="Contexte libre (candidat)"
            context="Informations complémentaires côté candidat — cumulées avec l’existant ; prises en compte au score après relance d’analyse."
            entries={recruiterAnswerEntries[POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY] ?? []}
            draft={drafts['free-c'] ?? ''}
            onDraftChange={(v) => setDraft('free-c', v)}
            onAppend={appendRecruiterAnswer}
            placeholder="Précisions sur le profil, contraintes…"
          />
        </div>
      </section>

      <section className="glass-panel p-6 rounded-2xl">
        <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-overlay/10 pb-2 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-violet" />
          Questions client
        </h3>
        <QuestionList
          items={clientIndexed}
          type="client"
          recruiterAnswerEntries={recruiterAnswerEntries}
          drafts={drafts}
          setDraft={setDraft}
          appendRecruiterAnswer={appendRecruiterAnswer}
          placeholder="Texte ajouté au contexte pour la prochaine relance (l’onglet Résultats se met à jour après relance)."
        />
        <div className="pt-4 mt-4 border-t border-border/60">
          <QuestionHistoryBlock
            questionKey={POSITIONING_ANALYSIS_FREEFORM_CLIENT_KEY}
            questionLabel="Contexte libre (demande client)"
            context="Informations complémentaires côté client / mission — cumulées avec l’existant ; prises en compte au score après relance d’analyse."
            entries={recruiterAnswerEntries[POSITIONING_ANALYSIS_FREEFORM_CLIENT_KEY] ?? []}
            draft={drafts['free-cl'] ?? ''}
            onDraftChange={(v) => setDraft('free-cl', v)}
            onAppend={appendRecruiterAnswer}
            placeholder="Contraintes client, environnement, attentes…"
          />
        </div>
      </section>

      {analysis?.matchSummary && (
        <section className="glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold text-foreground mb-4 border-b border-overlay/10 pb-2">
            Synthèse du matching
          </h3>
          <p className="text-sm text-foreground/90 leading-relaxed">{analysis.matchSummary}</p>
        </section>
      )}

      <div className="flex justify-end">
        <Button onClick={onNext}>
          Générer
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
