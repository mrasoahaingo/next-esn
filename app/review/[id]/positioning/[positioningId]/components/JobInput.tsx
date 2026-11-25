'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobDescriptionInput } from '@/components/job-description-input';
import { Field, FieldLabel } from '@/components/ui/field';
import { JobDescriptionMarkdown } from '@/components/job-description-markdown';
import { Panel, PanelBody, PanelHeader } from '@/components/app/panel';

interface JobInputProps {
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  isAnalyzing: boolean;
  /** Après analyse : texte en lecture, bouton « Modifier » pour repasser en saisie. */
  readOnly?: boolean;
  disabled?: boolean;
  /** Mission liée : la fiche appartient à la mission, pas de saisie ici. */
  missionHeadline?: string | null;
  /** Le matching s'appuie sur l'analyse structurée de la fiche mission. */
  usesStructuredMissionAnalysis?: boolean;
  /** Import de fichier en cours (le bouton « Analyser » de l'en-tête attend). */
  onImportingChange?: (busy: boolean) => void;
}

/**
 * La fiche de poste, premier panneau de l'étape 1 : en-tête (icône, titre, mission
 * liée en description, « Modifier » à droite), corps en lecture (clampé, « Voir tout »)
 * ou en saisie. « Analyser le matching » reste la primaire de l'en-tête de page.
 */
export function JobInput({
  jobDescription,
  onJobDescriptionChange,
  isAnalyzing,
  readOnly = false,
  disabled,
  missionHeadline = null,
  usesStructuredMissionAnalysis = false,
  onImportingChange,
}: JobInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const isEditing = !readOnly || editing;
  const hasText = jobDescription.trim().length > 0;
  const showExpandToggle = jobDescription.trim().length > 400;

  const description = missionHeadline
    ? usesStructuredMissionAnalysis
      ? `Matching basé sur l’analyse structurée de la mission « ${missionHeadline} ».`
      : `Fiche de la mission « ${missionHeadline} ». Enrichissez-la sur la page mission pour affiner le barème.`
    : undefined;

  return (
    <Panel aria-labelledby="job-input-heading">
      <PanelHeader
        id="job-input-heading"
        icon={FileText}
        title="Fiche de poste"
        description={description}
        actions={
          readOnly && !missionHeadline && !isAnalyzing ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Terminer' : 'Modifier'}
            </Button>
          ) : undefined
        }
      />
      <PanelBody>
        {isEditing && !missionHeadline ? (
          <Field>
            <FieldLabel htmlFor="job-description-input" className="sr-only">
              Fiche de poste
            </FieldLabel>
            <JobDescriptionInput
              id="job-description-input"
              value={jobDescription}
              onChange={onJobDescriptionChange}
              placeholder="Saisissez ou collez la fiche de poste…"
              disabled={isAnalyzing || disabled}
              textareaClassName="min-h-[160px] max-h-[400px] text-sm"
              onExtractingChange={onImportingChange}
            />
          </Field>
        ) : hasText ? (
          <div>
            <JobDescriptionMarkdown
              content={jobDescription}
              clampClassName={expanded || !showExpandToggle ? undefined : 'line-clamp-6'}
              className="text-muted-foreground"
            />
            {showExpandToggle ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="mt-1 h-auto p-0 text-xs text-muted-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Réduire' : 'Voir tout'}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {missionHeadline ? 'Le texte de la fiche est consultable sur la page mission.' : 'Aucune fiche de poste.'}
          </p>
        )}
      </PanelBody>
    </Panel>
  );
}
