'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

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

  return (
    <main className="grid-noise flex min-h-screen items-center justify-center px-4 py-10 md:px-8">
      <div className="w-full max-w-5xl rounded-3xl glass-panel p-8 md:p-12">
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
    </main>
  );
}
