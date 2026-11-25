'use client';

import { useMemo, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InitialsAvatar } from '@/components/app/initials-avatar';
import { StatusBadge, type StatusTone } from '@/components/app/status-badge';
import { scoreToneText } from '@/lib/utils/score-tone';
import { cn } from '@/lib/utils';
import { getCandidateName, type MissionPositioning, type SkillMatch } from './mission-types';

type Relevance = 'strong' | 'partial' | 'missing' | 'high' | 'medium' | 'low';

const RELEVANCE: Record<Relevance, { label: string; tone: StatusTone }> = {
  strong: { label: 'Fort', tone: 'ok' },
  high: { label: 'Élevé', tone: 'ok' },
  partial: { label: 'Partiel', tone: 'warn' },
  medium: { label: 'Moyen', tone: 'warn' },
  missing: { label: 'Absent', tone: 'err' },
  low: { label: 'Faible', tone: 'err' },
};

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground">
        {title}
        {count != null ? <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{count}</span> : null}
      </h3>
      {children}
    </section>
  );
}

function SkillCategoryBar({ matches }: { matches: SkillMatch[] }): React.JSX.Element | null {
  const strong = matches.filter((m) => m.relevance === 'strong').length;
  const partial = matches.filter((m) => m.relevance === 'partial').length;
  const missing = matches.filter((m) => m.relevance === 'missing').length;
  const total = matches.length;
  if (!total) return null;
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        {strong > 0 ? <div className="h-full bg-success" style={{ width: `${(strong / total) * 100}%` }} /> : null}
        {partial > 0 ? <div className="h-full bg-warning" style={{ width: `${(partial / total) * 100}%` }} /> : null}
        {missing > 0 ? <div className="h-full bg-destructive/60" style={{ width: `${(missing / total) * 100}%` }} /> : null}
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
        <span className="text-success">{strong}</span> · <span className="text-warning">{partial}</span> ·{' '}
        <span className="text-destructive">{missing}</span>
      </span>
    </div>
  );
}

function CandidateColumn({ p, isBest }: { p: MissionPositioning; isBest: boolean }): React.JSX.Element {
  const candidate = p.candidates;
  const name = getCandidateName(candidate);
  const pi = candidate?.extracted_data?.personalInfo;
  const score = p.analysis?.matchScore;
  const rawSkillMatches = p.analysis?.skillMatches;
  const rawTechs = candidate?.extracted_data?.skills?.technologies;

  const byCategory = useMemo(() => {
    const map = new Map<string, SkillMatch[]>();
    for (const sm of rawSkillMatches ?? []) {
      const list = map.get(sm.category);
      if (list) list.push(sm);
      else map.set(sm.category, [sm]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rawSkillMatches]);

  const starredTech = useMemo(() => (rawTechs ?? []).filter((t) => t.starred).slice(0, 8), [rawTechs]);

  const skillMatches = rawSkillMatches ?? [];
  const strongMatches = [...skillMatches.filter((m) => m.relevance === 'strong')].sort((a, b) => a.skill.localeCompare(b.skill));
  const partialMatches = [...skillMatches.filter((m) => m.relevance === 'partial')].sort((a, b) => a.skill.localeCompare(b.skill));
  const order = { high: 0, medium: 1, low: 2 } as const;
  const sortedExps = [...(p.analysis?.experienceRelevance ?? [])].sort((a, b) => order[a.relevance] - order[b.relevance]);
  const gaps = p.analysis?.gaps ?? [];
  const facts = [pi?.yearsOfExperience, pi?.availability, pi?.location].filter((f): f is string => !!f?.trim());

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-border bg-panel">
      <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-t-xl border-b border-border bg-panel p-4">
        <div className="flex items-start gap-3">
          <InitialsAvatar name={name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            {pi?.title ? <p className="truncate text-xs text-muted-foreground">{pi.title}</p> : null}
          </div>
          {score != null ? (
            <span className={cn('font-mono text-2xl font-semibold tabular-nums tracking-[-0.01em]', scoreToneText(score))}>
              {score}
              <span className="sr-only"> sur 100</span>
            </span>
          ) : (
            <span className="font-mono text-2xl text-muted-foreground">—</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {isBest ? <StatusBadge tone="ok">Meilleur score</StatusBadge> : null}
          {facts.length > 0 ? (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{facts.join(' · ')}</span>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-border p-4">
        {byCategory.length > 0 ? (
          <Section title="Compétences par catégorie">
            <ul className="flex flex-col gap-2">
              {byCategory.map(([cat, matches]) => (
                <li key={cat} className="flex flex-col gap-1">
                  <span className="text-xs text-foreground">{cat}</span>
                  <SkillCategoryBar matches={matches} />
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {strongMatches.length > 0 ? (
          <Section title="Points forts" count={strongMatches.length}>
            <ul className="flex flex-col gap-1.5">
              {strongMatches.map((m) => (
                <li key={m.skill} className="flex flex-col">
                  <span className="text-xs font-medium text-foreground">{m.skill}</span>
                  {m.comment ? <span className="text-xs text-muted-foreground">{m.comment}</span> : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {partialMatches.length > 0 ? (
          <Section title="Compétences partielles" count={partialMatches.length}>
            <ul className="flex flex-col gap-1.5">
              {partialMatches.map((m) => (
                <li key={m.skill} className="flex flex-col">
                  <span className="text-xs text-foreground">{m.skill}</span>
                  {m.comment ? <span className="text-xs text-muted-foreground">{m.comment}</span> : null}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {sortedExps.length > 0 ? (
          <Section title="Expériences pertinentes" count={sortedExps.length}>
            <ul className="flex flex-col gap-1.5">
              {sortedExps.map((e, i) => (
                <li key={i} className="flex items-start gap-2">
                  <StatusBadge tone={RELEVANCE[e.relevance].tone} className="h-5">
                    {RELEVANCE[e.relevance].label}
                  </StatusBadge>
                  <span className="min-w-0 flex-1 text-xs text-foreground">{e.experience}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {gaps.length > 0 ? (
          <Section title="Points manquants" count={gaps.length}>
            <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
              {gaps.map((g, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-current opacity-60" aria-hidden />
                  <span>{g.gap}</span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        {starredTech.length > 0 ? (
          <Section title="Technologies clés">
            <ul className="flex flex-wrap gap-1.5">
              {starredTech.map((t) => (
                <li key={t.name} className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                  {t.name}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Comparaison de deux à quatre profils prêts, côte à côte : même colonne pour
 * chacun (avatar, score, compétences par catégorie, points forts, partiels,
 * expériences, lacunes, technologies). Le meilleur score porte une pastille ;
 * aucune couleur par candidat.
 */
export function CompareCvsDialog({
  open,
  onOpenChange,
  positionings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  positionings: MissionPositioning[];
}): React.JSX.Element {
  const count = positionings.length;
  const gridCols =
    count <= 2 ? 'grid-cols-1 md:grid-cols-2' : count === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4';

  const bestIndex = positionings.reduce(
    (best, p, i) => ((p.analysis?.matchScore ?? 0) > (positionings[best]?.analysis?.matchScore ?? 0) ? i : best),
    0,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[calc(100dvh-3rem)] max-h-[1000px] flex-col gap-0 overflow-hidden bg-shell p-0 sm:max-w-[min(1600px,calc(100vw-3rem))]">
        <DialogHeader className="shrink-0 border-b border-border bg-panel px-6 py-4 text-left">
          <DialogTitle>Comparaison de {count} candidat{count > 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            {count > 1 ? 'Mêmes critères, côte à côte. Le meilleur score est signalé.' : 'Aucun candidat sélectionné.'}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {count === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Cochez au moins deux profils prêts.</p>
          ) : (
            <div className={cn('grid items-start gap-4', gridCols)}>
              {positionings.map((p, i) => (
                <CandidateColumn key={p.id} p={p} isBest={i === bestIndex && count > 1} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
