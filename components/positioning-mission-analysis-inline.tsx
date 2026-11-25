'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
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
import { AiGenerationInfoIcon } from '@/components/ai/ai-generation-info';
import { Skeleton } from '@/components/ui/skeleton';
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

/**
 * État de l'analyse de la fiche mission, sous la fiche sélectionnée : une ligne de
 * texte et, quand un flux tourne ou a échoué, le `WorkflowStepList` (une seule région
 * `aria-live`, portée par la liste). Pas de boîte : il vit dans le corps déplié du panneau.
 */
export function PositioningMissionAnalysisInline({
  missionId,
  mission,
  isMissionDetailLoading = false,
}: PositioningMissionAnalysisInlineProps) {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  const invalidate = () => {
    const oid = orgId ?? '';
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(oid, missionId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.missions.list(oid) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all(oid) });
  };

  const job_analysis = mission?.job_analysis ?? null;
  const job_analysis_workflow_run_id = mission?.job_analysis_workflow_run_id ?? null;
  const workflow_last_error = mission?.workflow_last_error ?? null;

  const jobAnalysisModels = useMemo(() => {
    const raw = mission?.ai_job_analysis_models;
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (typeof o.byTask !== 'object' || o.byTask === null) return null;
    return o.byTask as Record<string, string>;
  }, [mission?.ai_job_analysis_models]);

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
      await queryClient.refetchQueries({ queryKey: queryKeys.missions.detail(orgId ?? '', missionId) });
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
      <div className="mt-4 flex flex-col gap-2" aria-busy="true">
        <p className="text-xs text-muted-foreground">Chargement de la mission…</p>
        <Skeleton className="h-3 w-2/3 animate-none" />
        <Skeleton className="h-3 w-1/2 animate-none" />
      </div>
    );
  }

  // Au repos, l'aide du bouton « Analyser le matching » dit déjà l'état : rien de plus ici.
  const stateLine =
    !showJobStepList && showAnalysisProgressHint
      ? (formatJobPostingStreamHint(stream.streamMeta) ?? 'Analyse de la fiche…')
      : null;

  return (
    <div className="mt-4 flex flex-col gap-3" aria-busy={!!isMissionDetailLoading}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-sm font-semibold text-foreground">Analyse de la fiche mission</h3>
        <AiGenerationInfoIcon
          variant="mission_job_analysis"
          modelsByTask={jobAnalysisModels}
          className="h-7 w-7"
        />
        {stateLine ? (
          <span className="text-xs text-muted-foreground">{stateLine}</span>
        ) : null}
      </div>

      {showJobStepList ? (
        <div className="border-l-2 border-primary pl-4">
          <WorkflowStepList rows={jobPostingRows} summaryLine={jobPostingSummary} />
        </div>
      ) : null}
    </div>
  );
}
