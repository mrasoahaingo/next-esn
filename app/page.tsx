'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

const statusConfig: Record<string, { label: string; color: string }> = {
  uploaded: { label: 'Uploadé', color: 'text-slate-400 bg-white/5 border-white/10' },
  extracting: { label: 'Extraction...', color: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/25' },
  reviewing: { label: 'En revue', color: 'text-violet bg-violet/10 border-violet/25' },
  ready: { label: 'Prêt', color: 'text-neon bg-neon/10 border-neon/25' },
  generated: { label: 'Généré', color: 'text-neon bg-neon/15 border-neon/30' },
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
    // Fallback: file name
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
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-neon" />
                AI CV Builder
              </div>
              <h1 className="text-4xl font-bold title-gradient md:text-5xl">Himeo CV Automation</h1>
              <p className="mt-3 max-w-xl text-sm text-slate-400 md:text-base">
                Glisse ton CV et laisse l&apos;IA extraire, structurer et préparer une version finale prête à exporter.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="mb-2 font-medium text-white">Formats supportés</p>
              <div className="space-y-1 text-xs md:text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-neon" /> PDF</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-neon" /> DOCX</div>
              </div>
            </div>
          </div>

          {/* Upload zone */}
          <div className="relative rounded-2xl border border-dashed border-violet/50 bg-[#0c1019] p-10 transition hover:border-neon/60 hover:violet-ring md:p-14">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              accept=".pdf,.docx,.doc"
              disabled={isUploading}
            />
            <div className="flex flex-col items-center gap-4 text-center">
              {isUploading ? (
                <Loader2 className="h-16 w-16 animate-spin text-neon" />
              ) : (
                <Upload className="h-16 w-16 text-violet" />
              )}
              <p className="text-xl font-semibold text-white">
                {isUploading ? 'Upload en cours...' : 'Dépose ton CV ici ou clique pour uploader'}
              </p>
              <p className="text-sm text-slate-400">Analyse et extraction automatiques en quelques secondes</p>
            </div>
          </div>
        </div>

        {/* Candidates list */}
        <div className="rounded-3xl glass-panel p-8 md:p-10">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">CVs analysés</h2>
              <p className="mt-1 text-sm text-slate-400">
                {candidates.length} CV{candidates.length !== 1 ? 's' : ''} dans la base
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/15 text-violet">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          {isLoadingList ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement...
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <FileText className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm">Aucun CV analysé pour le moment</p>
              <p className="text-xs text-slate-600">Uploade ton premier CV ci-dessus</p>
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
                    className="group flex w-full items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-left transition hover:border-violet/30 hover:bg-white/[0.04]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet/10 text-violet">
                      <User className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-white">{name}</span>
                        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
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

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-violet" />
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
