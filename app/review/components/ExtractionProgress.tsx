'use client';

import { AlertCircle } from 'lucide-react';
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';
import type { ExtractedCV } from '@/lib/schema';
import type { CvExtractionStreamMeta } from '@/lib/types/cv-extraction-stream';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import type { StepStateRow } from '@/lib/workflow/compute-step-status';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatExtractionSummary } from './format-extraction-summary';

interface Step {
  key: string;
  label: string;
  streamingLabel: string;
  check: (data: Partial<ExtractedCV> | null) => boolean;
}

function hasSkills(d: Partial<ExtractedCV> | null): boolean {
  const s = d?.skills;
  if (!s) return false;
  return (
    (s.technologies?.length ?? 0) > 0 ||
    (s.softSkills?.length ?? 0) > 0 ||
    (s.expertises?.length ?? 0) > 0 ||
    (s.methodologies?.length ?? 0) > 0
  );
}

const steps: Step[] = [
  {
    key: 'personalInfo',
    label: 'Identité',
    streamingLabel: 'Extraction de l’identité…',
    check: (d) => !!d?.personalInfo?.firstName || !!d?.personalInfo?.lastName,
  },
  {
    key: 'summary',
    label: 'Résumé',
    streamingLabel: 'Rédaction du résumé…',
    check: (d) => !!d?.summary,
  },
  {
    key: 'skills',
    label: 'Compétences',
    streamingLabel: 'Analyse des compétences…',
    check: hasSkills,
  },
  {
    key: 'education',
    label: 'Formations',
    streamingLabel: 'Extraction des formations…',
    check: (d) => (d?.education?.length ?? 0) > 0,
  },
  {
    key: 'experiences',
    label: 'Expériences',
    streamingLabel: 'Analyse des expériences…',
    check: (d) => (d?.experiences?.length ?? 0) > 0,
  },
];

function branchPulsesStep(branchMeta: CvExtractionStreamMeta | null | undefined, stepKey: string): boolean {
  const branches = branchMeta?.activeBranches;
  if (!branches?.length) return false;
  if (stepKey === 'personalInfo' || stepKey === 'summary') return branches.includes('identity');
  if (stepKey === 'skills') return branches.includes('skills');
  if (stepKey === 'education') return branches.includes('education');
  if (stepKey === 'experiences') return branches.includes('experiences');
  return false;
}

/** Phrase de la ligne d'état pendant le flux : la phase en cours, en texte. */
function phaseLabel(data: Partial<ExtractedCV> | null, streamMeta: CvExtractionStreamMeta | null | undefined): string {
  if (streamMeta?.phase === 'transcription') {
    const chars = streamMeta.transcriptionChars;
    return chars != null && chars > 0
      ? `Transcription du PDF… ${chars.toLocaleString('fr-FR')} caractères`
      : 'Transcription du PDF…';
  }
  if (streamMeta?.phase === 'reading') return 'Lecture du document Word…';
  const activeKeys =
    streamMeta?.phase === 'extracting' && (streamMeta.activeBranches?.length ?? 0) > 0
      ? steps.filter((s) => !s.check(data) && branchPulsesStep(streamMeta, s.key))
      : [];
  if (activeKeys.length > 0) {
    if (activeKeys.length === 1) return activeKeys[0].streamingLabel;
    return `Extraction en parallèle : ${activeKeys.map((s) => s.label.toLowerCase()).join(', ')}…`;
  }
  const next = steps.find((s) => !s.check(data));
  return next ? next.streamingLabel : 'Finalisation…';
}

export interface ExtractionProgressProps {
  data: Partial<ExtractedCV> | null;
  isStreaming: boolean;
  streamMeta?: CvExtractionStreamMeta | null;
  /** Lignes d'étapes du workflow (`computeCvStepStates`), toujours fournies. */
  rows: StepStateRow[];
  /** Ligne de synthèse (`formatStepSummaryLine`), affichée en cas d'échec. */
  summaryLine: string | null;
  /** Liste d'étapes dépliée (extraction en cours, reprise du suivi ou échec). */
  showSteps: boolean;
  /** Extraction terminée : ligne mono et détail replié. */
  completed: boolean;
  /** Durée de l'extraction IA (ms), pour la ligne « terminée ». */
  durationMs?: number | null;
  /** Échec de l'extraction : message et relance. */
  error?: { message: string; onRetry: () => void; retryPending: boolean } | null;
  /** Identifiants gateway des modèles (si enregistrés côté serveur). */
  extractionModelsLabel?: string | null;
  /** Détail par tâche LLM (clé → modèle gateway) pour l'affichage dans le tooltip. */
  extractionModelsByTask?: Record<string, string> | null;
}

/**
 * Zone `status` de l'en-tête (DESIGN.md § L'état de l'IA) : un seul endroit, trois états.
 * - en cours : une ligne (phase en cours, compteur mono), puis `WorkflowStepList` ;
 * - terminé : une ligne mono « Extraction terminée en 42 s · 5 étapes », détail dans un `<details>` ;
 * - échec : `Alert` destructive avec « Réessayer », les étapes restent visibles dessous.
 * `WorkflowStepList` porte l'unique région `aria-live`.
 */
export function ExtractionProgress({
  data,
  isStreaming,
  streamMeta,
  rows,
  summaryLine,
  showSteps,
  completed,
  durationMs,
  error,
  extractionModelsLabel,
  extractionModelsByTask,
}: ExtractionProgressProps) {
  const completedCount = steps.filter((s) => s.check(data)).length;
  const infoIcon = (
    <AiGenerationInfoIcon
      variant="cv_extraction"
      modelsLabel={extractionModelsLabel}
      modelsByTask={extractionModelsByTask}
      className="size-7 shrink-0"
    />
  );

  if (!error && !isStreaming && !showSteps && !completed) return null;

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>L&apos;extraction a échoué</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
          <AlertAction>
            <Button variant="outline" size="sm" onClick={error.onRetry} disabled={error.retryPending}>
              {error.retryPending && <Spinner data-icon="inline-start" />}
              Réessayer
            </Button>
          </AlertAction>
        </Alert>
      ) : null}

      {isStreaming ? (
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-foreground">{phaseLabel(data, streamMeta)}</p>
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {completedCount}/{steps.length}
            </span>
            {infoIcon}
          </div>
        </div>
      ) : null}

      {showSteps && rows.length > 0 ? (
        <WorkflowStepList rows={rows} summaryLine={error ? summaryLine : null} />
      ) : null}

      {completed ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {formatExtractionSummary({ durationMs, stepCount: rows.length })}
            </p>
            {infoIcon}
          </div>
          {rows.length > 0 ? (
            <details className="group text-xs">
              <summary className="w-fit cursor-pointer list-none text-muted-foreground underline-offset-4 hover:text-foreground hover:underline [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">Voir le détail des étapes</span>
                <span className="hidden group-open:inline">Masquer le détail des étapes</span>
              </summary>
              <div className="mt-3 border-t border-border pt-3">
                <WorkflowStepList rows={rows} summaryLine={null} />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Statut d'une section du formulaire pendant le flux.
 */
export function getSectionStatus(
  data: Partial<ExtractedCV> | null,
  isStreaming: boolean,
  field: keyof ExtractedCV,
  streamMeta?: CvExtractionStreamMeta | null,
): 'pending' | 'streaming' | 'done' {
  if (!isStreaming) return 'done';

  const step = steps.find((s) => s.key === field);
  if (!step) return 'done';

  const hasData = step.check(data);
  if (hasData) return 'done';

  if (streamMeta?.phase === 'transcription' || streamMeta?.phase === 'reading') {
    return 'pending';
  }

  if (streamMeta?.phase === 'extracting' && streamMeta.activeBranches?.length) {
    if (branchPulsesStep(streamMeta, step.key)) return 'streaming';
  }

  const idx = steps.indexOf(step);
  const allPreviousDone = steps.slice(0, idx).every((s) => s.check(data));

  return allPreviousDone ? 'streaming' : 'pending';
}
