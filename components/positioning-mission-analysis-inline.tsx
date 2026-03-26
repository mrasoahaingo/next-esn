'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useWorkflowStream } from '@/lib/hooks/useWorkflowStream';
import type { JobPostingAnalysisStreamMeta } from '@/lib/types/job-posting-analysis-stream';
import { WorkflowStepList } from '@/components/workflow/WorkflowStepList';
import {
  computeJobPostingStepStates,
  formatStepSummaryLine,
} from '@/lib/workflow/compute-step-status';
import { queryKeys } from '@/lib/queries/keys';
import type { MissionDetail } from '@/lib/queries/missions';
import { hasPersistedJobAnalysis } from '@/lib/utils/mission-positioning-gate';
import type { JobPostingAnalysis } from '@/lib/schema';

function formatJobPostingStreamHint(meta: JobPostingAnalysisStreamMeta | null): string | null {
  if (!meta) return null;
  if (!meta.activeBranches?.length && meta.phase === 'finalizing') {
    return 'Finalisation…';
  }
  if (!meta.activeBranches?.length) return 'Analyse de la fiche…';
  const labels: Record<string, string> = {
    executive: 'Synthèse cadre',
    keyPoints: 'Points clés',
  };
  return `Analyse : ${meta.activeBranches.map((b) => labels[b] ?? b).join(' · ')}`;
}

export type PositioningMissionAnalysisInlineProps = {
  missionId: string;
  mission: MissionDetail | undefined;
  isMissionDetailLoading?: boolean;
};

export function PositioningMissionAnalysisInline({
  missionId,
  mission,
  isMissionDetailLoading = false,
}: PositioningMissionAnalysisInlineProps) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(missionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.list() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const job_analysis = mission?.job_analysis ?? null;
  const job_analysis_workflow_run_id = mission?.job_analysis_workflow_run_id ?? null;
  const workflow_last_error = mission?.workflow_last_error ?? null;

  const jobAnalyzeActive = !!job_analysis_workflow_run_id;

  const stream = useWorkflowStream<Partial<JobPostingAnalysis>, JobPostingAnalysisStreamMeta>({
    api: `/api/missions/${missionId}/analyze-job`,
    runId: jobAnalyzeActive ? job_analysis_workflow_run_id ?? undefined : undefined,
    runStatus: jobAnalyzeActive ? 'extracting' : undefined,
    activeStatuses: ['extracting'],
    onFinish: () => {
      invalidate();
    },
    onStartOnly: async () => {
      await queryClient.refetchQueries({ queryKey: queryKeys.missions.detail(missionId) });
    },
  });

  const hasPersisted = hasPersistedJobAnalysis(job_analysis);

  const showAnalysisProgressHint =
    stream.isLoading || (jobAnalyzeActive && !hasPersisted);

  const jobPostingRows = useMemo(
    () =>
      computeJobPostingStepStates({
        streamMeta: stream.streamMeta,
        partialData: stream.object ?? job_analysis ?? null,
        isStreaming: stream.isLoading,
        errorStepKey: stream.errorStepKey,
        persistedError: workflow_last_error,
        workflowFailed: !!(workflow_last_error ?? stream.error),
        workflowRunActive: jobAnalyzeActive,
      }),
    [
      stream.streamMeta,
      stream.object,
      stream.isLoading,
      stream.errorStepKey,
      stream.error,
      job_analysis,
      workflow_last_error,
      jobAnalyzeActive,
    ],
  );

  const jobPostingSummary = useMemo(
    () => formatStepSummaryLine('jobPosting', jobPostingRows),
    [jobPostingRows],
  );

  const showJobStepList =
    stream.isLoading || (jobAnalyzeActive && !hasPersisted) || !!workflow_last_error;

  if (isMissionDetailLoading && !mission) {
    return (
      <div
        className="ml-8 mt-6 flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-[11px] text-muted-foreground"
        aria-busy="true"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        Chargement de la mission…
      </div>
    );
  }

  return (
    <div
      className="ml-8 mt-6 rounded-xl border border-border/60 bg-muted/20 p-4"
      aria-busy={!!isMissionDetailLoading}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Analyse de la fiche mission
        </span>
        {showAnalysisProgressHint && !showJobStepList ? (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {formatJobPostingStreamHint(stream.streamMeta) ?? 'Analyse de la fiche…'}
          </span>
        ) : null}
      </div>

      {showJobStepList ? (
        <div className="rounded-lg border border-border/50 bg-card/30 px-3 py-3" aria-live="polite">
          <WorkflowStepList rows={jobPostingRows} summaryLine={jobPostingSummary} />
        </div>
      ) : null}
    </div>
  );
}
