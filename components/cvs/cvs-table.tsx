'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronRight, FileText, Plus, SearchX, Square } from 'lucide-react';
import { InitialsAvatar } from '@/components/app/initials-avatar';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PanelEmpty } from '@/components/dashboard/panel-empty';
import { formatRelativeDate } from '@/components/dashboard/dashboard-format';
import { scoreToneText } from '@/lib/utils/score-tone';
import { cn } from '@/lib/utils';
import { cvStatus, isCvWorkflowRunning, isPositioningWorkflowRunning, positioningStatus } from './cv-status';
import {
  candidateDate,
  candidateName,
  candidateTitle,
  positioningLabel,
  summarizePositionings,
  type CvListCandidate,
  type CvListPositioning,
} from './cvs-list';

const ROW =
  'cursor-pointer transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:bg-muted/50 motion-reduce:transition-none';
const NAME_LINK =
  'truncate rounded-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const SUB_LINK =
  'flex min-w-0 items-center gap-2 rounded-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const NEW_LINK =
  'inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export type CvsTableProps = {
  candidates: CvListCandidate[];
  positioningsByCandidate: Map<string, CvListPositioning[]>;
  /** Nombre total de candidats (avant filtre), pour le compteur du panneau. */
  totalCount: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onCancelCv: (c: CvListCandidate) => void;
  onCancelPositioning: (p: CvListPositioning) => void;
  isCancelling: boolean;
  /** La recherche ou le filtre ne laisse rien passer. */
  onClearFilters: () => void;
};

/**
 * Liste des candidats dans un panneau : tableau à partir de `md` (dépliage sur
 * les positionnements, statut, meilleur score, date, actions), cartes compactes
 * en dessous. La ligne entière ouvre la fiche ; le nom est le lien réel.
 */
export function CvsTable(props: CvsTableProps): React.JSX.Element {
  const { candidates, totalCount, onClearFilters } = props;
  const count = candidates.length === totalCount ? totalCount : `${candidates.length} / ${totalCount}`;

  return (
    <Panel aria-labelledby="cvs-table-title">
      <PanelHeader id="cvs-table-title" icon={FileText} title="Candidats" count={count} />
      <PanelBody padded={false}>
        {candidates.length === 0 ? (
          <PanelEmpty
            icon={SearchX}
            title="Aucun candidat ne correspond."
            description="Essayez un autre nom ou un autre statut."
            action={
              <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
                Effacer les filtres
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <DesktopTable {...props} />
            </div>
            <div className="md:hidden">
              <MobileList {...props} />
            </div>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}

function CancelButton({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  className?: string;
}): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn('text-destructive hover:bg-destructive/10 hover:text-destructive', className)}
    >
      <Square className="size-3.5" />
    </Button>
  );
}

function ExpandButton({ expanded, onToggle, name }: { expanded: boolean; onToggle: () => void; name: string }): React.JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-expanded={expanded}
      aria-label={expanded ? `Replier les positionnements de ${name}` : `Déplier les positionnements de ${name}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="text-muted-foreground"
    >
      <ChevronRight
        className={cn(
          'size-4 transition-transform duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
          expanded && 'rotate-90',
        )}
      />
    </Button>
  );
}

function PositioningSummary({ positionings }: { positionings: CvListPositioning[] | undefined }): React.JSX.Element {
  const summary = summarizePositionings(positionings);
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

function DesktopTable({
  candidates,
  positioningsByCandidate,
  expanded,
  onToggle,
  onCancelCv,
  onCancelPositioning,
  isCancelling,
}: CvsTableProps): React.JSX.Element {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-9 w-10 pl-3" aria-label="Déplier" />
          <TableHead className="h-9 text-xs text-muted-foreground">Candidat</TableHead>
          <TableHead className="h-9 text-xs text-muted-foreground">Statut</TableHead>
          <TableHead className="h-9 text-xs text-muted-foreground">Positionnements</TableHead>
          <TableHead className="h-9 text-xs text-muted-foreground">Mis à jour</TableHead>
          <TableHead className="h-9 pr-3 text-right text-xs text-muted-foreground">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((c) => {
          const name = candidateName(c);
          const title = candidateTitle(c);
          const status = cvStatus(c.status);
          const href = `/review/${c.id}`;
          const positionings = positioningsByCandidate.get(c.id) ?? [];
          const isExpanded = expanded.has(c.id);
          const canCancel = isCvWorkflowRunning(c.status) && !!c.workflow_run_id;
          const date = candidateDate(c);

          return [
            <TableRow key={c.id} onClick={() => router.push(href)} className={ROW}>
              <TableCell className="py-2 pl-3">
                {positionings.length > 0 ? (
                  <ExpandButton expanded={isExpanded} onToggle={() => onToggle(c.id)} name={name} />
                ) : null}
              </TableCell>
              <TableCell className="w-full max-w-0 py-2">
                <span className="flex items-center gap-2.5">
                  <InitialsAvatar name={name} />
                  <span className="flex min-w-0 flex-col">
                    <Link href={href} onClick={(e) => e.stopPropagation()} className={NAME_LINK}>
                      {name}
                    </Link>
                    {title ? <span className="truncate text-xs text-muted-foreground">{title}</span> : null}
                  </span>
                </span>
              </TableCell>
              <TableCell className="py-2">
                <StatusBadge tone={status.tone} pulse={status.pulse}>
                  {status.label}
                </StatusBadge>
              </TableCell>
              <TableCell className="py-2">
                <PositioningSummary positionings={positionings} />
              </TableCell>
              <TableCell className="py-2 font-mono text-xs tabular-nums text-muted-foreground">
                <time dateTime={date} title={new Date(date).toLocaleString('fr-FR')}>
                  {formatRelativeDate(date)}
                </time>
              </TableCell>
              <TableCell className="py-2 pr-3 text-right">
                <span className="inline-flex items-center justify-end gap-0.5">
                  {canCancel ? (
                    <CancelButton label={`Annuler l’extraction de ${name}`} onClick={() => onCancelCv(c)} disabled={isCancelling} />
                  ) : null}
                  <Link
                    href={href}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Ouvrir la fiche de ${name}`}
                    title="Ouvrir"
                    className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ArrowUpRight className="size-4" />
                  </Link>
                </span>
              </TableCell>
            </TableRow>,
            ...(isExpanded
              ? [
                  ...positionings.map((p) => {
                    const pStatus = positioningStatus(p.status);
                    const pHref = `/review/${c.id}/positioning/${p.id}`;
                    const score = p.analysis?.matchScore;
                    const pCanCancel = isPositioningWorkflowRunning(p.status) && !!p.workflow_run_id;
                    return (
                      <TableRow key={p.id} onClick={() => router.push(pHref)} className={cn(ROW, 'bg-muted/30 hover:bg-muted/50')}>
                        <TableCell className="py-2 pl-3" />
                        <TableCell className="w-full max-w-0 py-2 pl-8">
                          <Link href={pHref} onClick={(e) => e.stopPropagation()} className={SUB_LINK}>
                            <span className="truncate text-sm">{positioningLabel(p)}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="py-2">
                          <StatusBadge tone={pStatus.tone} pulse={pStatus.pulse}>
                            {pStatus.label}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="py-2 font-mono text-xs tabular-nums">
                          {score != null ? (
                            <span className={cn('font-semibold', scoreToneText(score))}>
                              <span className="sr-only">Score </span>
                              {score}
                              <span className="sr-only"> sur 100</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 font-mono text-xs tabular-nums text-muted-foreground">
                          <time dateTime={p.created_at}>{formatRelativeDate(p.created_at)}</time>
                        </TableCell>
                        <TableCell className="py-2 pr-3 text-right">
                          {pCanCancel ? (
                            <CancelButton
                              label={`Annuler ${pStatus.label.toLowerCase()}`}
                              onClick={() => onCancelPositioning(p)}
                              disabled={isCancelling}
                            />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  }),
                  <TableRow key={`${c.id}-new`} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell className="py-2 pl-3" />
                    <TableCell colSpan={5} className="py-2 pl-8">
                      <Link href={`/review/${c.id}/positioning`} className={NEW_LINK}>
                        <Plus className="size-3.5" aria-hidden />
                        Nouveau positionnement
                      </Link>
                    </TableCell>
                  </TableRow>,
                ]
              : []),
          ];
        })}
      </TableBody>
    </Table>
  );
}

function MobileList({
  candidates,
  positioningsByCandidate,
  expanded,
  onToggle,
  onCancelCv,
  onCancelPositioning,
  isCancelling,
}: CvsTableProps): React.JSX.Element {
  return (
    <ul className="divide-y divide-border">
      {candidates.map((c) => {
        const name = candidateName(c);
        const title = candidateTitle(c);
        const status = cvStatus(c.status);
        const href = `/review/${c.id}`;
        const positionings = positioningsByCandidate.get(c.id) ?? [];
        const isExpanded = expanded.has(c.id);
        const canCancel = isCvWorkflowRunning(c.status) && !!c.workflow_run_id;
        const date = candidateDate(c);

        return (
          <li key={c.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <InitialsAvatar name={name} className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={href} className={cn(NAME_LINK, 'block min-h-11 leading-5')}>
                    {name}
                    {title ? <span className="block truncate text-xs font-normal text-muted-foreground">{title}</span> : null}
                  </Link>
                  <StatusBadge tone={status.tone} pulse={status.pulse}>
                    {status.label}
                  </StatusBadge>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="flex items-center gap-2 font-mono text-xs tabular-nums text-muted-foreground">
                    <PositioningSummary positionings={positionings} />
                    <span aria-hidden>·</span>
                    <time dateTime={date}>{formatRelativeDate(date)}</time>
                  </span>
                  <span className="flex items-center gap-0.5">
                    {canCancel ? (
                      <CancelButton label={`Annuler l’extraction de ${name}`} onClick={() => onCancelCv(c)} disabled={isCancelling} />
                    ) : null}
                    {positionings.length > 0 ? (
                      <ExpandButton expanded={isExpanded} onToggle={() => onToggle(c.id)} name={name} />
                    ) : null}
                  </span>
                </div>
              </div>
            </div>
            {isExpanded ? (
              <ul className="mt-2 ml-11 divide-y divide-border border-t border-border">
                {positionings.map((p) => {
                  const pStatus = positioningStatus(p.status);
                  const score = p.analysis?.matchScore;
                  const pCanCancel = isPositioningWorkflowRunning(p.status) && !!p.workflow_run_id;
                  return (
                    <li key={p.id} className="flex items-center gap-2 py-2">
                      <Link href={`/review/${c.id}/positioning/${p.id}`} className={cn(SUB_LINK, 'min-h-9 flex-1')}>
                        {score != null ? (
                          <span className={cn('w-7 shrink-0 font-mono text-sm font-semibold tabular-nums', scoreToneText(score))}>
                            {score}
                          </span>
                        ) : (
                          <span className="w-7 shrink-0 font-mono text-sm text-muted-foreground">—</span>
                        )}
                        <span className="truncate text-sm">{positioningLabel(p)}</span>
                      </Link>
                      <StatusBadge tone={pStatus.tone} pulse={pStatus.pulse}>
                        {pStatus.label}
                      </StatusBadge>
                      {pCanCancel ? (
                        <CancelButton
                          label={`Annuler ${pStatus.label.toLowerCase()}`}
                          onClick={() => onCancelPositioning(p)}
                          disabled={isCancelling}
                        />
                      ) : null}
                    </li>
                  );
                })}
                <li className="py-2">
                  <Link href={`/review/${c.id}/positioning`} className={cn(NEW_LINK, 'min-h-9')}>
                    <Plus className="size-3.5" aria-hidden />
                    Nouveau positionnement
                  </Link>
                </li>
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
