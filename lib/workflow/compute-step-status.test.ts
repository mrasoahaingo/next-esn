import { describe, expect, it } from 'vitest';
import {
  computeCvStepStates,
  computeJobPostingStepStates,
  computePositioningAnalysisStepStates,
  computePositioningGenerateStepStates,
  formatStepSummaryLine,
} from '@/lib/workflow/compute-step-status';

const base = {
  streamMeta: null,
  partialData: null,
  isStreaming: false,
  errorStepKey: null,
  persistedError: null,
  workflowFailed: false,
} as const;

describe('état reconnecting', () => {
  it('computePositioningAnalysisStepStates : run actif sans streamMeta -> toutes les lignes reconnecting', () => {
    const rows = computePositioningAnalysisStepStates({ ...base, workflowRunActive: true });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.status === 'reconnecting')).toBe(true);
  });

  it('computePositioningAnalysisStepStates : streamMeta renseigné -> comportement inchangé', () => {
    const rows = computePositioningAnalysisStepStates({
      ...base,
      streamMeta: { phase: 'extracting', activeBranches: ['skills'] } as never,
      workflowRunActive: true,
    });
    expect(rows.some((r) => r.status === 'reconnecting')).toBe(false);
    expect(rows.find((r) => r.stepKey === 'skills')?.status).toBe('running');
  });

  it('computeCvStepStates : même règle reconnecting', () => {
    const rows = computeCvStepStates({ ...base, workflowRunActive: true });
    expect(rows.every((r) => r.status === 'reconnecting')).toBe(true);
  });

  it('computeJobPostingStepStates : même règle reconnecting', () => {
    const rows = computeJobPostingStepStates({ ...base, workflowRunActive: true });
    expect(rows.every((r) => r.status === 'reconnecting')).toBe(true);
  });

  it('computePositioningGenerateStepStates : workflowRunActive -> reconnecting', () => {
    const rows = computePositioningGenerateStepStates({
      ...base,
      generateMode: 'all',
      workflowRunActive: true,
    });
    expect(rows.every((r) => r.status === 'reconnecting')).toBe(true);
  });

  it('computePositioningGenerateStepStates : sans workflowRunActive, comportement historique « tout terminé »', () => {
    const rows = computePositioningGenerateStepStates({ ...base, generateMode: 'all' });
    expect(rows.every((r) => r.status === 'done')).toBe(true);
  });

  it('computePositioningGenerateStepStates : workflowRunActive coupe le raccourci « tout terminé »', () => {
    const rows = computePositioningGenerateStepStates({
      ...base,
      generateMode: 'all',
      workflowRunActive: true,
    });
    expect(rows.some((r) => r.status === 'done')).toBe(false);
  });

  it('une ligne en erreur reste error même avec workflowRunActive', () => {
    const rows = computePositioningAnalysisStepStates({
      ...base,
      errorStepKey: 'skills',
      workflowRunActive: true,
    });
    const skills = rows.find((r) => r.stepKey === 'skills');
    expect(skills?.status).toBe('error');
    expect(rows.every((r) => r.status === 'reconnecting')).toBe(false);
  });

  it('formatStepSummaryLine traite reconnecting comme running (premier index, 1-based)', () => {
    const rows = computePositioningAnalysisStepStates({ ...base, workflowRunActive: true });
    const line = formatStepSummaryLine('positioningAnalysis', rows);
    expect(line).toBe(`Étape 1/${rows.length} — ${rows[0]!.label}`);
  });
});
