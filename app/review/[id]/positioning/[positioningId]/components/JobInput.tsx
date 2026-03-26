'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { JobDescriptionInput } from '@/components/job-description-input';
import { Field, FieldLabel } from '@/components/ui/field';
import { JobDescriptionMarkdown } from '@/components/job-description-markdown';
import { Loader2, Search, RefreshCw, ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface JobInputProps {
  jobDescription: string;
  onJobDescriptionChange: (text: string) => void;
  onAnalyze: () => void;
  onReAnalyze?: () => void;
  isAnalyzing: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  /** Titre affiché à la place du texte brut quand le positionnement est lié à une mission */
  missionHeadline?: string | null;
  /** True si le matching côté serveur utilise le barème `job_analysis` (pas la fiche brute) */
  usesStructuredMissionAnalysis?: boolean;
}

export function JobInput({
  jobDescription,
  onJobDescriptionChange,
  onAnalyze,
  onReAnalyze,
  isAnalyzing,
  readOnly = false,
  disabled,
  missionHeadline = null,
  usesStructuredMissionAnalysis = false,
}: JobInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [isImportingFile, setIsImportingFile] = useState(false);
  const handleExtractingChange = useCallback((busy: boolean) => {
    setIsImportingFile(busy);
  }, []);

  if (readOnly) {
    if (missionHeadline) {
      return (
        <div className="flex items-start gap-3 rounded-xl border border-overlay/10 bg-overlay/[0.06] px-4 py-3">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet/80" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground leading-snug">{missionHeadline}</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              {usesStructuredMissionAnalysis
                ? 'Le matching utilise l’analyse structurée de la mission (barème « Comprendre la fiche »), pas le texte brut de la fiche.'
                : 'Lancez l’analyse de la fiche sur la mission pour enrichir le barème ; en attendant, le matching peut s’appuyer sur le texte associé au positionnement.'}
            </p>
          </div>
          {onReAnalyze && !isAnalyzing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReAnalyze}
              className="ml-2 shrink-0 text-violet hover:text-violet hover:bg-violet/10 h-7 px-2.5 text-xs"
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Relancer
            </Button>
          )}
          {isAnalyzing && (
            <div className="ml-2 flex items-center gap-1.5 text-xs text-violet shrink-0">
              <Loader2 className="h-3 w-3 animate-spin" />
              En cours…
            </div>
          )}
        </div>
      );
    }

    const showExpandToggle = jobDescription.trim().length > 400;

    return (
      <div className="flex items-start gap-3 rounded-xl border border-overlay/10 bg-overlay/[0.06] px-4 py-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <JobDescriptionMarkdown
            content={jobDescription}
            clampClassName={expanded || !showExpandToggle ? undefined : 'line-clamp-6'}
          />
          {showExpandToggle ? (
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto p-0 text-[11px] text-muted-foreground"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <><ChevronUp className="size-3" /> Réduire</>
              ) : (
                <><ChevronDown className="size-3" /> Voir tout</>
              )}
            </Button>
          ) : null}
        </div>
        {onReAnalyze && !isAnalyzing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReAnalyze}
            className="ml-2 shrink-0 text-violet hover:text-violet hover:bg-violet/10 h-7 px-2.5 text-xs"
          >
            <RefreshCw className="mr-1.5 h-3 w-3" />
            Relancer
          </Button>
        )}
        {isAnalyzing && (
          <div className="ml-2 flex items-center gap-1.5 text-xs text-violet shrink-0">
            <Loader2 className="h-3 w-3 animate-spin" />
            En cours…
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="glass-panel p-6 rounded-2xl">
      <h2 className="text-lg font-semibold mb-4 text-foreground border-b border-overlay/10 pb-2">
        Fiche de poste
      </h2>
      <Field>
        <FieldLabel htmlFor="job-description-input" className="sr-only">
          Fiche de poste
        </FieldLabel>
        <JobDescriptionInput
          id="job-description-input"
          value={jobDescription}
          onChange={onJobDescriptionChange}
          placeholder="Saisissez ou collez la fiche de poste (onglet « Saisie manuelle »)…"
          disabled={isAnalyzing || disabled}
          textareaClassName="min-h-[160px] text-sm max-h-[400px]"
          onExtractingChange={handleExtractingChange}
        />
      </Field>
      <div className="mt-4 flex justify-end">
        <Button
          onClick={onAnalyze}
          disabled={!jobDescription.trim() || isAnalyzing || disabled || isImportingFile}
        >
          {isAnalyzing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {isAnalyzing ? 'Analyse en cours...' : 'Analyser le matching'}
        </Button>
      </div>
    </section>
  );
}
