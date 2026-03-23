'use client';

import { useLayoutEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Loader2 } from 'lucide-react';
import { useMissions } from '@/lib/queries';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

export default function PositionsIndexPage() {
  const router = useRouter();
  const { data: missionsData, isLoading } = useMissions();

  const missions = useMemo(
    () => (Array.isArray(missionsData) ? missionsData : []),
    [missionsData]
  );

  useLayoutEffect(() => {
    if (isLoading) return;
    if (missions.length === 1) {
      router.replace(`/positions/${missions[0].id}`);
    }
  }, [isLoading, missions, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Skeleton className="mx-auto h-4 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="w-full max-w-md border-dashed border-border/60 bg-card/40">
          <CardContent className="pt-6">
            <Empty className="min-h-0 border-0 p-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase />
                </EmptyMedia>
                <EmptyTitle>Aucune position</EmptyTitle>
                <EmptyDescription>
                  Crée une position depuis l&apos;onglet Positions dans la barre latérale, puis ouvre-la ici
                  ou dans la liste.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (missions.length === 1) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="w-full max-w-md border-dashed border-border/60 bg-card/40">
        <CardContent className="pt-6">
          <Empty className="min-h-0 border-0 p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Briefcase />
              </EmptyMedia>
              <EmptyTitle>Sélectionne une position</EmptyTitle>
              <EmptyDescription>
                Plusieurs missions sont disponibles — choisis-en une dans la barre latérale (onglet
                Positions).
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
