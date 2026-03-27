export const POSITIONING_ANALYSIS_SNAPSHOT_KIND = 'positioning_analysis_snapshot' as const;

export type PositioningAnalysisSnapshotReason =
  | 'archive_before_clear'
  | 'workflow_completed'
  | 'migrated_from_history_table';

/** Contenu de `ai_usage_log.output_payload` pour `task_key = positioning.analysis.snapshot`. */
export type PositioningAnalysisSnapshotPayloadV1 = {
  kind: typeof POSITIONING_ANALYSIS_SNAPSHOT_KIND;
  version: 1;
  reason: PositioningAnalysisSnapshotReason;
  analysis: unknown;
  answers: unknown;
  ai_analysis_models: unknown;
  /** Durée totale du workflow d’analyse (ms), si pertinent. */
  duration_ms?: number;
};

export function parsePositioningAnalysisSnapshotPayload(
  raw: unknown,
): PositioningAnalysisSnapshotPayloadV1 | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== POSITIONING_ANALYSIS_SNAPSHOT_KIND) return null;
  if (o.version !== 1) return null;
  if (
    o.reason !== 'archive_before_clear' &&
    o.reason !== 'workflow_completed' &&
    o.reason !== 'migrated_from_history_table'
  ) {
    return null;
  }
  return {
    kind: POSITIONING_ANALYSIS_SNAPSHOT_KIND,
    version: 1,
    reason: o.reason,
    analysis: o.analysis,
    answers: o.answers,
    ai_analysis_models: o.ai_analysis_models,
    duration_ms: typeof o.duration_ms === 'number' ? o.duration_ms : undefined,
  };
}
