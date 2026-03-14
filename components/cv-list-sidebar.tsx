'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Loader2,
  FileText,
  Clock,
  User,
  Briefcase,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

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

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  uploaded: { label: 'Uploadé', variant: 'secondary' },
  extracting: { label: 'Extraction...', variant: 'outline' },
  reviewing: { label: 'En revue', variant: 'outline' },
  ready: { label: 'Prêt', variant: 'default' },
  generated: { label: 'Généré', variant: 'default' },
};

export function CvListSidebar() {
  const [isUploading, setIsUploading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  const activeId = params?.id as string | undefined;

  useEffect(() => {
    fetch('/api/candidates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
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
      toast.success('CV uploadé', {
        description: 'Extraction automatique en cours...',
      });
      router.push(`/review/${data.id}`);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de l\'upload', {
        description: 'Vérifie le fichier et réessaie.',
      });
      setIsUploading(false);
    }
  };

  const getCandidateName = (c: Candidate) => {
    const pi = c.extracted_data?.personalInfo;
    if (pi?.firstName || pi?.lastName) {
      return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
    }
    const fileName = c.original_file_url.split('/').pop() ?? '';
    return fileName
      .replace(/^\d+_/, '')
      .replace(/\.[^.]+$/, '')
      .replace(/_/g, ' ');
  };

  const getCandidateTitle = (c: Candidate) =>
    c.extracted_data?.personalInfo?.title ?? null;

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
        <h2 className="text-sm font-semibold text-foreground">CVs</h2>
        <label className="relative cursor-pointer">
          <input
            type="file"
            onChange={handleFileChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            accept=".pdf,.docx,.doc"
            disabled={isUploading}
          />
          {isUploading ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground">
              <Plus className="h-4 w-4" />
            </div>
          )}
        </label>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-xs">Chargement...</span>
          </div>
        ) : candidates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <FileText className="mb-2 h-6 w-6" />
            <p className="text-xs">Aucun CV</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {candidates.map((c) => {
              const name = getCandidateName(c);
              const title = getCandidateTitle(c);
              const st = statusConfig[c.status] ?? statusConfig.uploaded;
              const isActive = c.id === activeId;

              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/review/${c.id}`)}
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                    isActive
                      ? 'bg-accent/10 text-foreground'
                      : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                      isActive ? 'bg-accent/15 text-accent' : 'bg-card/50 text-muted-foreground'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium">{name}</span>
                      <Badge variant={st.variant} className="shrink-0 text-[9px] px-1 py-0 leading-tight">
                        {st.label}
                      </Badge>
                    </div>
                    {title && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                        <Briefcase className="h-2.5 w-2.5 shrink-0" />
                        {title}
                      </p>
                    )}
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
