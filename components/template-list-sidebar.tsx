'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Loader2, Palette, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  is_default: boolean;
  config: {
    colors?: { primary?: string; secondary?: string };
  };
  created_at: string;
}

export function TemplateListSidebar() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();
  const params = useParams();

  const activeId = params?.id as string | undefined;

  useEffect(() => {
    fetch('/api/templates')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Nouveau template' }),
      });
      const data = await res.json();
      if (data.id) {
        setTemplates((prev) => [data, ...prev]);
        toast.success('Template créé');
        router.push(`/templates/${data.id}`);
      }
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Templates</h2>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span className="text-xs">Chargement...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <Palette className="mb-2 h-6 w-6" />
            <p className="text-xs">Aucun template</p>
            <p className="mt-1 text-[10px]">Crée ton premier template</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {templates.map((t) => {
              const isActive = t.id === activeId;
              const primary = t.config?.colors?.primary ?? '#010557';

              return (
                <button
                  key={t.id}
                  onClick={() => router.push(`/templates/${t.id}`)}
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                    isActive
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                  }`}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{ backgroundColor: primary }}
                  >
                    <span
                      className="block h-3 w-3 rounded-sm"
                      style={{ backgroundColor: t.config?.colors?.secondary ?? '#9bcaff' }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium">{t.name}</span>
                      {t.is_default && (
                        <Badge variant="secondary" className="shrink-0 text-[9px] px-1 py-0 leading-tight">
                          <Star className="mr-0.5 h-2 w-2" />
                          Défaut
                        </Badge>
                      )}
                    </div>
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
