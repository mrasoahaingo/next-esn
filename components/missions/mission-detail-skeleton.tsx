import { Panel } from '@/components/app/panel';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON = 'motion-reduce:animate-none';

function PanelSkeleton({ rows, className }: { rows: number; className?: string }): React.JSX.Element {
  return (
    <Panel className={className}>
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <Skeleton className={`size-4 rounded-sm ${SKELETON}`} />
        <Skeleton className={`h-4 w-32 ${SKELETON}`} />
      </div>
      <div className="flex flex-col gap-3 p-4">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className={`h-3 ${i % 3 === 2 ? 'w-2/3' : 'w-full'} ${SKELETON}`} />
        ))}
      </div>
    </Panel>
  );
}

/** Squelette du détail d'une mission : en-tête, barre d'onglets, diptyque. */
export function MissionDetailSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement de la mission">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className={`h-6 w-72 ${SKELETON}`} />
          <Skeleton className={`h-4 w-48 ${SKELETON}`} />
          <Skeleton className={`h-3 w-40 ${SKELETON}`} />
        </div>
        <div className="flex gap-2">
          <Skeleton className={`size-8 rounded-lg ${SKELETON}`} />
          <Skeleton className={`h-8 w-36 rounded-lg ${SKELETON}`} />
        </div>
      </div>
      <Panel className="px-4">
        <div className="flex gap-6 py-3">
          <Skeleton className={`h-4 w-28 ${SKELETON}`} />
          <Skeleton className={`h-4 w-36 ${SKELETON}`} />
        </div>
      </Panel>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <PanelSkeleton rows={8} />
          <PanelSkeleton rows={5} />
        </div>
        <div className="lg:col-span-5">
          <PanelSkeleton rows={6} />
        </div>
      </div>
    </div>
  );
}
