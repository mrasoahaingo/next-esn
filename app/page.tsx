'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Upload,
  Loader2,
  Sparkles,
  FileText,
  Clock,
  ChevronRight,
  User,
  Briefcase,
  Target,
  TrendingUp,
  Plus,
} from 'lucide-react';

interface Candidate {
  id: string;
  status: string;
  extracted_data: {
    personalInfo?: { firstName?: string; lastName?: string; title?: string };
    experiences?: { role?: string; company?: string }[];
  } | null;
  created_at: string;
  original_file_url: string;
}

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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  uploaded: { label: 'Uploadé', variant: 'secondary' },
  extracting: { label: 'Extraction...', variant: 'outline' },
  reviewing: { label: 'En revue', variant: 'outline' },
  ready: { label: 'Prêt', variant: 'default' },
  generated: { label: 'Généré', variant: 'default' },
};

const positioningStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  analyzed: { label: 'Analysé', variant: 'outline' },
  answered: { label: 'Répondu', variant: 'outline' },
  generated: { label: 'Généré', variant: 'default' },
};

export default function Dashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positionings, setPositionings] = useState<Positioning[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true);
  const [isLoadingPositionings, setIsLoadingPositionings] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/candidates')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setCandidates(data); })
      .catch(console.error)
      .finally(() => setIsLoadingCandidates(false));

    fetch('/api/positioning')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setPositionings(data); })
      .catch(console.error)
      .finally(() => setIsLoadingPositionings(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      router.push(`/review/${data.id}`);
    } catch (error) {
      console.error(error);
      setIsUploading(false);
    }
  };

  const getCandidateName = (c: Candidate) => {
    const pi = c.extracted_data?.personalInfo;
    if (pi?.firstName || pi?.lastName) {
      return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
    }
    const fileName = c.original_file_url.split('/').pop() ?? '';
    return fileName.replace(/^\d+_/, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ');
  };

  const getCandidateTitle = (c: Candidate) => c.extracted_data?.personalInfo?.title ?? null;

  const getPositioningCandidateName = (p: Positioning) => {
    const pi = p.candidates?.extracted_data?.personalInfo;
    if (pi?.firstName || pi?.lastName) {
      return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
    }
    return 'Candidat';
  };

  const getJobTitle = (jobDescription: string) => {
    const firstLine = jobDescription.trim().split('\n')[0];
    return firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalCvs = candidates.length;
  const totalPositionings = positionings.length;
  const readyCvs = candidates.filter(c => c.status === 'ready' || c.status === 'generated').length;

  return (
    <main className="grid-noise min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI CV Builder
            </div>
            <h1 className="text-3xl font-bold title-gradient md:text-4xl">Himeo Dashboard</h1>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl glass-panel p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalCvs}</p>
                <p className="text-xs text-muted-foreground">CVs analysés</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl glass-panel p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/20 text-violet">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalPositionings}</p>
                <p className="text-xs text-muted-foreground">Positionnements</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl glass-panel p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{readyCvs}</p>
                <p className="text-xs text-muted-foreground">CVs finalisés</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload zone — compact */}
        <div className="rounded-2xl glass-panel p-6">
          <div className="relative rounded-xl border border-dashed border-accent/50 bg-card/30 p-8 transition hover:border-primary/60 hover:violet-ring">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              accept=".pdf,.docx,.doc"
              disabled={isUploading}
            />
            <div className="flex items-center justify-center gap-4">
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-accent" />
              )}
              <div>
                <p className="text-base font-semibold text-foreground">
                  {isUploading ? 'Upload en cours...' : 'Dépose un CV ici ou clique pour uploader'}
                </p>
                <p className="text-xs text-muted-foreground">PDF ou DOCX — extraction automatique par IA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* CVs list */}
          <div className="rounded-2xl glass-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">CVs analysés</h2>
                  <p className="text-xs text-muted-foreground">{totalCvs} CV{totalCvs !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {isLoadingCandidates ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <FileText className="mb-2 h-8 w-8" />
                <p className="text-sm">Aucun CV analysé</p>
                <p className="text-xs">Uploade ton premier CV ci-dessus</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {candidates.map((c) => {
                  const name = getCandidateName(c);
                  const title = getCandidateTitle(c);
                  const st = statusConfig[c.status] ?? statusConfig.uploaded;

                  return (
                    <button
                      key={c.id}
                      onClick={() => router.push(`/review/${c.id}`)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5 text-left transition hover:border-accent/30 hover:bg-card"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{name}</span>
                          <Badge variant={st.variant} className="text-[10px] px-1.5 py-0">{st.label}</Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {title && (
                            <span className="flex items-center gap-1 truncate">
                              <Briefcase className="h-3 w-3" />
                              {title}
                            </span>
                          )}
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-accent" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Positionings list */}
          <div className="rounded-2xl glass-panel p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/20 text-violet">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Positionnements</h2>
                  <p className="text-xs text-muted-foreground">{totalPositionings} positionnement{totalPositionings !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {isLoadingPositionings ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : positionings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Target className="mb-2 h-8 w-8" />
                <p className="text-sm">Aucun positionnement</p>
                <p className="text-xs">Ouvre un CV et lance un positionnement</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {positionings.map((p) => {
                  const candidateName = getPositioningCandidateName(p);
                  const jobTitle = getJobTitle(p.job_description);
                  const st = positioningStatusConfig[p.status] ?? positioningStatusConfig.draft;
                  const matchScore = p.analysis?.matchScore;

                  return (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/review/${p.candidate_id}/positioning/${p.id}`)}
                      className="group flex w-full items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5 text-left transition hover:border-violet/30 hover:bg-card"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet/15 text-violet">
                        {matchScore != null ? (
                          <span className="text-xs font-bold">{matchScore}%</span>
                        ) : (
                          <Target className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-foreground">{candidateName}</span>
                          <Badge variant={st.variant} className="text-[10px] px-1.5 py-0">{st.label}</Badge>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="truncate">{jobTitle}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatDate(p.created_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-violet" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
