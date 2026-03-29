import type { ProspectScore } from '@/lib/radar/schemas';

export const SOURCE_WEIGHTS: Record<string, number> = {
  job_offer: 25,
  public_market: 25,
  linkedin: 20,
  press: 15,
  vivier_match: 15,
};

// Half-life in days by signal source. After one half-life, signal weight is halved.
// Press signals use a sub-type half-life (keyed by metadata.signalType).
const HALF_LIFE_DAYS: Record<string, number> = {
  job_offer: 21,        // Poste souvent pourvu en 3-4 semaines
  public_market: 45,    // AO ouvert plusieurs semaines
  linkedin: 60,         // Signal organisationnel stable
  press: 60,            // Défaut presse
  vivier_match: 9999,   // Jamais expiré
};

const PRESS_TYPE_HALF_LIFE: Record<string, number> = {
  nomination: 45,             // 100 jours golden window
  fundraising: 30,            // 3 mois post-annonce max
  outsourcing: 45,
  digital_transformation: 60,
  hiring: 21,                 // Même urgence qu'une offre d'emploi
};

// Press signal types with boosted base weights
const PRESS_TYPE_WEIGHTS: Record<string, number> = {
  nomination: 22,             // DSI nommé = fenêtre idéale
  fundraising: 20,
  outsourcing: 18,
  digital_transformation: 15,
  hiring: 18,
};

export const CONVERGENCE_BONUS: Record<number, number> = {
  3: 15,
  4: 25,
  5: 35,
};

// Velocity bonus: ≥3 distinct fresh sources in past 7 days
export const VELOCITY_BONUS = 10;
export const VELOCITY_WINDOW_DAYS = 7;
export const VELOCITY_MIN_SOURCES = 3;

function computeDecayFactor(detectedAt: string | undefined, halfLifeDays: number): number {
  if (!detectedAt) return 1;
  const daysSince = (Date.now() - new Date(detectedAt).getTime()) / (1000 * 60 * 60 * 24);
  // Exponential decay: weight * 2^(-daysSince / halfLife)
  return Math.pow(2, -daysSince / halfLifeDays);
}

function getSignalHalfLife(source: string, metadata?: Record<string, unknown>): number {
  if (source === 'press' && metadata?.signalType) {
    return PRESS_TYPE_HALF_LIFE[String(metadata.signalType)] ?? HALF_LIFE_DAYS.press;
  }
  return HALF_LIFE_DAYS[source] ?? 60;
}

function getBaseWeight(source: string, rawWeight: number, metadata?: Record<string, unknown>): number {
  if (source === 'press' && metadata?.signalType) {
    return PRESS_TYPE_WEIGHTS[String(metadata.signalType)] ?? rawWeight;
  }
  return rawWeight;
}

export type ScoringSignal = {
  source: string;
  weight: number;
  detectedAt?: string;
  metadata?: Record<string, unknown>;
};

export function computeScore(
  signals: ScoringSignal[],
  hasVivierMatch: boolean,
  companyId = '',
): ProspectScore {
  const breakdown: Record<string, number> = {};

  const now = Date.now();
  const velocityWindowMs = VELOCITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Track fresh signals per source for velocity bonus
  const freshSources = new Set<string>();

  for (const signal of signals) {
    const halfLife = getSignalHalfLife(signal.source, signal.metadata);
    const baseWeight = getBaseWeight(signal.source, signal.weight, signal.metadata);
    const decayFactor = computeDecayFactor(signal.detectedAt, halfLife);
    const decayedWeight = Math.round(baseWeight * decayFactor);

    // Keep max decayed weight per source (avoid double-counting same source)
    breakdown[signal.source] = Math.max(breakdown[signal.source] ?? 0, decayedWeight);

    // Track velocity: is this signal fresh?
    if (signal.detectedAt) {
      const age = now - new Date(signal.detectedAt).getTime();
      if (age <= velocityWindowMs && signal.source !== 'vivier_match') {
        freshSources.add(signal.source);
      }
    }
  }

  if (hasVivierMatch) {
    breakdown.vivier_match = SOURCE_WEIGHTS.vivier_match;
  }

  const baseScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const distinctSources = Object.keys(breakdown).length;
  const convergenceBonus = CONVERGENCE_BONUS[Math.min(distinctSources, 5)] ?? 0;

  // Velocity bonus: multiple distinct sources fired recently
  const velocityBonus = freshSources.size >= VELOCITY_MIN_SOURCES ? VELOCITY_BONUS : 0;

  const score = Math.min(100, baseScore + convergenceBonus + velocityBonus);

  let heat: ProspectScore['heat'] = 'cold';
  if (score >= 80) heat = 'burning';
  else if (score >= 60) heat = 'hot';
  else if (score >= 30) heat = 'warm';

  return {
    companyId,
    score,
    signalCount: signals.length,
    convergenceBonus: convergenceBonus + velocityBonus,
    heat,
    breakdown,
  };
}
