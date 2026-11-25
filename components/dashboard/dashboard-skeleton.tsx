import { Panel } from '@/components/app/panel';
import { Skeleton } from '@/components/ui/skeleton';

const SKELETON = 'motion-reduce:animate-none';

function PanelHeaderSkeleton({ titleWidth = 'w-40' }: { titleWidth?: string }): React.JSX.Element {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
      <Skeleton className={`size-4 rounded-sm ${SKELETON}`} />
      <Skeleton className={`h-4 ${titleWidth} ${SKELETON}`} />
    </div>
  );
}

/**
 * Squelette du tableau de bord, à la forme des panneaux : quatre cartes KPI,
 * le tableau des positionnements et les compétences à gauche, les trois
 * panneaux de droite. Pas de spinner centré.
 */
export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border bg-panel p-4 shadow-sm dark:shadow-none">
            <Skeleton className={`h-3 w-24 ${SKELETON}`} />
            <Skeleton className={`h-7 w-16 ${SKELETON}`} />
            <Skeleton className={`h-3 w-28 ${SKELETON}`} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <Panel>
            <PanelHeaderSkeleton titleWidth="w-48" />
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Skeleton className={`size-6 rounded-full ${SKELETON}`} />
                  <Skeleton className={`h-4 w-32 ${SKELETON}`} />
                  <Skeleton className={`h-4 flex-1 ${SKELETON}`} />
                  <Skeleton className={`h-4 w-8 ${SKELETON}`} />
                  <Skeleton className={`h-6 w-20 rounded-full ${SKELETON}`} />
                  <Skeleton className={`h-3 w-14 ${SKELETON}`} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeaderSkeleton titleWidth="w-52" />
            <div className="grid gap-x-8 gap-y-3 p-4 md:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className={`h-4 w-28 ${SKELETON}`} />
                  <Skeleton className={`h-1.5 flex-1 rounded-full ${SKELETON}`} />
                  <Skeleton className={`h-3 w-8 ${SKELETON}`} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <Panel>
            <PanelHeaderSkeleton titleWidth="w-32" />
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className={`h-6 w-24 rounded-full ${SKELETON}`} />
                    <Skeleton className={`h-4 w-6 ${SKELETON}`} />
                  </div>
                  <Skeleton className={`h-1.5 w-full rounded-full ${SKELETON}`} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeaderSkeleton titleWidth="w-24" />
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className={`size-6 rounded-full ${SKELETON}`} />
              <Skeleton className={`h-4 flex-1 ${SKELETON}`} />
              <Skeleton className={`h-6 w-16 rounded-full ${SKELETON}`} />
            </div>
          </Panel>
          <Panel>
            <PanelHeaderSkeleton titleWidth="w-40" />
            <div className="space-y-2.5 p-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className={`h-3 w-12 ${SKELETON}`} />
                  <Skeleton className={`h-4 flex-1 ${SKELETON}`} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
