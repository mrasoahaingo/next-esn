'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GitCompare } from 'lucide-react';
import { InitialsAvatar } from '@/components/app/initials-avatar';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { buttonVariants } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { positioningStatus } from '@/components/cvs/cv-status';
import { scoreToneText } from '@/lib/utils/score-tone';
import { cn } from '@/lib/utils';
import {
  candidateDisplayName,
  formatDurationMs,
  formatDurationSeconds,
  formatRelativeDate,
  jobTitleFromDescription,
} from './dashboard-format';
import type { DashboardPositioning, TimeByOperation } from './dashboard-stats';
import { PanelEmpty } from './panel-empty';

const ROW_LINK =
  'rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * Derniers positionnements analysés, en tableau dans un panneau : avatar et
 * candidat, mission, score en mono coloré par `scoreTone()`, statut, date
 * relative. La ligne entière est cliquable ; le nom est le lien réel (clavier).
 * Le pied donne le temps passé par opération quand il est mesuré.
 */
export function RecentPositionings({
  items,
  analyzedCount,
  timeByOperation,
}: {
  items: DashboardPositioning[];
  analyzedCount: number;
  timeByOperation: TimeByOperation;
}): React.JSX.Element {
  const router = useRouter();
  const timeEntries = buildTimeEntries(timeByOperation);

  return (
    <Panel aria-labelledby="recent-positionings-title">
      <PanelHeader
        id="recent-positionings-title"
        icon={GitCompare}
        title="Derniers positionnements"
        count={analyzedCount > 0 ? analyzedCount : undefined}
        actions={
          <Link href="/cvs" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground')}>
            Tout voir
          </Link>
        }
      />
      <PanelBody padded={false}>
        {items.length === 0 ? (
          <PanelEmpty
            icon={GitCompare}
            title="Aucun positionnement analysé."
            description="Choisissez un candidat, collez une fiche de poste : le score apparaît ici."
            action={{ label: 'Créer un positionnement', href: '/cvs' }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 pl-4 text-xs text-muted-foreground">Candidat</TableHead>
                <TableHead className="h-9 text-xs text-muted-foreground">Mission</TableHead>
                <TableHead className="h-9 text-right text-xs text-muted-foreground">Score</TableHead>
                <TableHead className="h-9 text-xs text-muted-foreground">Statut</TableHead>
                <TableHead className="h-9 pr-4 text-right text-xs text-muted-foreground">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => {
                const href = `/review/${p.candidate_id}/positioning/${p.id}`;
                const score = p.analysis?.matchScore ?? 0;
                const name = p.candidates ? candidateDisplayName(p.candidates.extracted_data) : 'Candidat';
                const status = positioningStatus(p.status);
                return (
                  <TableRow
                    key={p.id}
                    onClick={() => router.push(href)}
                    className="cursor-pointer transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:bg-muted/50 motion-reduce:transition-none"
                  >
                    <TableCell className="py-2.5 pl-4">
                      <span className="flex items-center gap-2.5">
                        <InitialsAvatar name={name} size="sm" />
                        <Link href={href} onClick={(e) => e.stopPropagation()} className={ROW_LINK}>
                          {name}
                        </Link>
                      </span>
                    </TableCell>
                    <TableCell className="w-full max-w-0 py-2.5 text-muted-foreground">
                      <span className="block truncate">{jobTitleFromDescription(p.job_description, 80)}</span>
                    </TableCell>
                    <TableCell
                      className={cn('py-2.5 text-right font-mono text-sm font-semibold tabular-nums', scoreToneText(score))}
                    >
                      <span className="sr-only">Score </span>
                      {score}
                      <span className="sr-only"> sur 100</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <StatusBadge tone={status.tone} pulse={status.pulse}>
                        {status.label}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="py-2.5 pr-4 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      <time dateTime={p.created_at} title={new Date(p.created_at).toLocaleString('fr-FR')}>
                        {formatRelativeDate(p.created_at)}
                      </time>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </PanelBody>
      {timeEntries.length > 0 ? (
        <PanelFooter className="flex-wrap">
          <span className="shrink-0">Temps par opération</span>
          <dl className="flex min-w-0 flex-wrap gap-x-3 gap-y-0.5 font-mono tabular-nums">
            {timeEntries.map((entry) => (
              <div key={entry.label} className="flex gap-1">
                <dt>{entry.label}</dt>
                <dd className="text-foreground">{entry.value}</dd>
              </div>
            ))}
          </dl>
        </PanelFooter>
      ) : null}
    </Panel>
  );
}

function buildTimeEntries(time: TimeByOperation): { label: string; value: string }[] {
  const entries: { label: string; value: string }[] = [];
  if (time.aiExtractionMs > 0) entries.push({ label: 'Extraction IA', value: formatDurationMs(time.aiExtractionMs) });
  if (time.aiAnalysisMs > 0) entries.push({ label: 'Analyse IA', value: formatDurationMs(time.aiAnalysisMs) });
  if (time.aiGenerationMs > 0) entries.push({ label: 'Génération IA', value: formatDurationMs(time.aiGenerationMs) });
  if (time.userReviewSeconds > 0) {
    entries.push({ label: 'Relecture', value: formatDurationSeconds(time.userReviewSeconds) });
  }
  if (time.userPositioningSeconds > 0) {
    entries.push({ label: 'Édition', value: formatDurationSeconds(time.userPositioningSeconds) });
  }
  return entries;
}
