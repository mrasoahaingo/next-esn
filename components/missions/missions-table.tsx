'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Briefcase, SearchX } from 'lucide-react';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PanelEmpty } from '@/components/dashboard/panel-empty';
import { formatRelativeDate } from '@/components/dashboard/dashboard-format';
import { scoreToneText } from '@/lib/utils/score-tone';
import { cn } from '@/lib/utils';
import {
  missionAnalysisStatus,
  summarizeMissionPositionings,
  type MissionListItem,
  type MissionListPositioning,
} from './missions-list';

const ROW =
  'cursor-pointer transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:bg-muted/50 motion-reduce:transition-none';
const TITLE_LINK =
  'truncate rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const OPEN_LINK =
  'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export type MissionsTableProps = {
  missions: MissionListItem[];
  positionings: MissionListPositioning[];
  /** Nombre total de missions (avant filtre), pour le compteur du panneau. */
  totalCount: number;
  /** La recherche ou le filtre ne laisse rien passer. */
  onClearFilters: () => void;
};

/**
 * Liste des missions dans un panneau : tableau à partir de `md` (intitulé et
 * entreprise, état de l'analyse de la fiche, positionnements et meilleur score,
 * date de création, actions), cartes compactes en dessous. La ligne entière ouvre
 * la mission ; l'intitulé est le lien réel.
 */
export function MissionsTable({ missions, positionings, totalCount, onClearFilters }: MissionsTableProps): React.JSX.Element {
  const count = missions.length === totalCount ? totalCount : `${missions.length} / ${totalCount}`;

  return (
    <Panel aria-labelledby="missions-table-title">
      <PanelHeader id="missions-table-title" icon={Briefcase} title="Fiches de mission" count={count} />
      <PanelBody padded={false}>
        {missions.length === 0 ? (
          <PanelEmpty
            icon={SearchX}
            title="Aucune mission ne correspond."
            description="Essayez un autre intitulé, une autre entreprise ou un autre état."
            action={
              <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
                Effacer les filtres
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DesktopTable missions={missions} positionings={positionings} />
            </div>
            <div className="md:hidden">
              <MobileList missions={missions} positionings={positionings} />
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}

function PositioningSummary({
  mission,
  positionings,
}: {
  mission: MissionListItem;
  positionings: MissionListPositioning[];
}): React.JSX.Element {
  const summary = summarizeMissionPositionings(mission, positionings);
  if (summary.count === 0) return <span className="font-mono text-xs text-muted-foreground">—</span>;
  return (
    <span className="font-mono text-xs tabular-nums text-muted-foreground">
      <span className="text-foreground">{summary.count}</span>
      {summary.best != null ? (
        <>
          {' '}· meilleur <span className={cn('font-semibold', scoreToneText(summary.best))}>{summary.best}</span>
        </>
      ) : null}
    </span>
  );
}

function DesktopTable({ missions, positionings }: Pick<MissionsTableProps, 'missions' | 'positionings'>): React.JSX.Element {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-9 pl-4 text-xs text-muted-foreground">Mission</TableHead>
          <TableHead className="h-9 text-xs text-muted-foreground">Analyse de la fiche</TableHead>
          <TableHead className="h-9 text-xs text-muted-foreground">Positionnements</TableHead>
          <TableHead className="h-9 text-xs text-muted-foreground">Créée</TableHead>
          <TableHead className="h-9 pr-3 text-right text-xs text-muted-foreground">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {missions.map((m) => {
          const status = missionAnalysisStatus(m);
          const href = `/positions/${m.id}`;
          const title = m.title.trim() || 'Sans intitulé';
          return (
            <TableRow key={m.id} onClick={() => router.push(href)} className={ROW}>
              <TableCell className="w-full max-w-0 py-2 pl-4">
                <span className="flex min-w-0 flex-col">
                  <Link href={href} onClick={(e) => e.stopPropagation()} className={TITLE_LINK}>
                    {title}
                  </Link>
                  {m.company ? <span className="truncate text-xs text-muted-foreground">{m.company}</span> : null}
                </span>
              </TableCell>
              <TableCell className="py-2">
                <StatusBadge tone={status.tone} pulse={status.pulse}>
                  {status.label}
                </StatusBadge>
              </TableCell>
              <TableCell className="py-2">
                <PositioningSummary mission={m} positionings={positionings} />
              </TableCell>
              <TableCell className="py-2 font-mono text-xs tabular-nums text-muted-foreground">
                <time dateTime={m.created_at} title={new Date(m.created_at).toLocaleString('fr-FR')}>
                  {formatRelativeDate(m.created_at)}
                </time>
              </TableCell>
              <TableCell className="py-2 pr-3 text-right">
                <Link
                  href={href}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Ouvrir la mission ${title}`}
                  title="Ouvrir"
                  className={OPEN_LINK}
                >
                  <ArrowUpRight className="size-4" />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function MobileList({ missions, positionings }: Pick<MissionsTableProps, 'missions' | 'positionings'>): React.JSX.Element {
  return (
    <ul className="divide-y divide-border">
      {missions.map((m) => {
        const status = missionAnalysisStatus(m);
        const href = `/positions/${m.id}`;
        const title = m.title.trim() || 'Sans intitulé';
        return (
          <li key={m.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={href} className={cn(TITLE_LINK, 'block min-h-11 min-w-0 flex-1 leading-5')}>
                {title}
                {m.company ? (
                  <span className="block truncate text-xs font-normal text-muted-foreground">{m.company}</span>
                ) : null}
              </Link>
              <StatusBadge tone={status.tone} pulse={status.pulse}>
                {status.label}
              </StatusBadge>
            </div>
            <div className="mt-1 flex items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
              <PositioningSummary mission={m} positionings={positionings} />
              <span aria-hidden>·</span>
              <time dateTime={m.created_at}>{formatRelativeDate(m.created_at)}</time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
