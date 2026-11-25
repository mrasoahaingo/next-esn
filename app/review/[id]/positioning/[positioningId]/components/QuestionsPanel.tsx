'use client';

import { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import type { PositioningAnalysis } from '@/lib/schema';
import type { PositioningRecruiterAnswerEntry } from '@/lib/services/positioning.service';
import {
  POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY,
  POSITIONING_ANALYSIS_FREEFORM_CLIENT_KEY,
} from '@/lib/services/positioning.service';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { formatCount } from './relevance-badge';

interface QuestionsPanelProps {
  analysis: Partial<PositioningAnalysis> | null;
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
  const textareaId = `question-${questionKey.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  return (
    <li className="space-y-2 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={textareaId} className="min-w-0 text-sm font-medium text-foreground">
          {questionLabel}
        </label>
        {filled && (
          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
            {formatCount(entries.length, 'note', 'notes')}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{context}</p>
      {entries.length > 0 ? (
        <ul className="space-y-2 border-l-2 border-border pl-3">
          {entries.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatEntryDate(e.createdAt)}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap leading-relaxed text-foreground">{e.text}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Textarea
          id={textareaId}
          value={draft}
          onChange={(ev) => onDraftChange(ev.target.value)}
          placeholder={placeholder}
          className="min-h-[60px] flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={!draft.trim()}
          onClick={() => {
            const t = draft.trim();
            if (!t) return;
            onAppend(questionKey, t);
            onDraftChange('');
          }}
          title="Enregistré dans le contexte pour la prochaine relance d’analyse."
        >
          Ajouter au contexte
        </Button>
      </div>
    </li>
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
    return <li className="px-4 py-3 text-sm text-muted-foreground">Aucune question pour cette section.</li>;
  }

  return (
    <>
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
    </>
  );
}

function ColumnHeading({ id, children, count }: { id: string; children: React.ReactNode; count: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-border bg-panel-soft px-4 py-2">
      <h3 id={id} className="text-xs font-semibold text-foreground">
        {children}
      </h3>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

/**
 * Panneau « Questions » : les questions candidat et client issues de l'analyse, en deux
 * colonnes, avec le contexte ajouté par le recruteur. La phrase de nudge est la
 * description de l'en-tête ; « Relancer l'analyse » est la seule action du panneau.
 */
export function QuestionsPanel({
  analysis,
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
      ? 'Relancez l’analyse pour que le score intègre ce contexte.'
      : 'Vos réponses et notes sont prises en compte au prochain calcul du score.'
    : hasAnyAnswer
      ? 'Complétez les questions restantes, puis relancez l’analyse pour recalculer le score.'
      : 'Ajoutez des réponses ou des notes, puis relancez l’analyse pour les intégrer au score.';

  const placeholder = 'Réponse ou note, prise en compte à la prochaine relance.';
  const total = allCandidate.length + allClient.length;

  return (
    <Panel aria-labelledby="questions-heading">
      <PanelHeader
        id="questions-heading"
        icon={MessageSquare}
        title="Questions"
        count={total > 0 ? total : undefined}
        description={nudgeText}
        actions={
          onReAnalyze ? (
            <Button variant="outline" size="sm" onClick={onReAnalyze} disabled={isAnalyzing}>
              Relancer l’analyse
            </Button>
          ) : undefined
        }
      />
      <PanelBody padded={false} className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-border">
        <section aria-labelledby="questions-candidate-heading" className="min-w-0">
          <ColumnHeading id="questions-candidate-heading" count={allCandidate.length}>
            Candidat
          </ColumnHeading>
          <ul className="divide-y divide-border">
            <QuestionList
              items={candidateIndexed}
              type="candidate"
              recruiterAnswerEntries={recruiterAnswerEntries}
              drafts={drafts}
              setDraft={setDraft}
              appendRecruiterAnswer={appendRecruiterAnswer}
              placeholder={placeholder}
            />
            <QuestionHistoryBlock
              questionKey={POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY}
              questionLabel="Contexte libre (candidat)"
              context="Informations complémentaires côté candidat, cumulées avec l’existant."
              entries={recruiterAnswerEntries[POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY] ?? []}
              draft={drafts['free-c'] ?? ''}
              onDraftChange={(v) => setDraft('free-c', v)}
              onAppend={appendRecruiterAnswer}
              placeholder="Précisions sur le profil, contraintes…"
            />
          </ul>
        </section>

        <section
          aria-labelledby="questions-client-heading"
          className="min-w-0 border-t border-border lg:border-t-0"
        >
          <ColumnHeading id="questions-client-heading" count={allClient.length}>
            Client
          </ColumnHeading>
          <ul className="divide-y divide-border">
            <QuestionList
              items={clientIndexed}
              type="client"
              recruiterAnswerEntries={recruiterAnswerEntries}
              drafts={drafts}
              setDraft={setDraft}
              appendRecruiterAnswer={appendRecruiterAnswer}
              placeholder={placeholder}
            />
            <QuestionHistoryBlock
              questionKey={POSITIONING_ANALYSIS_FREEFORM_CLIENT_KEY}
              questionLabel="Contexte libre (demande client)"
              context="Informations complémentaires côté client ou mission, cumulées avec l’existant."
              entries={recruiterAnswerEntries[POSITIONING_ANALYSIS_FREEFORM_CLIENT_KEY] ?? []}
              draft={drafts['free-cl'] ?? ''}
              onDraftChange={(v) => setDraft('free-cl', v)}
              onAppend={appendRecruiterAnswer}
              placeholder="Contraintes client, environnement, attentes…"
            />
          </ul>
        </section>
      </PanelBody>
    </Panel>
  );
}
