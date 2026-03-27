'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, Palette, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';
import { useTemplatesList } from '@/lib/queries';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { queryKeys } from '@/lib/queries/keys';

const TEMPLATES_LIST_SCOPE = 'global' as const;

export function TemplateListSidebar() {
  const { data: templates = [], isPending } = useTemplatesList();
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const { isSuperAdmin, isLoaded: isRoleLoaded } = useSuperAdmin();

  const activeId = params?.id as string | undefined;

  const handleCreate = async () => {
    const trimmedName = templateNameInput.trim() || 'Nouveau template';
    setIsCreating(true);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });
      const data = await res.json();
      if (data.id) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(TEMPLATES_LIST_SCOPE) });
        toast.success('Template créé');
        setIsDialogOpen(false);
        setTemplateNameInput('');
        router.push(`/templates/${data.id}`);
      }
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateDialog = () => {
    setTemplateNameInput('');
    setIsDialogOpen(true);
  };

  return (
    <aside className="flex h-full min-h-0 w-72 shrink-0 flex-col border-r border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Templates</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={openCreateDialog}
          disabled={isCreating || !isRoleLoaded || !isSuperAdmin}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Créer un template"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isPending ? (
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
          <div className="flex flex-col gap-0.5">
            {templates.map((t) => {
              const isActive = t.id === activeId;
              const primary = t.config?.colors?.primary ?? '#010557';

              return (
                <Button
                  key={t.id}
                  type="button"
                  variant="ghost"
                  onClick={() => router.push(`/templates/${t.id}`)}
                  className={`group flex items-center gap-1 rounded-lg transition ${
                    isActive
                      ? 'bg-primary/10 text-foreground'
                      : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                  }`}
                >
                  <div className="flex h-auto flex-1 items-center justify-start gap-2.5 rounded-lg px-2.5 py-2 text-left font-normal">
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
                      {t.is_default ? (
                        <Badge variant="secondary" className="shrink-0 text-[9px] px-1 py-0 leading-tight">
                          <Star className="mr-0.5 h-2 w-2" />
                          Plateforme
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setTemplateNameInput('');
          }
        }}
      >
        <DialogContent className="bg-panel border-overlay/10">
          <DialogHeader>
            <DialogTitle>Nouveau template</DialogTitle>
            <DialogDescription>
              Donne un nom clair au template avant de l&apos;ouvrir dans l&apos;éditeur.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="template-name" className="text-xs font-medium text-muted-foreground">
              Nom du template
            </label>
            <Input
              id="template-name"
              value={templateNameInput}
              onChange={(e) => setTemplateNameInput(e.target.value)}
              placeholder="Ex. ESN bleu, Client premium, Version light"
              maxLength={80}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isCreating) {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setTemplateNameInput('');
              }}
              disabled={isCreating}
            >
              Annuler
            </Button>
            <Button type="button" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
