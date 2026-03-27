export const CV_EXTRACTION_SNAPSHOT_KIND = 'cv_extraction_snapshot' as const;

export type CvExtractionSnapshotReason =
  | 'workflow_completed'
  | 'migrated_from_extraction_history';

export type CvExtractionModelsSnapshot = {
  byTask: Record<string, string>;
  uniqueModels: string[];
};

/** Contenu de `ai_usage_log.output_payload` pour `task_key = cv.extraction.snapshot`. */
export type CvExtractionSnapshotPayloadV1 = {
  kind: typeof CV_EXTRACTION_SNAPSHOT_KIND;
  version: 1;
  reason: CvExtractionSnapshotReason;
  extracted_data: unknown;
  ai_models: CvExtractionModelsSnapshot;
  duration_ms?: number;
};

export function parseCvExtractionSnapshotPayload(
  raw: unknown,
): CvExtractionSnapshotPayloadV1 | null {
  if (raw === null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== CV_EXTRACTION_SNAPSHOT_KIND) return null;
  if (o.version !== 1) return null;
  if (o.reason !== 'workflow_completed' && o.reason !== 'migrated_from_extraction_history') {
    return null;
  }
  const models = o.ai_models;
  if (models === null || typeof models !== 'object') return null;
  const m = models as Record<string, unknown>;
  if (typeof m.byTask !== 'object' || m.byTask === null) return null;
  if (!Array.isArray(m.uniqueModels)) return null;
  return {
    kind: CV_EXTRACTION_SNAPSHOT_KIND,
    version: 1,
    reason: o.reason,
    extracted_data: o.extracted_data,
    ai_models: {
      byTask: m.byTask as Record<string, string>,
      uniqueModels: m.uniqueModels.filter((x): x is string => typeof x === 'string'),
    },
    duration_ms: typeof o.duration_ms === 'number' ? o.duration_ms : undefined,
  };
}
