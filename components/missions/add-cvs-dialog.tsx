'use client';

import { useMemo, useRef, useState } from 'react';
import { Plus, Search, Upload, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { InitialsAvatar } from '@/components/app/initials-avatar';
import { useCandidates, usePositionExistingCandidates, useUploadCvsForMission } from '@/lib/queries';
import { normalizeSearch } from '@/components/cvs/cvs-list';
import { cn } from '@/lib/utils';
import { getCandidateName, type CandidateItem } from './mission-types';

export type AddCvsTab = 'upload' | 'existing';

/**
 * Dialogue « Positionner des CV » : importer des fichiers (un positionnement en
 * brouillon par CV, extraction puis analyse) ou choisir des candidats déjà
 * extraits. Mêmes mutations et mêmes messages que l'ancienne modale.
 */
export function AddCvsDialog({
  open,
  onOpenChange,
  missionId,
  existingCandidateIds,
  tab,
  onTabChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: string;
  existingCandidateIds: Set<string>;
  /** Onglet affiché, tenu par la page (le menu « Ajouter des CV » choisit l'entrée). */
  tab: AddCvsTab;
  onTabChange: (tab: AddCvsTab) => void;
}): React.JSX.Element {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadCvs = useUploadCvsForMission();
  const positionExisting = usePositionExistingCandidates();
  const { data: candidates = [] } = useCandidates() as { data: CandidateItem[] };

  const isUploading = uploadCvs.isPending;
  const isPositioning = positionExisting.isPending;

  const eligibleCandidates = useMemo(
    () => candidates.filter((c) => c.extracted_data?.personalInfo && !existingCandidateIds.has(c.id)),
    [candidates, existingCandidateIds],
  );

  const filteredCandidates = useMemo(() => {
    const q = normalizeSearch(search);
    if (!q) return eligibleCandidates;
    return eligibleCandidates.filter((c) => {
      const haystack = normalizeSearch(`${getCandidateName(c)} ${c.extracted_data?.personalInfo?.title ?? ''}`);
      return q.split(/\s+/).every((word) => haystack.includes(word));
    });
  }, [eligibleCandidates, search]);

  const toggleCandidate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.endsWith('.docx') || f.name.endsWith('.doc'),
    );
    if (!fileArray.length) return;

    uploadCvs.mutate(
      { missionId, files: fileArray },
      {
        onSuccess: (data) => {
          const successCount = data.results?.length ?? 0;
          const errorCount = data.errors?.length ?? 0;

          if (successCount > 0) {
            toast.success(`${successCount} CV import${successCount > 1 ? 'és' : 'é'}`, {
              description:
                errorCount > 0
                  ? `Positionnements créés, ${errorCount} fichier${errorCount > 1 ? 's' : ''} en échec.`
                  : 'Positionnements créés en brouillon.',
            });
            onOpenChange(false);
          }

          if (errorCount > 0) {
            const firstError = data.errors?.[0];
            toast.error(`${errorCount} import${errorCount > 1 ? 's' : ''} en échec`, {
              description: firstError ? `${firstError.fileName}: ${firstError.error}` : undefined,
            });
          }
        },
        onError: () => toast.error("Erreur lors de l'import"),
      },
    );
  };

  const handlePositionExisting = () => {
    if (!selectedIds.size) return;
    positionExisting.mutate(
      { missionId, candidateIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          toast.success(
            `${selectedIds.size} positionnement${selectedIds.size > 1 ? 's' : ''} créé${selectedIds.size > 1 ? 's' : ''}`,
            { description: 'Les candidats ont été ajoutés en brouillon.' },
          );
          setSelectedIds(new Set());
          onOpenChange(false);
        },
        onError: () => toast.error('Erreur lors du positionnement'),
      },
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Positionner des CV</DialogTitle>
          <DialogDescription>Importez de nouveaux CV ou choisissez des candidats déjà extraits.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => onTabChange(v as AddCvsTab)}>
          <TabsList variant="line" className="w-full justify-start border-b border-border">
            <TabsTrigger value="upload">
              <Upload />
              Importer des CV
            </TabsTrigger>
            <TabsTrigger value="existing">
              <UserPlus />
              Candidats existants
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {eligibleCandidates.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="pt-2">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              className={cn(
                'rounded-xl border border-dashed transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
                isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40',
              )}
            >
              <label className="flex cursor-pointer flex-col items-center gap-3 px-6 py-8">
                <Input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => {
                    if (e.target.files?.length) handleFiles(e.target.files);
                    e.target.value = '';
                  }}
                  className="hidden"
                  accept=".pdf,.docx,.doc"
                  disabled={isUploading}
                />
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {isUploading ? <Spinner className="size-5" /> : <Upload className="size-5" aria-hidden />}
                </span>
                <span className="text-center">
                  <span className="block text-sm font-medium text-foreground">
                    {isUploading ? 'Import en cours…' : 'Glissez-déposez vos CV ici'}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">PDF ou Word, plusieurs fichiers acceptés.</span>
                </span>
              </label>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="flex flex-col gap-3 pt-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                placeholder="Nom, titre…"
                aria-label="Rechercher un candidat"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>

            <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {filteredCandidates.length === 0 ? (
                <li className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                  <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Users className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {eligibleCandidates.length === 0 ? 'Aucun candidat disponible.' : 'Aucun candidat ne correspond.'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {eligibleCandidates.length === 0
                      ? 'Tous les CV extraits sont déjà sur cette mission.'
                      : 'Essayez un autre nom ou un autre titre.'}
                  </span>
                </li>
              ) : (
                filteredCandidates.map((c) => {
                  const isSelected = selectedIds.has(c.id);
                  const name = getCandidateName(c);
                  const title = c.extracted_data?.personalInfo?.title;
                  const id = `add-cv-${c.id}`;
                  return (
                    <li key={c.id}>
                      <label
                        htmlFor={id}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none',
                          isSelected ? 'bg-primary/5' : 'hover:bg-muted/50',
                        )}
                      >
                        <Checkbox id={id} checked={isSelected} onCheckedChange={() => toggleCandidate(c.id)} />
                        <InitialsAvatar name={name} size="sm" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium text-foreground">{name}</span>
                          {title ? <span className="truncate text-xs text-muted-foreground">{title}</span> : null}
                        </span>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
              <Button type="button" onClick={handlePositionExisting} disabled={isPositioning || selectedIds.size === 0}>
                {isPositioning ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
                Positionner{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
