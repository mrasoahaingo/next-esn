'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Target, TrendingUp, Clock, Upload, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

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
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      toast.success('CV uploadé', {
        description: 'Extraction automatique en cours...',
      });
      router.push(`/review/${data.id}`);
    } catch {
      toast.error("Erreur lors de l'upload", {
        description: 'Vérifie le fichier et réessaie.',
      });
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleUpload(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

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
      label: 'Temps gagné',
      value: `${stats.totalCvs * 40 + stats.generatedPositionings * 90}min`,
      accent: 'text-primary bg-primary/15',
    },
  ];

  return (
    <div className="flex h-full items-center justify-center">
      <div className="w-full max-w-xl px-6">
        {/* Stats strip */}
        <div className="mb-8 grid grid-cols-4 gap-2">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl glass-panel px-3 py-3 text-center">
                <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${card.accent}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className={`text-lg font-bold text-foreground ${isLoading ? 'animate-pulse' : ''}`}>
                  {isLoading ? '–' : card.value}
                </p>
                <p className="text-[10px] text-muted-foreground">{card.label}</p>
              </div>
            );
          })}
        </div>

        {/* Upload zone */}
        <div
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${
            isDragging
              ? 'border-accent bg-accent/5 scale-[1.01]'
              : 'border-white/10 hover:border-white/20'
          }`}
        >
          <label className="flex cursor-pointer flex-col items-center gap-4 px-8 py-14">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              accept=".pdf,.docx,.doc"
              disabled={isUploading}
            />
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${
              isDragging ? 'bg-accent/20 text-accent' : 'bg-card/80 text-muted-foreground'
            }`}>
              {isUploading ? (
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              ) : (
                <Upload className="h-6 w-6" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isUploading ? 'Upload en cours...' : 'Dépose un CV ici ou clique pour importer'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, DOCX — extraction automatique par IA
              </p>
            </div>
          </label>
        </div>

        {/* Hint */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
          <ArrowRight className="h-3 w-3" />
          Ou sélectionne un CV dans la barre latérale
        </p>
      </div>
    </div>
  );
}
