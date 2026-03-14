'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Loader2, Target, Clock, User } from 'lucide-react';

interface Positioning {
  id: string;
  candidate_id: string;
  job_description: string;
  status: string;
  analysis: {
    matchScore?: number;
    matchSummary?: string;
  } | null;
  created_at: string;
  candidates: {
    id: string;
    extracted_data: {
      personalInfo?: { firstName?: string; lastName?: string; title?: string };
    } | null;
  } | null;
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  analyzing: { label: 'Analyse...', variant: 'outline' },
  analyzed: { label: 'Analysé', variant: 'outline' },
  generating: { label: 'Génération...', variant: 'outline' },
  generated: { label: 'Généré', variant: 'default' },
  exported: { label: 'Exporté', variant: 'default' },
};

export function PositioningListSidebar() {
  const [positionings, setPositionings] = useState<Positioning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const params = useParams();

  const activePositioningId = params?.positioningId as string | undefined;

  useEffect(() => {
    fetch('/api/positioning')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPositionings(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const getCandidateName = (p: Positioning) => {
    const pi = p.candidates?.extracted_data?.personalInfo;
    if (pi?.firstName || pi?.lastName) {
      return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
    }
    return 'Candidat';
  };

  const getJobTitle = (jobDescription: string) => {
    const firstLine = jobDescription.trim().split('\n')[0];
    return firstLine.length > 50 ? firstLine.slice(0, 47) + '...' : firstLine;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-border bg-panel">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Positionnements</h2>
        <span className="text-xs text-muted-foreground">{positionings.length}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-xs">Chargement...</span>
          </div>
        ) : positionings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Target className="mb-2 h-6 w-6" />
            <p className="text-xs">Aucun positionnement</p>
            <p className="mt-1 text-[10px]">Ouvre un CV pour lancer un positionnement</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {positionings.map((p) => {
              const candidateName = getCandidateName(p);
              const jobTitle = getJobTitle(p.job_description);
              const st = statusConfig[p.status] ?? statusConfig.draft;
              const matchScore = p.analysis?.matchScore;
              const isActive = p.id === activePositioningId;

              return (
                <button
                  key={p.id}
                  onClick={() =>
                    router.push(
                      `/review/${p.candidate_id}/positioning/${p.id}`
                    )
                  }
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                    isActive
                      ? 'bg-violet/10 text-foreground'
                      : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      isActive
                        ? 'bg-violet/15 text-violet'
                        : 'bg-card/50 text-muted-foreground'
                    }`}
                  >
                    {matchScore != null ? (
                      <span className="text-[10px] font-bold">{matchScore}%</span>
                    ) : (
                      <Target className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium">
                        {candidateName}
                      </span>
                      <Badge
                        variant={st.variant}
                        className="shrink-0 text-[9px] px-1 py-0 leading-tight"
                      >
                        {st.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      {jobTitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
