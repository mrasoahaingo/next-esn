import Link from 'next/link';
import { CircleAlert, FileText } from 'lucide-react';
import { InitialsAvatar } from '@/components/app/initials-avatar';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';
import { StatusBadge } from '@/components/app/status-badge';
import { formatRelativeDate } from './dashboard-format';
import type { ToReviewItem } from './dashboard-stats';

/**
 * « À reprendre » : les CV en cours ou en échec et les positionnements en échec,
 * échecs d'abord, chaque ligne étant un lien direct. Toujours affiché : quand il
 * n'y a rien, une ligne « Tout est à jour » (ce n'est pas un vide à corriger).
 */
export function ToReview({ items }: { items: ToReviewItem[] }): React.JSX.Element {
  return (
    <Panel aria-labelledby="to-review-title">
      <PanelHeader
        id="to-review-title"
        icon={CircleAlert}
        title="À reprendre"
        count={items.length > 0 ? items.length : undefined}
      />
      <PanelBody padded={false}>
        {items.length === 0 ? (
          <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 text-xs text-muted-foreground">
            <StatusBadge tone="ok">Tout est à jour</StatusBadge>
            <span>Aucun CV ni positionnement en attente.</span>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const isError = item.tone === 'error';
              return (
                <li key={`${item.kind}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none motion-reduce:transition-none"
                  >
                    {item.candidateName ? (
                      <InitialsAvatar name={item.candidateName} size="sm" />
                    ) : (
                      <span
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                        aria-hidden
                      >
                        <FileText className="size-3.5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {item.candidateName ?? (item.kind === 'cv' ? `CV du ${formatRelativeDate(item.created_at)}` : 'Positionnement')}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.kind === 'positioning' && item.candidateName ? 'Positionnement · ' : ''}
                        {item.reason} · {formatRelativeDate(item.created_at)}
                      </span>
                    </span>
                    <StatusBadge tone={isError ? 'err' : 'warn'} pulse={!isError && item.reason === 'Extraction en cours'}>
                      {isError ? 'Échec' : 'En cours'}
                    </StatusBadge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}
