'use client';

import { useState, useEffect } from 'react';
import { FileText, Target, TrendingUp, Clock, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Stats {
  totalCvs: number;
  readyCvs: number;
  totalPositionings: number;
  generatedPositionings: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalCvs: 0,
    readyCvs: 0,
    totalPositionings: 0,
    generatedPositionings: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/candidates').then((r) => r.json()),
      fetch('/api/positioning').then((r) => r.json()),
    ])
      .then(([candidates, positionings]) => {
        const cvs = Array.isArray(candidates) ? candidates : [];
        const pos = Array.isArray(positionings) ? positionings : [];
        setStats({
          totalCvs: cvs.length,
          readyCvs: cvs.filter(
            (c: { status: string }) => c.status === 'ready' || c.status === 'generated'
          ).length,
          totalPositionings: pos.length,
          generatedPositionings: pos.filter(
            (p: { status: string }) => p.status === 'generated' || p.status === 'exported'
          ).length,
        });
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const statCards = [
    {
      icon: FileText,
      label: 'CVs analysés',
      value: stats.totalCvs,
      accent: 'text-accent bg-accent/15',
    },
    {
      icon: TrendingUp,
      label: 'CVs finalisés',
      value: stats.readyCvs,
      accent: 'text-neon bg-neon/15',
    },
    {
      icon: Target,
      label: 'Positionnements',
      value: stats.totalPositionings,
      accent: 'text-violet bg-violet/15',
    },
    {
      icon: Clock,
      label: 'Temps estimé gagné',
      value: `${stats.totalCvs * 40 + stats.generatedPositionings * 90}min`,
      accent: 'text-primary bg-primary/15',
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold title-gradient">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vue d'ensemble de l'activité Himeo CV
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-xl glass-panel p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-xl font-bold text-foreground ${isLoading ? 'animate-pulse' : ''}`}>
                      {isLoading ? '–' : card.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{card.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card/50">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Sélectionne un CV ou ajoute-en un nouveau
            </p>
            <p className="mt-0.5 text-xs">
              Utilise le bouton + dans la barre latérale
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
