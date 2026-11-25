import { Panel } from '@/components/app/panel';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON = 'motion-reduce:animate-none';

/** Squelette de la liste des missions : barre d'outils puis un panneau de lignes de tableau. */
export function MissionsSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement des missions">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Skeleton className={`h-8 w-full md:max-w-xs ${SKELETON}`} />
        <div className="flex gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className={`h-7 w-20 rounded-full ${SKELETON}`} />
          ))}
        </div>
      </div>
      <Panel>
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <Skeleton className={`size-4 rounded-sm ${SKELETON}`} />
          <Skeleton className={`h-4 w-32 ${SKELETON}`} />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className={`h-4 w-48 ${SKELETON}`} />
                <Skeleton className={`h-3 w-24 ${SKELETON}`} />
              </div>
              <Skeleton className={`h-6 w-24 rounded-full ${SKELETON}`} />
              <Skeleton className={`hidden h-3 w-20 md:block ${SKELETON}`} />
              <Skeleton className={`hidden h-3 w-14 md:block ${SKELETON}`} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
