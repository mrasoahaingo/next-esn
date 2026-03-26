import { z } from 'zod';

/**
 * Pondérations du matching (récence des expériences, etc.).
 * Stocké dans `organization_settings.matching_weights` (JSONB).
 */
export const matchingWeightsSchema = z.object({
  /** Si false, aucun bloc « récence » n’est injecté dans les prompts. */
  experienceRecencyEnabled: z.boolean().default(true),
  /**
   * Mode `exponential` : poids(rang) = max(recencyWeightFloor, recencyDecayPerRank ** rang).
   * Mode `explicit` : utilise `recencyExplicitWeights[rang]` si défini.
   */
  recencyMode: z.enum(['exponential', 'explicit']).default('exponential'),
  /** Décroissance entre le poste le plus récent (rang 0) et les suivants (0.1–0.99). */
  recencyDecayPerRank: z.number().min(0.1).max(0.99).default(0.74),
  /** Plancher minimum pour un rang très ancien. */
  recencyWeightFloor: z.number().min(0).max(1).default(0.12),
  /**
   * Poids explicites par rang (index 0 = expérience la plus récente).
   * Si non vide et recencyMode = explicit, ces valeurs priment.
   */
  recencyExplicitWeights: z.array(z.number().min(0).max(1)).max(24).optional(),
});

export type MatchingWeightsConfig = z.infer<typeof matchingWeightsSchema>;

export const DEFAULT_MATCHING_WEIGHTS: MatchingWeightsConfig = matchingWeightsSchema.parse({});

export function mergeMatchingWeights(
  raw: unknown | null | undefined,
): MatchingWeightsConfig {
  if (raw == null || typeof raw !== 'object') {
    return { ...DEFAULT_MATCHING_WEIGHTS };
  }
  const parsed = matchingWeightsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...DEFAULT_MATCHING_WEIGHTS };
  }
  return { ...DEFAULT_MATCHING_WEIGHTS, ...parsed.data };
}

/** Fusionne une mise à jour partielle avec les valeurs existantes (PATCH org). */
export function patchMatchingWeights(
  existing: unknown | null | undefined,
  patch: Partial<MatchingWeightsConfig>,
): MatchingWeightsConfig {
  const base = mergeMatchingWeights(existing);
  return matchingWeightsSchema.parse({ ...base, ...patch });
}

export function weightForRecencyRank(rank: number, config: MatchingWeightsConfig): number {
  if (!config.experienceRecencyEnabled) {
    return 1;
  }
  if (config.recencyMode === 'explicit' && config.recencyExplicitWeights?.length) {
    const w = config.recencyExplicitWeights[rank];
    if (w != null) return w;
    return config.recencyWeightFloor;
  }
  return Math.max(config.recencyWeightFloor, config.recencyDecayPerRank ** rank);
}
