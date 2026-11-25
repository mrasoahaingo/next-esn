'use client';

import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import type { JobPostingAnalysis } from '@/lib/schema';
import type { WorkflowLastError } from '@/lib/types/workflow-last-error';
import type { JobPostingAnalysisStreamMeta } from '@/lib/types/job-posting-analysis-stream';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import { computeJobPostingStepStates, formatStepSummaryLine, type StepStateRow } from '@/lib/workflow/compute-step-status';
import { getFrenchStepShortLabel } from '@/lib/workflow/workflow-step-labels';
import { withMandatoryJobPostingLists } from '@/lib/services/job-posting-analysis.service';
import { hasPersistedJobAnalysis } from '@/lib/utils/mission-positioning-gate';
import { queryKeys } from '@/lib/queries/keys';
import { useCancelWorkflow } from '@/lib/queries/workflow';
import type { MissionAnalysisPhase } from './mission-format';

export type MissionJobAnalysisInput = {
  missionId: string;
  jobAnalysis: JobPostingAnalysis | null;
  jobAnalysisWorkflowRunId: string | null;
  jobAnalysisStale: boolean;
  workflowLastError: WorkflowLastError | null;
  aiJobAnalysisModels?: unknown;
};

export type MissionJobAnalysisState = {
  /** Analyse affichée : le flux en cours s'il y en a un, sinon celle persistée. */
  analysis: Partial<JobPostingAnalysis> | null;
  phase: MissionAnalysisPhase;
  isStreaming: boolean;
  isRunActive: boolean;
  hasPersisted: boolean;
  rows: StepStateRow[];
  summaryLine: string | null;
  streamMeta: JobPostingAnalysisStreamMeta | null;
  failureMessage: string | null;
  models: { byTask: Record<string, string>; label: string | null } | null;
  /** Lance (ou relance) l'analyse ; l'action est sans effet pendant un flux. */
  analyze: () => void;
  canAnalyze: boolean;
  /** Annule le flux en cours ; `null` si rien ne tourne. */
  cancel: (() => void) | null;
  isCancelling: boolean;
};

/**
 * Flux d'analyse de la fiche de mission (un seul `useWorkflowStream` pour la
 * page) : l'en-tête, la synthèse et le tableau des points clés consomment le
 * même état. Repris tel quel de l'ancien `MissionJobAnalysis` (mêmes
 * invalidations, mêmes messages).
 */
export function useMissionJobAnalysis({
  missionId,
  jobAnalysis,
  jobAnalysisWorkflowRunId,
  jobAnalysisStale,
  workflowLastError,
  aiJobAnalysisModels,
}: MissionJobAnalysisInput): MissionJobAnalysisState {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();
  const cancelWorkflow = useCancelWorkflow();

  const invalidate = () => {
    const oid = orgId ?? '';
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, missionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.recruiterSkills.all(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.orgRecruiterSkills.all(oid) });
  };

  const isRunActive = !!jobAnalysisWorkflowRunId;

  const stream = useWorkflowStream<Partial<JobPostingAnalysis>, JobPostingAnalysisStreamMeta>({
    api: `/api/missions/${missionId}/analyze-job`,
    runId: isRunActive ? (jobAnalysisWorkflowRunId ?? undefined) : undefined,
    runStatus: isRunActive ? 'extracting' : undefined,
    activeStatuses: ['extracting'],
    onFinish: () => {
      invalidate();
      toast.success('Analyse terminée avec succès');
    },
    onStartOnly: async () => {
      await queryClient.refetchQueries({ queryKey: queryKeys.missions.detail(orgId ?? '', missionId) });
    },
  });

  useEffect(() => {
    if (!stream.error) return;
    const key = stream.errorStepKey ?? workflowLastError?.stepKey;
    const label = key ? getFrenchStepShortLabel('jobPosting', key) : 'Analyse fiche';
    toast.error(`${label} : échec. Réessayez ou contactez le support.`, { duration: 8000 });
  }, [stream.error, stream.errorStepKey, workflowLastError?.stepKey]);

  const analysis = useMemo(() => {
    const raw = stream.isLoading && stream.object ? stream.object : (jobAnalysis ?? stream.object ?? null);
    if (!raw) return null;
    const hasAnyContent =
      !!raw.expectedExpertiseLevel ||
      !!raw.executiveSummary?.trim() ||
      (raw.keyPoints?.length ?? 0) > 0 ||
      (raw.openQuestions?.length ?? 0) > 0 ||
      (raw.redFlags?.length ?? 0) > 0;
    if (!hasAnyContent) return raw;
    return withMandatoryJobPostingLists(raw);
  }, [stream.isLoading, stream.object, jobAnalysis]);

  const hasPersisted = hasPersistedJobAnalysis(jobAnalysis);

  const rows = useMemo(
    () =>
      computeJobPostingStepStates({
        streamMeta: stream.streamMeta,
        partialData: stream.object ?? jobAnalysis ?? null,
        isStreaming: stream.isLoading,
        errorStepKey: stream.errorStepKey,
        persistedError: workflowLastError,
        workflowFailed: !!(workflowLastError ?? stream.error),
        workflowRunActive: isRunActive,
      }),
    [
      stream.streamMeta,
      stream.object,
      stream.isLoading,
      stream.errorStepKey,
      stream.error,
      jobAnalysis,
      workflowLastError,
      isRunActive,
    ],
  );

  const summaryLine = useMemo(() => formatStepSummaryLine('jobPosting', rows), [rows]);

  const models = useMemo(() => {
    if (!aiJobAnalysisModels || typeof aiJobAnalysisModels !== 'object') return null;
    const o = aiJobAnalysisModels as Record<string, unknown>;
    if (typeof o.byTask !== 'object' || o.byTask === null) return null;
    const byTask = o.byTask as Record<string, string>;
    const uniqueModels = Array.isArray(o.uniqueModels)
      ? (o.uniqueModels as string[]).join(', ')
      : Object.values(byTask).join(', ');
    return { byTask, label: uniqueModels || null };
  }, [aiJobAnalysisModels]);

  const isStreaming = stream.isLoading;
  const failed = !!(workflowLastError ?? stream.error);

  const phase: MissionAnalysisPhase = isStreaming || (isRunActive && !hasPersisted)
    ? 'running'
    : failed
      ? 'failed'
      : hasPersisted
        ? jobAnalysisStale
          ? 'stale'
          : 'done'
        : 'todo';

  const failureMessage = failed
    ? (workflowLastError?.message ?? stream.error?.message ?? 'L’analyse de la fiche a échoué.')
    : null;

  const cancelRunId = stream.activeRunId;
  const cancel =
    cancelRunId && (isStreaming || isRunActive)
      ? () => {
          stream.stop();
          cancelWorkflow.mutate({ runId: cancelRunId, table: 'missions', recordId: missionId, missionId });
        }
      : null;

  return {
    analysis,
    phase,
    isStreaming,
    isRunActive,
    hasPersisted,
    rows,
    summaryLine,
    streamMeta: stream.streamMeta,
    failureMessage,
    models,
    analyze: () => stream.submit({ startOnly: true }),
    canAnalyze: !isStreaming && !isRunActive,
    cancel,
    isCancelling: cancelWorkflow.isPending,
  };
}
