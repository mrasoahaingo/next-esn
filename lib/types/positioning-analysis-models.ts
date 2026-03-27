/** Snapshot persisté en `positionings.ai_analysis_models` et dans les snapshots `ai_usage_log.output_payload`. */
export type PositioningAnalysisModelsSnapshot = {
  /** Clé de tâche LLM → identifiant gateway du modèle (ex. google/gemini-2.5-flash). */
  byTask: Record<string, string>;
  /** Liste dédupliquée, triée pour affichage stable. */
  uniqueModels: string[];
};

export function formatPositioningAnalysisModelsLabel(
  snapshot: PositioningAnalysisModelsSnapshot | null | undefined,
): string | null {
  if (!snapshot?.uniqueModels?.length) return null;
  return snapshot.uniqueModels.join(', ');
}

/** Parse JSON DB / API vers le snapshot typé. Déduit `uniqueModels` depuis `byTask` si besoin. */
export function parsePositioningAnalysisModelsSnapshot(
  raw: unknown,
): PositioningAnalysisModelsSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.byTask !== 'object' || o.byTask === null) return null;
  const byTask = o.byTask as Record<string, string>;
  const values = Object.values(byTask).filter((x): x is string => typeof x === 'string' && x.length > 0);
  if (values.length === 0) return null;

  let unique: string[];
  if (Array.isArray(o.uniqueModels) && o.uniqueModels.length > 0) {
    unique = o.uniqueModels.filter((x): x is string => typeof x === 'string');
  } else {
    unique = Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }
  if (unique.length === 0) return null;
  return {
    byTask,
    uniqueModels: unique,
  };
}

/** Libellé pour l’UI historique : chaîne vide si aucune donnée exploitable. */
export function formatHistoryModelsDisplayLabel(raw: unknown): string | null {
  const s = parsePositioningAnalysisModelsSnapshot(raw);
  return formatPositioningAnalysisModelsLabel(s);
}
