import type { PositioningGenerateMode } from '@/lib/types/positioning-generate-stream';

export type WorkflowKind = 'cv' | 'jobPosting' | 'positioningAnalysis' | 'positioningGenerate';

export type WorkflowStepDef = {
  stepKey: string;
  shortLabel: string;
  summaryLabel: string;
};

/** Ordre logique aligné sur `workflows/extract-cv.ts` (phases puis branches parallèles). */
export const CV_WORKFLOW_STEPS: WorkflowStepDef[] = [
  {
    stepKey: 'transcription',
    shortLabel: 'Transcription du PDF',
    summaryLabel: 'Transcription du PDF',
  },
  {
    stepKey: 'reading',
    shortLabel: 'Lecture du document',
    summaryLabel: 'Lecture du document',
  },
  {
    stepKey: 'identity',
    shortLabel: 'Identité et synthèse',
    summaryLabel: 'Identité et synthèse',
  },
  {
    stepKey: 'experiences',
    shortLabel: 'Expériences',
    summaryLabel: 'Analyse des expériences',
  },
  {
    stepKey: 'education',
    shortLabel: 'Formations',
    summaryLabel: 'Extraction des formations',
  },
  {
    stepKey: 'skills',
    shortLabel: 'Compétences',
    summaryLabel: 'Analyse des compétences',
  },
];

export const JOB_POSTING_WORKFLOW_STEPS: WorkflowStepDef[] = [
  {
    stepKey: 'executive',
    shortLabel: 'Synthèse exécutive',
    summaryLabel: 'Synthèse exécutive',
  },
  {
    stepKey: 'keyPoints',
    shortLabel: 'Points clés',
    summaryLabel: 'Points clés',
  },
  {
    stepKey: 'finalizing',
    shortLabel: 'Finalisation',
    summaryLabel: 'Finalisation',
  },
];

export const POSITIONING_ANALYSIS_WORKFLOW_STEPS: WorkflowStepDef[] = [
  { stepKey: 'skills', shortLabel: 'Correspondance des compétences', summaryLabel: 'Compétences' },
  { stepKey: 'experiences', shortLabel: 'Pertinence des expériences', summaryLabel: 'Expériences' },
  { stepKey: 'gaps', shortLabel: 'Écarts', summaryLabel: 'Écarts' },
  { stepKey: 'questions', shortLabel: 'Questions', summaryLabel: 'Questions' },
  { stepKey: 'synthesis', shortLabel: 'Synthèse', summaryLabel: 'Synthèse globale' },
];

const POSITIONING_GENERATE_ALL: WorkflowStepDef[] = [
  { stepKey: 'tailoredCv', shortLabel: 'CV ciblé', summaryLabel: 'CV ciblé' },
  { stepKey: 'email', shortLabel: 'Email recruteur', summaryLabel: 'Email recruteur' },
  { stepKey: 'emailFirstContact', shortLabel: 'Premier contact', summaryLabel: 'Premier contact' },
  { stepKey: 'emailBulletPoints', shortLabel: 'Puces email', summaryLabel: 'Puces email' },
  { stepKey: 'candidateEmail', shortLabel: 'Email candidat', summaryLabel: 'Email candidat' },
];

const POSITIONING_GENERATE_CV_ONLY: WorkflowStepDef[] = [
  { stepKey: 'tailoredCv', shortLabel: 'CV ciblé', summaryLabel: 'CV ciblé' },
];

const POSITIONING_GENERATE_EMAILS: WorkflowStepDef[] = [
  { stepKey: 'email', shortLabel: 'Email recruteur', summaryLabel: 'Email recruteur' },
  { stepKey: 'emailFirstContact', shortLabel: 'Premier contact', summaryLabel: 'Premier contact' },
  { stepKey: 'emailBulletPoints', shortLabel: 'Puces email', summaryLabel: 'Puces email' },
  { stepKey: 'candidateEmail', shortLabel: 'Email candidat', summaryLabel: 'Email candidat' },
];

export function getPositioningGenerateSteps(mode: PositioningGenerateMode): WorkflowStepDef[] {
  if (mode === 'cv') return POSITIONING_GENERATE_CV_ONLY;
  if (mode === 'emails') return POSITIONING_GENERATE_EMAILS;
  return POSITIONING_GENERATE_ALL;
}

export function getWorkflowStepDefs(kind: WorkflowKind, generateMode?: PositioningGenerateMode): WorkflowStepDef[] {
  switch (kind) {
    case 'cv':
      return CV_WORKFLOW_STEPS;
    case 'jobPosting':
      return JOB_POSTING_WORKFLOW_STEPS;
    case 'positioningAnalysis':
      return POSITIONING_ANALYSIS_WORKFLOW_STEPS;
    case 'positioningGenerate':
      return getPositioningGenerateSteps(generateMode ?? 'all');
    default:
      return [];
  }
}

export function getTotalSteps(kind: WorkflowKind, generateMode?: PositioningGenerateMode): number {
  return getWorkflowStepDefs(kind, generateMode).length;
}

export function getStepDef(
  kind: WorkflowKind,
  stepKey: string,
  generateMode?: PositioningGenerateMode,
): WorkflowStepDef | undefined {
  return getWorkflowStepDefs(kind, generateMode).find((s) => s.stepKey === stepKey);
}

/** Libellé court pour toasts / messages (ERR-03). */
export function getFrenchStepShortLabel(
  kind: WorkflowKind,
  stepKey: string,
  generateMode?: PositioningGenerateMode,
): string {
  return getStepDef(kind, stepKey, generateMode)?.shortLabel ?? stepKey;
}
