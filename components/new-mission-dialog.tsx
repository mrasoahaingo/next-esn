'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { useCreateMission } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { JobDescriptionInput } from '@/components/job-description-input';

/**
 * Dialogue de création de mission, extrait tel quel de l'ancienne barre latérale
 * (champs, `JobDescriptionInput`, `useCreateMission`, navigation vers l'analyse).
 * Ouvert depuis le menu « + » de la barre.
 */
export function NewMissionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après la navigation (ferme le volet mobile, par exemple). */
  onCreated?: () => void;
}): React.JSX.Element {
  const router = useRouter();
  const createMission = useCreateMission();
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newJobDescription, setNewJobDescription] = useState('');

  const canSubmit = newTitle.trim().length > 0 && newJobDescription.trim().length > 0;

  const handleCreateMission = () => {
    if (!canSubmit) return;
    createMission.mutate(
      { title: newTitle, company: newCompany || null, jobDescription: newJobDescription },
      {
        onSuccess: (mission) => {
          onOpenChange(false);
          setNewTitle('');
          setNewCompany('');
          setNewJobDescription('');
          if (mission.id) {
            router.push(`/positions/${mission.id}?tab=analysis`);
            onCreated?.();
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle>Nouvelle mission</DialogTitle>
        <DialogDescription>
          L’intitulé et la fiche de poste suffisent ; l’analyse démarre ensuite.
        </DialogDescription>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sidebar-mission-title">Intitulé du poste *</Label>
              <Input
                id="sidebar-mission-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex : Développeur Full-Stack Senior"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sidebar-mission-company">Entreprise / Client</Label>
              <Input
                id="sidebar-mission-company"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Ex : BNP Paribas"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sidebar-mission-desc">Fiche de poste *</Label>
            <JobDescriptionInput
              id="sidebar-mission-desc"
              value={newJobDescription}
              onChange={setNewJobDescription}
              initialMode="upload"
              placeholder="Saisissez ou collez l’intégralité de la fiche de poste…"
              textareaClassName="min-h-[300px] max-h-[60vh] text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleCreateMission}
              disabled={!canSubmit || createMission.isPending}
            >
              {createMission.isPending ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Plus />
              )}
              Créer la mission
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
