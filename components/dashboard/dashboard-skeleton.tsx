import { Skeleton } from '@/components/ui/skeleton';

const SKELETON = 'motion-reduce:animate-none';

/**
 * Squelette du tableau de bord, à la forme des blocs (ligne de faits, diptyque,
 * compétences). Pas de spinner centré : le lecteur voit déjà où les choses
 * vont se poser.
 */
export function DashboardSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="grid grid-cols-2 gap-x-6 border-y border-border sm:flex sm:gap-0 sm:divide-x sm:divide-border">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 py-4 sm:px-6 sm:first:pl-0">
            <Skeleton className={`h-7 w-16 ${SKELETON}`} />
            <Skeleton className={`h-3 w-24 ${SKELETON}`} />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Skeleton className={`h-5 w-48 ${SKELETON}`} />
          <div className="mt-4 divide-y divide-border">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <Skeleton className={`h-6 w-9 ${SKELETON}`} />
                <div className="flex-1 space-y-2">
                  <Skeleton className={`h-4 w-2/3 ${SKELETON}`} />
                  <Skeleton className={`h-3 w-16 ${SKELETON}`} />
                </div>
                <Skeleton className={`h-5 w-16 rounded-full ${SKELETON}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-8 lg:col-span-4">
          <div>
            <Skeleton className={`h-5 w-32 ${SKELETON}`} />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className={`h-4 w-full ${SKELETON}`} />
                  <Skeleton className={`h-1.5 w-full rounded-full ${SKELETON}`} />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className={`h-48 w-full rounded-xl ${SKELETON}`} />
        </div>
      </div>

      <div>
        <Skeleton className={`h-5 w-56 ${SKELETON}`} />
        <div className="mt-4 grid gap-x-10 gap-y-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className={`h-4 w-full ${SKELETON}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
