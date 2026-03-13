'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Upload, Loader2, Sparkles, CheckCircle2, FileText, Clock, ChevronRight, User, Briefcase } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  uploaded: { label: 'Uploadé', variant: 'secondary' },
  extracting: { label: 'Extraction...', variant: 'outline' },
  reviewing: { label: 'En revue', variant: 'outline' },
  ready: { label: 'Prêt', variant: 'default' },
  generated: { label: 'Généré', variant: 'default' },
};

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/candidates')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(console.error)
      .finally(() => setIsLoadingList(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

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

  const getCandidateTitle = (c: Candidate) => {
    return c.extracted_data?.personalInfo?.title ?? null;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <main className="grid-noise min-h-screen px-4 py-10 md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="rounded-3xl glass-panel p-8 md:p-12">
          <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                AI CV Builder
              </div>
              <h1 className="text-4xl font-bold title-gradient md:text-5xl">Himeo CV Automation</h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                Glisse ton CV et laisse l&apos;IA extraire, structurer et préparer une version finale prête à exporter.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Formats supportés</p>
              <div className="space-y-1 text-xs md:text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> PDF</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> DOCX</div>
              </div>
            </div>
          </div>

          {/* Upload zone */}
          <div className="relative rounded-2xl border border-dashed border-accent/50 bg-card p-10 transition hover:border-primary/60 hover:violet-ring md:p-14">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              accept=".pdf,.docx,.doc"
              disabled={isUploading}
            />
            <div className="flex flex-col items-center gap-4 text-center">
              {isUploading ? (
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              ) : (
                <Upload className="h-16 w-16 text-accent" />
              )}
              <p className="text-xl font-semibold text-foreground">
                {isUploading ? 'Upload en cours...' : 'Dépose ton CV ici ou clique pour uploader'}
              </p>
              <p className="text-sm text-muted-foreground">Analyse et extraction automatiques en quelques secondes</p>
            </div>
          </div>
        </div>

        {/* Candidates list */}
        <div className="rounded-3xl glass-panel p-8 md:p-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">CVs analysés</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {candidates.length} CV{candidates.length !== 1 ? 's' : ''} dans la base
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          {isLoadingList ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement...
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="mb-3 h-10 w-10" />
              <p className="text-sm">Aucun CV analysé pour le moment</p>
              <p className="text-xs">Uploade ton premier CV ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((c) => {
                const name = getCandidateName(c);
                const title = getCandidateTitle(c);
                const st = statusConfig[c.status] ?? statusConfig.uploaded;

                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/review/${c.id}`)}
                    className="group flex w-full items-center gap-4 rounded-xl border border-border bg-card/50 px-4 py-3 text-left transition hover:border-accent/30 hover:bg-card"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <User className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-foreground">{name}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
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
      </div>
    </main>
  );
}
