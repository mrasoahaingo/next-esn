'use client';

import type { ReactNode } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { PanelEmpty } from '@/components/dashboard/panel-empty';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';
import { EXPERTISE_BAND_LABEL } from './mission-format';
import type { MissionJobAnalysisState } from './use-mission-job-analysis';

function Section({ title, children }: { title: string; children: ReactNode }): React.JSX.Element {
  return (
    <section className="flex flex-col gap-1.5 py-4 first:pt-0 last:pb-0">
      <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function BulletList({ items, tone = 'muted' }: { items: string[]; tone?: 'muted' | 'destructive' }): React.JSX.Element {
  return (
    <ul className={tone === 'destructive' ? 'flex flex-col gap-1 text-xs text-destructive' : 'flex flex-col gap-1 text-xs text-muted-foreground'}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-current opacity-60" aria-hidden />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

const SKELETON = 'motion-reduce:animate-none';

function PendingSection({ title }: { title: string }): React.JSX.Element {
  return (
    <Section title={title}>
      <div className="flex flex-col gap-1.5" aria-hidden>
        <Skeleton className={`h-3 w-full ${SKELETON}`} />
        <Skeleton className={`h-3 w-4/5 ${SKELETON}`} />
      </div>
    </Section>
  );
}

/**
 * Panneau « Synthèse » de la mission : ce que l'analyse de la fiche dit du
 * poste, hors points clés (niveau attendu, résumé cadre, mots-clés de matching,
 * questions au client, points de vigilance). Pendant l'analyse, les sections
 * arrivent au fil de l'eau ; ce qui manque est un squelette calme.
 */
export function MissionSynthesisPanel({
  state,
  hasDescription,
}: {
  state: MissionJobAnalysisState;
  hasDescription: boolean;
}): React.JSX.Element {
  const { analysis, phase, isStreaming, models, analyze, canAnalyze, hasPersisted } = state;
  const level = analysis?.expectedExpertiseLevel;
  const showContent = !!analysis && (hasPersisted || isStreaming);
  const relaunchLabel = phase === 'stale' ? 'Relancer l’analyse' : 'Réanalyser la fiche';

  const relaunch = (
    <Button type="button" variant="outline" size="sm" onClick={analyze} disabled={!canAnalyze}>
      <RotateCcw data-icon="inline-start" />
      {relaunchLabel}
    </Button>
  );

  return (
    <Panel aria-labelledby="mission-synthesis-title">
      <PanelHeader
        id="mission-synthesis-title"
        icon={Sparkles}
        title="Synthèse"
        description={phase === 'stale' ? 'La fiche a changé depuis cette analyse.' : undefined}
        actions={
          <>
            <AiGenerationInfoIcon
              variant="mission_job_analysis"
              modelsLabel={models?.label}
              modelsByTask={models?.byTask}
              className="size-7"
            />
            {hasPersisted && !isStreaming ? (
              canAnalyze ? (
                relaunch
              ) : (
                <Tooltip>
                  <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>{relaunch}</TooltipTrigger>
                  <TooltipContent side="bottom">Une analyse est déjà en cours</TooltipContent>
                </Tooltip>
              )
            ) : null}
          </>
        }
      />
      <PanelBody padded={showContent}>
        {!showContent ? (
          <PanelEmpty
            icon={Sparkles}
            title={
              phase === 'running'
                ? 'Analyse en cours.'
                : phase === 'failed'
                  ? 'L’analyse n’a pas abouti.'
                  : 'Fiche pas encore analysée.'
            }
            description={
              !hasDescription
                ? 'Ajoutez du texte à la fiche de poste pour lancer une analyse.'
                : phase === 'running'
                  ? 'La synthèse apparaîtra ici dès que l’IA aura lu la fiche.'
                  : 'L’IA en tire le niveau attendu, les points clés et leur barème.'
            }
            action={
              phase === 'running' ? (
                <StatusBadge tone="info" pulse>
                  En cours
                </StatusBadge>
              ) : (
                <Button type="button" size="sm" onClick={analyze} disabled={!canAnalyze || !hasDescription}>
                  {phase === 'failed' ? 'Relancer l’analyse' : 'Analyser la fiche'}
                </Button>
              )
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {level?.summary?.trim() ? (
              <Section title="Niveau attendu">
                <div className="flex flex-wrap items-center gap-1.5">
                  {level.interpretedBand ? (
                    <StatusBadge tone={level.interpretedBand === 'unclear' ? 'neutral' : 'info'}>
                      {EXPERTISE_BAND_LABEL[level.interpretedBand]}
                    </StatusBadge>
                  ) : null}
                  {level.hardOnLevel ? <StatusBadge tone="err">Non négociable</StatusBadge> : null}
                  {level.minYearsHint != null ? (
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {level.minYearsHint} an{level.minYearsHint > 1 ? 's' : ''} min. selon la fiche
                    </span>
                  ) : null}
                </div>
                {level.statedLevel?.trim() ? (
                  <p className="text-sm font-medium text-foreground">{level.statedLevel}</p>
                ) : null}
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{level.summary}</p>
                {(level.signalsFromPosting?.length ?? 0) > 0 ? (
                  <div className="mt-1 flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">Signaux dans la fiche</p>
                    <BulletList items={level.signalsFromPosting ?? []} />
                  </div>
                ) : null}
                {(level.recruiterCalibrationQuestions?.length ?? 0) > 0 ? (
                  <div className="mt-1 flex flex-col gap-1">
                    <p className="text-xs font-medium text-muted-foreground">Questions pour calibrer avec le client</p>
                    <BulletList items={level.recruiterCalibrationQuestions ?? []} />
                  </div>
                ) : null}
              </Section>
            ) : isStreaming ? (
              <PendingSection title="Niveau attendu" />
            ) : null}

            {analysis?.executiveSummary?.trim() ? (
              <Section title="Résumé">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{analysis.executiveSummary}</p>
              </Section>
            ) : isStreaming ? (
              <PendingSection title="Résumé" />
            ) : null}

            {analysis?.cvSearchKeywords && analysis.cvSearchKeywords.length > 0 ? (
              <Section title="Mots-clés de matching">
                <ul className="flex flex-wrap gap-1.5">
                  {analysis.cvSearchKeywords.map((kw, i) => (
                    <li
                      key={`${kw}-${i}`}
                      className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {kw}
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {analysis?.openQuestions && analysis.openQuestions.length > 0 ? (
              <Section title="À clarifier avec le client">
                <BulletList items={analysis.openQuestions} />
              </Section>
            ) : null}

            {analysis?.redFlags && analysis.redFlags.length > 0 ? (
              <Section title="Points de vigilance">
                <BulletList items={analysis.redFlags} tone="destructive" />
              </Section>
            ) : null}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
