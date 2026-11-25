'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { FileText, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/app/panel';
import { JobDescriptionInput } from '@/components/job-description-input';
import { JobDescriptionMarkdown } from '@/components/job-description-markdown';
import { queryKeys } from '@/lib/queries/keys';

/**
 * Panneau « Fiche de poste » : le texte de la mission en Markdown, et son
 * édition avec le champ existant (`JobDescriptionInput`). L'enregistrement passe
 * par `PATCH /api/missions/[id]` ; le serveur relance l'analyse de la fiche
 * lui-même, la page la suit dans sa zone d'état.
 */
export function JobDescriptionPanel({
  missionId,
  jobDescription,
  /** Pendant l'analyse, l'édition attend : le texte analysé doit rester celui affiché. */
  editDisabledReason,
}: {
  missionId: string;
  jobDescription: string;
  editDisabledReason?: string | null;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(jobDescription);
  const [isImporting, setIsImporting] = useState(false);

  const save = useMutation({
    mutationFn: async (next: string) => {
      const res = await fetch(`/api/missions/${missionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Échec de l’enregistrement');
      }
      return res.json();
    },
    onSuccess: async () => {
      const oid = orgId ?? '';
      await queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, missionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
      setEditing(false);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Échec de l’enregistrement');
    },
  });

  const startEditing = () => {
    setDraft(jobDescription);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(jobDescription);
    setEditing(false);
  };

  const isDirty = draft.trim() !== jobDescription.trim();
  const canSave = isDirty && draft.trim().length > 0 && !save.isPending && !isImporting;
  const charCount = (editing ? draft : jobDescription).length;

  return (
    <Panel aria-labelledby="job-description-title">
      <PanelHeader
        id="job-description-title"
        icon={FileText}
        title="Fiche de poste"
        actions={
          editing ? null : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startEditing}
              disabled={!!editDisabledReason}
              title={editDisabledReason ?? undefined}
            >
              <PenLine data-icon="inline-start" />
              Modifier
            </Button>
          )
        }
      />
      <PanelBody>
        {editing ? (
          <JobDescriptionInput
            id="mission-job-description"
            value={draft}
            onChange={setDraft}
            disabled={save.isPending}
            onExtractingChange={setIsImporting}
            textareaClassName="min-h-[320px] text-sm"
          />
        ) : (
          <JobDescriptionMarkdown content={jobDescription} className="text-sm text-foreground" />
        )}
      </PanelBody>
      {editing ? (
        <PanelFooter>
          <span className="font-mono tabular-nums">{charCount.toLocaleString('fr-FR')} caractères</span>
          <span className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={cancelEditing} disabled={save.isPending}>
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={() => save.mutate(draft)} disabled={!canSave}>
              {save.isPending ? <Spinner data-icon="inline-start" /> : null}
              Enregistrer
            </Button>
          </span>
        </PanelFooter>
      ) : null}
    </Panel>
  );
}
