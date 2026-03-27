import type { ExtractedCV, JobPostingAnalysis, PositioningAnalysis, PositioningOutput } from '@/lib/schema';
import type { CvExtractionBranch, CvExtractionStreamMeta } from '@/lib/types/cv-extraction-stream';
import type { JobPostingAnalysisBranch, JobPostingAnalysisStreamMeta } from '@/lib/types/job-posting-analysis-stream';
import type { PositioningAnalysisBranch, PositioningAnalysisStreamMeta } from '@/lib/types/positioning-analysis-stream';
import type {
  PositioningGenerateBranch,
  PositioningGenerateMode,
  PositioningGenerateStreamMeta,
} from '@/lib/types/positioning-generate-stream';
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';
import {
  CV_WORKFLOW_STEPS,
  JOB_POSTING_WORKFLOW_STEPS,
  POSITIONING_ANALYSIS_WORKFLOW_STEPS,
  getPositioningGenerateSteps,
  getWorkflowStepDefs,
  type WorkflowKind,
} from '@/lib/workflow/workflow-step-labels';

export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export type StepStateRow = {
  stepKey: string;
  label: string;
  status: StepStatus;
  errorMessage?: string;
};

function hasCvSkills(d: Partial<ExtractedCV> | null): boolean {
  const s = d?.skills;
  if (!s) return false;
  return (
    (s.technologies?.length ?? 0) > 0 ||
    (s.softSkills?.length ?? 0) > 0 ||
    (s.expertises?.length ?? 0) > 0 ||
    (s.methodologies?.length ?? 0) > 0
  );
}

function cvBranchSatisfied(branch: CvExtractionBranch, data: Partial<ExtractedCV> | null): boolean {
  if (!data) return false;
  switch (branch) {
    case 'identity':
      return !!(data.personalInfo?.firstName || data.personalInfo?.lastName) || !!data.summary;
    case 'skills':
      return hasCvSkills(data);
    case 'education':
      return (data.education?.length ?? 0) > 0;
    case 'experiences':
      return (data.experiences?.length ?? 0) > 0;
    default:
      return false;
  }
}

function resolveErrorKeys(
  errorStepKey: string | null,
  persisted: WorkflowLastError | null,
  workflowFailed: boolean,
): { key: string | null; message: string | undefined } {
  if (errorStepKey) return { key: errorStepKey, message: undefined };
  if (workflowFailed && persisted) return { key: persisted.stepKey, message: persisted.message };
  return { key: null, message: undefined };
}

export function computeCvStepStates(input: {
  streamMeta: CvExtractionStreamMeta | null;
  partialData: Partial<ExtractedCV> | null;
  isStreaming: boolean;
  errorStepKey: string | null;
  persistedError: WorkflowLastError | null;
  workflowFailed: boolean;
  /**
   * True tant que le candidat a un run d’extraction côté serveur (uploaded/extracting).
   * Sans ça, avant reconnexion au flux NDJSON `isStreaming` est souvent false alors que l’extraction
   * tourne — le raccourci « tout terminé » affichait des étapes incohérentes.
   */
  workflowRunActive?: boolean;
}): StepStateRow[] {
  const defs = CV_WORKFLOW_STEPS;
  const { key: errKey, message: persistedMsg } = resolveErrorKeys(
    input.errorStepKey,
    input.persistedError,
    input.workflowFailed,
  );

  const workflowRunActive = input.workflowRunActive ?? false;
  if (!input.isStreaming && !input.workflowFailed && !workflowRunActive) {
    return defs.map((d) => ({ stepKey: d.stepKey, label: d.shortLabel, status: 'done' as const }));
  }

  const meta = input.streamMeta;
  const phase = meta?.phase;

  return defs.map((def) => {
    const { stepKey, shortLabel } = def;
    if (errKey === stepKey) {
      return {
        stepKey,
        label: shortLabel,
        status: 'error',
        errorMessage:
          persistedMsg ?? 'Extraction échouée. Réessayez ou contactez le support.',
      };
    }

    if (stepKey === 'transcription') {
      if (phase === 'transcription') return { stepKey, label: shortLabel, status: 'running' };
      if (phase === 'reading' || phase === 'extracting') return { stepKey, label: shortLabel, status: 'done' };
      return { stepKey, label: shortLabel, status: 'pending' };
    }

    if (stepKey === 'reading') {
      if (phase === 'reading') return { stepKey, label: shortLabel, status: 'running' };
      if (phase === 'extracting') return { stepKey, label: shortLabel, status: 'done' };
      if (phase === 'transcription') return { stepKey, label: shortLabel, status: 'pending' };
      return { stepKey, label: shortLabel, status: 'pending' };
    }

    const br = stepKey as CvExtractionBranch;
    if (phase === 'transcription' || phase === 'reading') {
      return { stepKey, label: shortLabel, status: 'pending' };
    }

    if (phase === 'extracting') {
      const active = meta?.activeBranches ?? [];
      if (active.includes(br)) return { stepKey, label: shortLabel, status: 'running' };
      if (cvBranchSatisfied(br, input.partialData)) return { stepKey, label: shortLabel, status: 'done' };
      if (active.length > 0) return { stepKey, label: shortLabel, status: 'pending' };
      return { stepKey, label: shortLabel, status: 'pending' };
    }

    return { stepKey, label: shortLabel, status: 'pending' };
  });
}

function jobPostingBranchDone(branch: JobPostingAnalysisBranch, data: Partial<JobPostingAnalysis> | null): boolean {
  if (!data) return false;
  if (branch === 'executive') return !!data.executiveSummary?.trim();
  if (branch === 'keyPoints') return (data.keyPoints?.length ?? 0) > 0;
  return false;
}

const JOB_POSTING_UI_STEP_KEYS = new Set(JOB_POSTING_WORKFLOW_STEPS.map((d) => d.stepKey));

/**
 * Aligne les clés d’erreur (nom `Output.object`, erreurs enveloppées) sur les `stepKey` affichés
 * (executive, keyPoints, finalizing). Sinon aucune ligne ne matche → tout en « En attente ».
 */
function normalizeJobPostingErrorStepKey(key: string | null | undefined): string | null {
  if (!key) return null;
  const k = String(key).trim();
  if (k === 'job_posting_key_points' || k === 'key_points') return 'keyPoints';
  if (k === 'job_posting_executive') return 'executive';
  return k;
}

/** Quand `workflow_last_error.stepKey` vaut `unknown` (perte à l’enveloppe workflow), déduire depuis l’état partiel. */
function inferJobPostingFailedStepKey(
  partialData: Partial<JobPostingAnalysis> | null,
): 'executive' | 'keyPoints' | null {
  const ex = !!partialData?.executiveSummary?.trim();
  const kp = (partialData?.keyPoints?.length ?? 0) > 0;
  if (ex && !kp) return 'keyPoints';
  if (!ex && kp) return 'executive';
  if (!ex && !kp) return 'executive';
  return 'keyPoints';
}

function resolveJobPostingErrorDisplay(input: {
  errorStepKey: string | null;
  persistedError: WorkflowLastError | null;
  workflowFailed: boolean;
  partialData: Partial<JobPostingAnalysis> | null;
}): { errKey: string | null; errMessage: string | undefined } {
  const { errorStepKey, persistedError, workflowFailed, partialData } = input;
  const base = resolveErrorKeys(errorStepKey, persistedError, workflowFailed);
  let errKey = normalizeJobPostingErrorStepKey(base.key);
  if (errKey && !JOB_POSTING_UI_STEP_KEYS.has(errKey)) errKey = null;

  if (!errKey && workflowFailed && persistedError) {
    const nk = normalizeJobPostingErrorStepKey(persistedError.stepKey);
    if (nk && JOB_POSTING_UI_STEP_KEYS.has(nk)) {
      errKey = nk;
    } else if (persistedError.stepKey === 'unknown') {
      errKey = inferJobPostingFailedStepKey(partialData);
    }
  }

  const errMessage =
    workflowFailed && persistedError?.message ? persistedError.message : undefined;
  return { errKey, errMessage };
}

export function computeJobPostingStepStates(input: {
  streamMeta: JobPostingAnalysisStreamMeta | null;
  partialData: Partial<JobPostingAnalysis> | null;
  isStreaming: boolean;
  errorStepKey: string | null;
  persistedError: WorkflowLastError | null;
  workflowFailed: boolean;
  /**
   * True tant que la mission a un `job_analysis_workflow_run_id` côté serveur.
   * Sans ça, avant reconnexion au flux NDJSON `isStreaming` est souvent false alors que l’analyse
   * tourne — le raccourci « tout terminé » produisait des badges « Terminé » incohérents.
   */
  workflowRunActive?: boolean;
}): StepStateRow[] {
  const defs = JOB_POSTING_WORKFLOW_STEPS;
  const { errKey, errMessage } = resolveJobPostingErrorDisplay({
    errorStepKey: input.errorStepKey,
    persistedError: input.persistedError,
    workflowFailed: input.workflowFailed,
    partialData: input.partialData,
  });

  const workflowRunActive = input.workflowRunActive ?? false;
  if (!input.isStreaming && !input.workflowFailed && !workflowRunActive) {
    return defs.map((d) => ({ stepKey: d.stepKey, label: d.shortLabel, status: 'done' as const }));
  }

  const meta = input.streamMeta;
  const phase = meta?.phase;
  const active = meta?.activeBranches ?? [];

  return defs.map((def) => {
    const { stepKey, shortLabel } = def;
    if (errKey === stepKey) {
      return {
        stepKey,
        label: shortLabel,
        status: 'error',
        errorMessage: errMessage ?? 'Analyse échouée. Réessayez ou contactez le support.',
      };
    }

    const br = stepKey as JobPostingAnalysisBranch;
    if (
      input.workflowFailed &&
      errKey &&
      errKey !== stepKey &&
      (stepKey === 'executive' || stepKey === 'keyPoints') &&
      jobPostingBranchDone(br, input.partialData)
    ) {
      return { stepKey, label: shortLabel, status: 'done' as const };
    }

    if (stepKey === 'finalizing') {
      if (phase === 'finalizing') return { stepKey, label: shortLabel, status: 'running' };
      if (phase === 'extracting') return { stepKey, label: shortLabel, status: 'pending' };
      return { stepKey, label: shortLabel, status: 'pending' };
    }

    if (phase === 'finalizing') {
      return { stepKey, label: shortLabel, status: 'done' };
    }
    if (phase === 'extracting') {
      if (active.includes(br)) return { stepKey, label: shortLabel, status: 'running' };
      if (jobPostingBranchDone(br, input.partialData)) return { stepKey, label: shortLabel, status: 'done' };
      return { stepKey, label: shortLabel, status: 'pending' };
    }

    return { stepKey, label: shortLabel, status: 'pending' };
  });
}

function positioningAnalysisBranchDone(
  branch: PositioningAnalysisBranch,
  data: Partial<PositioningAnalysis> | null,
): boolean {
  if (!data) return false;
  switch (branch) {
    case 'skills':
      return (data.skillMatches?.length ?? 0) > 0;
    case 'experiences':
      return (data.experienceRelevance?.length ?? 0) > 0;
    case 'gaps':
      return (data.gaps?.length ?? 0) > 0;
    case 'questions':
      return (data.candidateQuestions?.length ?? 0) > 0 || (data.clientQuestions?.length ?? 0) > 0;
    case 'synthesis':
      return !!data.matchSummary?.trim() || data.matchScore != null;
    default:
      return false;
  }
}

export function computePositioningAnalysisStepStates(input: {
  streamMeta: PositioningAnalysisStreamMeta | null;
  partialData: Partial<PositioningAnalysis> | null;
  isStreaming: boolean;
  errorStepKey: string | null;
  persistedError: WorkflowLastError | null;
  workflowFailed: boolean;
  /**
   * True tant que le positionnement est en `analyzing` avec un run côté serveur.
   * Sans ça, avant reconnexion au flux NDJSON `isStreaming` est souvent false alors que l’analyse
   * tourne — le raccourci « tout terminé » affichait des étapes incohérentes.
   */
  workflowRunActive?: boolean;
}): StepStateRow[] {
  const defs = POSITIONING_ANALYSIS_WORKFLOW_STEPS;
  const { key: errKey, message: persistedMsg } = resolveErrorKeys(
    input.errorStepKey,
    input.persistedError,
    input.workflowFailed,
  );

  const workflowRunActive = input.workflowRunActive ?? false;
  if (!input.isStreaming && !input.workflowFailed && !workflowRunActive) {
    return defs.map((d) => ({ stepKey: d.stepKey, label: d.shortLabel, status: 'done' as const }));
  }

  const meta = input.streamMeta;
  const phase = meta?.phase;
  const active = meta?.activeBranches ?? [];

  return defs.map((def) => {
    const { stepKey, shortLabel } = def;
    if (errKey === stepKey) {
      return {
        stepKey,
        label: shortLabel,
        status: 'error',
        errorMessage: persistedMsg ?? 'Analyse échouée. Réessayez ou contactez le support.',
      };
    }

    const br = stepKey as PositioningAnalysisBranch;
    if (phase === 'synthesizing' || phase === 'extracting') {
      if (active.includes(br)) return { stepKey, label: shortLabel, status: 'running' };
      if (positioningAnalysisBranchDone(br, input.partialData)) return { stepKey, label: shortLabel, status: 'done' };
      return { stepKey, label: shortLabel, status: 'pending' };
    }

    return { stepKey, label: shortLabel, status: 'pending' };
  });
}

function positioningGenerateBranchDone(
  branch: PositioningGenerateBranch,
  data: Partial<PositioningOutput> | null,
): boolean {
  if (!data) return false;
  switch (branch) {
    case 'tailoredCv':
      return !!data.tailoredCv;
    case 'email':
      return !!data.email;
    case 'emailFirstContact':
      return !!data.emailFirstContact;
    case 'emailBulletPoints':
      return !!data.emailBulletPoints;
    case 'candidateEmail':
      return !!data.candidateEmail;
    default:
      return false;
  }
}

export function computePositioningGenerateStepStates(input: {
  streamMeta: PositioningGenerateStreamMeta | null;
  partialData: Partial<PositioningOutput> | null;
  generateMode: PositioningGenerateMode;
  isStreaming: boolean;
  errorStepKey: string | null;
  persistedError: WorkflowLastError | null;
  workflowFailed: boolean;
}): StepStateRow[] {
  const defs = getPositioningGenerateSteps(input.generateMode);
  const { key: errKey, message: persistedMsg } = resolveErrorKeys(
    input.errorStepKey,
    input.persistedError,
    input.workflowFailed,
  );

  if (!input.isStreaming && !input.workflowFailed) {
    return defs.map((d) => ({ stepKey: d.stepKey, label: d.shortLabel, status: 'done' as const }));
  }

  const meta = input.streamMeta;
  const active = meta?.activeBranches ?? [];

  return defs.map((def) => {
    const { stepKey, shortLabel } = def;
    if (errKey === stepKey) {
      return {
        stepKey,
        label: shortLabel,
        status: 'error',
        errorMessage: persistedMsg ?? 'Génération échouée. Réessayez ou contactez le support.',
      };
    }

    const br = stepKey as PositioningGenerateBranch;
    if (meta?.phase === 'generating') {
      if (active.includes(br)) return { stepKey, label: shortLabel, status: 'running' };
      if (positioningGenerateBranchDone(br, input.partialData)) return { stepKey, label: shortLabel, status: 'done' };
      return { stepKey, label: shortLabel, status: 'pending' };
    }

    return { stepKey, label: shortLabel, status: 'pending' };
  });
}

/** Résumé SUB-01 : `Étape i/n — label` (1-based index du premier step running, sinon dernier done+1). */
export function formatStepSummaryLine(
  kind: WorkflowKind,
  rows: StepStateRow[],
  generateMode?: PositioningGenerateMode,
): string | null {
  const defs = getWorkflowStepDefs(kind, generateMode);
  if (!defs.length) return null;

  const runningIdx = rows.findIndex((r) => r.status === 'running');
  if (runningIdx >= 0) {
    const i = runningIdx + 1;
    const label = rows[runningIdx]?.label ?? defs[runningIdx]?.shortLabel ?? '';
    return `Étape ${i}/${defs.length} — ${label}`;
  }

  const firstPending = rows.findIndex((r) => r.status === 'pending');
  if (firstPending >= 0) {
    const label = rows[firstPending]?.label ?? defs[firstPending]?.shortLabel ?? '';
    return `Étape ${firstPending + 1}/${defs.length} — ${label}`;
  }

  const lastDone = rows.map((r, i) => (r.status === 'done' ? i : -1)).filter((i) => i >= 0);
  const idx = lastDone.length ? lastDone[lastDone.length - 1]! + 1 : 0;
  const clamped = Math.min(idx, defs.length - 1);
  const label = rows[clamped]?.label ?? defs[clamped]?.shortLabel ?? '';
  return `Étape ${clamped + 1}/${defs.length} — ${label}`;
}
