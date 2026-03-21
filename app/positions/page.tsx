'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Loader2 } from 'lucide-react';
import { useMissions } from '@/lib/queries';

export default function PositionsIndexPage() {
  const router = useRouter();
  const { data: missionsData, isLoading } = useMissions();

  const missions = useMemo(
    () => (Array.isArray(missionsData) ? missionsData : []),
    [missionsData]
  );

  useEffect(() => {
    if (isLoading) return;
    if (missions.length === 1) {
      router.replace(`/positions/${missions[0].id}`);
    }
  }, [isLoading, missions, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (missions.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/50">
          <Briefcase className="h-5 w-5 opacity-60" />
        </div>
        <p className="text-sm font-medium text-foreground">Aucune position</p>
        <p className="max-w-sm text-xs">
          Crée une position depuis l&apos;onglet Positions dans la barre latérale, puis ouvre-la ici ou dans la liste.
        </p>
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/50">
        <Briefcase className="h-5 w-5 opacity-60" />
      </div>
      <p className="text-sm font-medium text-foreground">Sélectionne une position</p>
      <p className="max-w-sm text-xs">
        Plusieurs missions sont disponibles — choisis-en une dans la barre latérale (onglet Positions).
      </p>
    </div>
  );
}
