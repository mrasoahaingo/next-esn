'use client';

import Link from 'next/link';
import { Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    body:
      'Le document est transcrit puis structuré par modèles de langage (identité, expériences, compétences, etc.). Les modèles effectifs dépendent de la configuration « Modèles & tâches LLM » de votre organisation.',
    defaultHistoryHint:
      'L’usage détaillé par run est disponible pour les administrateurs dans les journaux côté plateforme.',
  },
  positioning_analysis: {
    title: 'Analyse de matching',
    body:
      'Le score et les blocs (compétences, expériences, synthèse) sont produits par plusieurs appels LLM en parallèle puis une synthèse. Les identifiants ci-dessous sont ceux du fournisseur (gateway).',
    defaultHistoryHint:
      'Les versions précédentes du calcul sont listées dans l’onglet « Historique » du positionnement.',
  },
  positioning_generate: {
    title: 'Génération (emails / CV)',
    body:
      'Les propositions de texte et le CV retravaillé sont générés par IA à partir de l’analyse et de vos consignes. Les modèles suivent la configuration des tâches de génération.',
    defaultHistoryHint:
      'Pour retrouver une version antérieure, utilisez l’historique d’analyse ou regénérez depuis l’assistant.',
  },
  mission_job_analysis: {
    title: 'Analyse de la fiche mission',
    body:
      'La fiche est structurée (barème, points clés, niveau attendu) via des appels LLM sur le texte de l’offre.',
    defaultHistoryHint:
      'Relancer l’analyse depuis la fiche mission remplace le résultat courant ; conservez une copie si besoin.',
  },
};

export interface AiGenerationInfoIconProps {
  variant: AiGenerationVariant;
  /** Identifiants gateway (ex. google/gemini-2.5-flash), séparés par des virgules si plusieurs. */
  modelsLabel?: string | null;
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
  historyHref,
  historyLinkLabel,
  historyHint,
  className,
  stopClickPropagation,
}: AiGenerationInfoIconProps) {
  const meta = COPY[variant];
  const modelsDisplay = modelsLabel?.trim() || 'Non renseigné';
  const hint = historyHint ?? (!historyHref ? meta.defaultHistoryHint : undefined);

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
            aria-label="Informations sur l’IA et les modèles"
            onClick={stopClickPropagation ? (e) => e.stopPropagation() : undefined}
          >
            <Cpu className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <TooltipContent
        side="bottom"
        className="max-w-sm border border-border bg-popover p-3 text-popover-foreground shadow-md text-xs space-y-2.5"
      >
        <p className="font-semibold leading-snug">{meta.title}</p>
        <p className="text-muted-foreground leading-relaxed">{meta.body}</p>
        <div className="rounded-md border border-border/60 bg-muted/40 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Modèles</p>
          <p className="font-mono text-[11px] break-all">{modelsDisplay}</p>
        </div>
        {historyHref ? (
          <Link
            href={historyHref}
            className="inline-flex text-violet hover:underline font-medium"
            onClick={stopClickPropagation ? (e) => e.stopPropagation() : undefined}
          >
            {historyLinkLabel ?? 'Voir le détail'}
          </Link>
        ) : null}
        {!historyHref && hint ? (
          <p className="text-muted-foreground leading-relaxed border-t border-border/40 pt-2">{hint}</p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}
