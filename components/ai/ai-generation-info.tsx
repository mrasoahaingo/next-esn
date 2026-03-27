'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUpRight, Cpu, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AiGenerationVariant =
  | 'cv_extraction'
  | 'positioning_analysis'
  | 'positioning_generate'
  | 'mission_job_analysis';

const COPY: Record<
  AiGenerationVariant,
  { title: string; body: string; defaultHistoryHint: string }
> = {
  cv_extraction: {
    title: 'Extraction IA du CV',
    body: "Le document est transcrit puis structuré par modèles de langage (identité, expériences, compétences, etc.). Les modèles effectifs dépendent de la configuration « Modèles & tâches LLM » de votre organisation.",
    defaultHistoryHint:
      "L’usage détaillé par run est disponible pour les administrateurs dans les journaux côté plateforme.",
  },
  positioning_analysis: {
    title: 'Analyse de matching',
    body: "Le score et les blocs (compétences, expériences, synthèse) sont produits par plusieurs appels LLM en parallèle puis une synthèse. Les identifiants ci-dessous sont ceux du fournisseur (gateway).",
    defaultHistoryHint:
      "Les versions précédentes du calcul sont listées dans l’onglet « Historique » du positionnement.",
  },
  positioning_generate: {
    title: 'Génération (emails / CV)',
    body: "Les propositions de texte et le CV retravaillé sont générés par IA à partir de l’analyse et de vos consignes. Les modèles suivent la configuration des tâches de génération.",
    defaultHistoryHint:
      "Pour retrouver une version antérieure, utilisez l’historique d’analyse ou regénérez depuis l’assistant.",
  },
  mission_job_analysis: {
    title: 'Analyse de la fiche mission',
    body: "La fiche est structurée (barème, points clés, niveau attendu) via des appels LLM sur le texte de l’offre.",
    defaultHistoryHint:
      "Relancer l’analyse depuis la fiche mission remplace le résultat courant ; conservez une copie si besoin.",
  },
};

/** Libellés affichés dans le tooltip pour chaque clé de tâche LLM. */
const TASK_LABELS: Record<string, string> = {
  'cv.branch.identity': 'Identité',
  'cv.branch.experiences': 'Expériences',
  'cv.branch.education': 'Formation',
  'cv.branch.skills': 'Compétences',
  'positioning.analysis.skills': 'Compétences',
  'positioning.analysis.experiences': 'Expériences',
  'positioning.analysis.gaps': "Points d’attention",
  'positioning.analysis.questions': 'Questions',
  'positioning.analysis.synthesis': 'Synthèse',
  'positioning.generate.tailoredCv': 'CV retravaillé',
  'positioning.generate.email': 'Email recruteur',
  'positioning.generate.emailFirstContact': '1er contact',
  'positioning.generate.emailBullets': 'Points-clés',
  'positioning.generate.candidateEmail': 'Email candidat',
  'mission.jobPosting.executive': 'Vue générale',
  'mission.jobPosting.keyPoints': 'Points clés',
};

export interface AiGenerationInfoIconProps {
  variant: AiGenerationVariant;
  /** Identifiants gateway (ex. google/gemini-2.5-flash), séparés par des virgules si plusieurs. */
  modelsLabel?: string | null;
  /** Détail par tâche LLM : clé de tâche → identifiant gateway. Prioritaire sur modelsLabel pour l’affichage. */
  modelsByTask?: Record<string, string> | null;
  /** Lien vers l’historique ou l’écran détail (optionnel). */
  historyHref?: string | null;
  /** Texte du lien ; défaut : « Ouvrir… » selon le contexte. */
  historyLinkLabel?: string;
  /** Texte affiché sous les modèles si pas de lien (rappel où trouver l’historique). */
  historyHint?: string | null;
  className?: string;
  /** Pour empêcher la propagation du clic (lignes cliquables, etc.). */
  stopClickPropagation?: boolean;
}

/**
 * Icône discrète : détails sur l’IA (modèles, contexte, accès historique) dans un tooltip.
 */
export function AiGenerationInfoIcon({
  variant,
  modelsLabel,
  modelsByTask,
  historyHref,
  historyLinkLabel,
  historyHint,
  className,
  stopClickPropagation,
}: AiGenerationInfoIconProps) {
  const meta = COPY[variant];
  const hint = historyHint ?? (!historyHref ? meta.defaultHistoryHint : undefined);

  const byTaskEntries = modelsByTask ? Object.entries(modelsByTask) : [];
  const hasTaskBreakdown = byTaskEntries.length > 0;
  const modelCount = hasTaskBreakdown
    ? new Set(byTaskEntries.map(([, model]) => model.trim()).filter(Boolean)).size
    : modelsLabel?.trim()
      ? modelsLabel
          .split(',')
          .map((model) => model.trim())
          .filter(Boolean).length
      : 0;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className={cn(
              'h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground hover:bg-overlay/10',
              className,
            )}
            aria-label="Informations sur l'IA et les modèles"
            onClick={stopClickPropagation ? (e) => e.stopPropagation() : undefined}
          >
            <Cpu className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <TooltipContent
        side="bottom"
        className="flex w-[min(24rem,calc(100vw-1.5rem))] max-w-sm flex-col items-stretch gap-0 rounded-xl border border-border/70 bg-popover p-0 text-popover-foreground shadow-xl"
      >
        <div className="space-y-4 p-4">
          <div className="space-y-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-violet/20 bg-violet/10 text-violet">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="font-semibold leading-snug text-foreground">{meta.title}</p>
            <Badge variant="outline" className="h-5 w-fit border-border/70 bg-background/70 text-[10px]">
              {modelCount > 0
                ? `${modelCount} modèle${modelCount > 1 ? 's' : ''}`
                : 'Modèle non renseigné'}
            </Badge>
            <p className="max-w-[32ch] text-[12px] leading-5 text-muted-foreground">{meta.body}</p>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/35 p-3">
            <div className="mb-2 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Modèles utilisés
              </p>
              {hasTaskBreakdown ? (
                <Badge variant="secondary" className="h-5 bg-background/80 text-[10px] text-foreground">
                  {byTaskEntries.length} tâche{byTaskEntries.length > 1 ? 's' : ''}
                </Badge>
              ) : null}
            </div>
            {hasTaskBreakdown ? (
              <div className="space-y-2">
                {byTaskEntries.map(([taskKey, model]) => (
                  <div
                    key={taskKey}
                    className="rounded-lg border border-border/50 bg-background/80 px-2.5 py-2"
                  >
                    <p className="mb-1 text-[11px] font-medium leading-none text-foreground">
                      {TASK_LABELS[taskKey] ?? taskKey.split('.').pop()}
                    </p>
                    <p className="font-mono text-[11px] leading-4 break-all text-muted-foreground">
                      {model}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-border/50 bg-background/80 px-2.5 py-2 font-mono text-[11px] leading-4 break-all text-foreground">
                {modelsLabel?.trim() || 'Non renseigné'}
              </p>
            )}
          </div>
        </div>
        <Separator className="bg-border/60" />
        <div className="space-y-2 p-4 pt-3">
          {historyHref ? (
            <Link
              href={historyHref}
              className="inline-flex items-center gap-1 text-sm font-medium text-violet transition-colors hover:text-violet/80 hover:underline"
              onClick={stopClickPropagation ? (e) => e.stopPropagation() : undefined}
            >
              {historyLinkLabel ?? 'Voir le détail'}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
          {!historyHref && hint ? (
            <p className="text-[12px] leading-5 text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
