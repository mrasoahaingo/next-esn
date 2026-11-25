'use client';

import { FileText, Gauge, GitCompare, Timer } from 'lucide-react';
import { KpiCard } from '@/components/app/kpi-card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { scoreToneText } from '@/lib/utils/score-tone';
import { formatTimeSaved, plural } from './dashboard-format';
import { MINUTES_SAVED_PER_CV, type DashboardStats } from './dashboard-stats';

const NO_VALUE = '—';
const MUTED_VALUE = 'text-muted-foreground';

/**
 * Les quatre chiffres clés du tableau de bord, en cartes KPI. Sans donnée
 * (`stats` nul : premier lancement, mode démo), les quatre cartes affichent « — »
 * et la raison, pour que la page ait sa forme dès le début.
 */
export function DashboardKpis({ stats }: { stats: DashboardStats | null }): React.JSX.Element {
  const hasCvs = !!stats && stats.totalCvs > 0;
  const analyzedCount = stats?.analyzed.length ?? 0;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard
        icon={FileText}
        label="CV analysés"
        value={hasCvs ? stats.totalCvs : NO_VALUE}
        valueClassName={hasCvs ? undefined : MUTED_VALUE}
        hint={
          hasCvs
            ? `${stats.reviewingCvs} en relecture · ${stats.readyCvs} ${plural(stats.readyCvs, 'prêt')}`
            : 'Aucun CV importé'
        }
      />
      <KpiCard
        icon={GitCompare}
        label="Positionnements"
        value={stats && stats.totalPositionings > 0 ? stats.totalPositionings : NO_VALUE}
        valueClassName={stats && stats.totalPositionings > 0 ? undefined : MUTED_VALUE}
        hint={
          stats && stats.totalPositionings > 0
            ? `${analyzedCount} ${plural(analyzedCount, 'analysé')}`
            : 'Aucun positionnement'
        }
      />
      <KpiCard
        icon={Gauge}
        label="Score moyen"
        value={stats?.avgScore == null ? NO_VALUE : `${stats.avgScore} %`}
        valueClassName={stats?.avgScore == null ? MUTED_VALUE : scoreToneText(stats.avgScore)}
        hint={
          stats?.avgScore == null
            ? 'Aucun positionnement analysé'
            : `Sur ${analyzedCount} ${plural(analyzedCount, 'analyse')}`
        }
      />
      <KpiCard
        icon={Timer}
        label="Temps gagné"
        value={stats?.timeSavedMinutes == null ? NO_VALUE : formatTimeSaved(stats.timeSavedMinutes)}
        valueClassName={stats?.timeSavedMinutes == null ? MUTED_VALUE : undefined}
        hint={
          <Tooltip>
            <TooltipTrigger className="cursor-help rounded-sm font-mono tabular-nums underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              {stats?.timeSavedMinutes == null
                ? `— × ${MINUTES_SAVED_PER_CV} min`
                : `${stats.extractedCvs} CV × ${MINUTES_SAVED_PER_CV} min`}
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              {stats?.timeSavedMinutes == null ? (
                <p>
                  Aucun CV extrait pour l&rsquo;instant. Formule&nbsp;: {MINUTES_SAVED_PER_CV}&nbsp;min
                  d&rsquo;édition manuelle estimée par CV extrait.
                </p>
              ) : (
                <p>
                  {stats.extractedCvs} {plural(stats.extractedCvs, 'CV extrait')} × {MINUTES_SAVED_PER_CV}
                  &nbsp;min = {formatTimeSaved(stats.timeSavedMinutes)}. Compte les CV en relecture, prêts ou
                  générés.
                </p>
              )}
            </TooltipContent>
          </Tooltip>
        }
      />
    </div>
  );
}
