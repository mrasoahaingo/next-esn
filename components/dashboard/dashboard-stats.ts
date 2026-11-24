/**
 * Calculs du tableau de bord à partir de la réponse de `/api/dashboard`
 * (forme consommée par `useDashboard`). Fonctions pures, testées dans
 * `dashboard-stats.test.ts`. Aucun chiffre n'est inventé : quand une mesure
 * n'a pas de donnée, la valeur est `null` et l'écran affiche « — ».
 */

import { candidateDisplayName, type PersonalInfoLike } from './dashboard-format';

// ─── Types de données ───────────────────────────────────────────────

export interface DashboardCandidate {
  id: string;
  status: string;
  created_at: string;
  extracted_data?: PersonalInfoLike;
  ai_extraction_duration_ms?: number | null;
  user_review_time_seconds?: number | null;
}

export type SkillRelevance = 'strong' | 'partial' | 'missing';

export interface DashboardPositioning {
  id: string;
  candidate_id: string;
  job_description: string;
  status: string;
  analysis: {
    matchScore?: number;
    matchSummary?: string;
    skillMatches?: { skill: string; category?: string; relevance: SkillRelevance }[];
  } | null;
  created_at: string;
  ai_analysis_duration_ms?: number | null;
  ai_generation_duration_ms?: number | null;
  user_time_seconds?: number | null;
  candidates: { id: string; extracted_data: PersonalInfoLike } | null;
}

export interface DashboardData {
  candidates: DashboardCandidate[];
  positionings: DashboardPositioning[];
  recruiter_skills?: {
    total: number;
    items: { skill_key: string; understood_at: string }[];
  };
}

export const EMPTY_DASHBOARD_DATA: DashboardData = {
  candidates: [],
  positionings: [],
  recruiter_skills: { total: 0, items: [] },
};

// ─── Faits de tête ──────────────────────────────────────────────────

/** Statuts pour lesquels l'extraction est terminée. */
export const EXTRACTED_CV_STATUSES = ['reviewing', 'ready', 'generated'] as const;

/** Minutes d'édition manuelle estimées par CV extrait (formule du « temps gagné »). */
export const MINUTES_SAVED_PER_CV = 40;

export interface DashboardStats {
  totalCvs: number;
  extractedCvs: number;
  readyCvs: number;
  totalPositionings: number;
  /** Positionnements qui portent un score. */
  analyzed: DashboardPositioning[];
  /** Score moyen arrondi, ou `null` sans positionnement analysé. */
  avgScore: number | null;
  /** Minutes estimées gagnées, ou `null` sans CV extrait. */
  timeSavedMinutes: number | null;
  timeByOperation: TimeByOperation;
}

export interface TimeByOperation {
  aiExtractionMs: number;
  aiAnalysisMs: number;
  aiGenerationMs: number;
  userReviewSeconds: number;
  userPositioningSeconds: number;
  /** Total arrondi en minutes (IA + édition). */
  totalMinutes: number;
}

export function computeDashboardStats(data: DashboardData): DashboardStats {
  const { candidates, positionings } = data;
  const extractedCvs = candidates.filter((c) =>
    (EXTRACTED_CV_STATUSES as readonly string[]).includes(c.status),
  ).length;
  const readyCvs = candidates.filter((c) => c.status === 'ready' || c.status === 'generated').length;
  const analyzed = positionings.filter((p) => p.analysis?.matchScore != null);
  const avgScore =
    analyzed.length > 0
      ? Math.round(analyzed.reduce((sum, p) => sum + (p.analysis?.matchScore ?? 0), 0) / analyzed.length)
      : null;

  const aiExtractionMs = candidates.reduce((s, c) => s + (c.ai_extraction_duration_ms ?? 0), 0);
  const aiAnalysisMs = positionings.reduce((s, p) => s + (p.ai_analysis_duration_ms ?? 0), 0);
  const aiGenerationMs = positionings.reduce((s, p) => s + (p.ai_generation_duration_ms ?? 0), 0);
  const userReviewSeconds = candidates.reduce((s, c) => s + (c.user_review_time_seconds ?? 0), 0);
  const userPositioningSeconds = positionings.reduce((s, p) => s + (p.user_time_seconds ?? 0), 0);
  const totalMinutes = Math.round(
    (aiExtractionMs + aiAnalysisMs + aiGenerationMs) / 60_000 + (userReviewSeconds + userPositioningSeconds) / 60,
  );

  return {
    totalCvs: candidates.length,
    extractedCvs,
    readyCvs,
    totalPositionings: positionings.length,
    analyzed,
    avgScore,
    timeSavedMinutes: extractedCvs > 0 ? extractedCvs * MINUTES_SAVED_PER_CV : null,
    timeByOperation: {
      aiExtractionMs,
      aiAnalysisMs,
      aiGenerationMs,
      userReviewSeconds,
      userPositioningSeconds,
      totalMinutes,
    },
  };
}

// ─── Distribution des scores ────────────────────────────────────────

export const SCORE_BUCKETS = ['0-39', '40-59', '60-79', '80-100'] as const;
export type ScoreBucket = (typeof SCORE_BUCKETS)[number];

export function buildScoreDistribution(
  analyzed: DashboardPositioning[],
): { range: ScoreBucket; count: number }[] {
  const counts: Record<ScoreBucket, number> = { '0-39': 0, '40-59': 0, '60-79': 0, '80-100': 0 };
  for (const p of analyzed) {
    const score = p.analysis?.matchScore ?? 0;
    if (score >= 80) counts['80-100']++;
    else if (score >= 60) counts['60-79']++;
    else if (score >= 40) counts['40-59']++;
    else counts['0-39']++;
  }
  return SCORE_BUCKETS.map((range) => ({ range, count: counts[range] }));
}

// ─── Compétences demandées ──────────────────────────────────────────

export interface SkillDemand {
  skill: string;
  strong: number;
  partial: number;
  missing: number;
  total: number;
  /** Taux de maîtrise : fort = 1, partiel = 0,5, manquant = 0. */
  matchRate: number;
}

export function buildSkillDemand(positionings: DashboardPositioning[], limit = 10): SkillDemand[] {
  const map = new Map<string, { strong: number; partial: number; missing: number; total: number }>();
  for (const p of positionings) {
    for (const sm of p.analysis?.skillMatches ?? []) {
      const entry = map.get(sm.skill) ?? { strong: 0, partial: 0, missing: 0, total: 0 };
      entry[sm.relevance]++;
      entry.total++;
      map.set(sm.skill, entry);
    }
  }
  return Array.from(map.entries())
    .map(([skill, counts]) => ({
      skill,
      ...counts,
      matchRate: Math.round(((counts.strong + counts.partial * 0.5) / counts.total) * 100),
    }))
    .sort((a, b) => b.total - a.total || a.skill.localeCompare(b.skill, 'fr'))
    .slice(0, limit);
}

export interface SkillCoverage {
  strong: number;
  partial: number;
  missing: number;
  total: number;
  /** Couverture globale en %, ou `null` sans compétence évaluée. */
  rate: number | null;
}

export function computeSkillCoverage(positionings: DashboardPositioning[]): SkillCoverage {
  let strong = 0;
  let partial = 0;
  let missing = 0;
  for (const p of positionings) {
    for (const sm of p.analysis?.skillMatches ?? []) {
      if (sm.relevance === 'strong') strong++;
      else if (sm.relevance === 'partial') partial++;
      else missing++;
    }
  }
  const total = strong + partial + missing;
  return {
    strong,
    partial,
    missing,
    total,
    rate: total > 0 ? Math.round(((strong + partial * 0.5) / total) * 100) : null,
  };
}

// ─── Pipeline des CV ────────────────────────────────────────────────

export const CV_PIPELINE_STAGES = [
  { key: 'uploaded', label: 'Importé' },
  { key: 'extracting', label: 'En extraction' },
  { key: 'reviewing', label: 'En relecture' },
  { key: 'ready', label: 'Prêt' },
  { key: 'generated', label: 'Généré' },
] as const;

export interface PipelineStage {
  key: (typeof CV_PIPELINE_STAGES)[number]['key'];
  label: string;
  count: number;
  /** Part du total des CV, 0–100. */
  pct: number;
}

export function buildCvPipeline(candidates: DashboardCandidate[]): PipelineStage[] {
  const counts: Record<string, number> = {};
  for (const c of candidates) counts[c.status] = (counts[c.status] ?? 0) + 1;
  const total = candidates.length;
  return CV_PIPELINE_STAGES.map((stage) => {
    const count = counts[stage.key] ?? 0;
    return { ...stage, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
  });
}

// ─── À reprendre ────────────────────────────────────────────────────

export interface ToReviewItem {
  id: string;
  href: string;
  /** « CV » ou « Positionnement ». */
  kind: 'cv' | 'positioning';
  reason: string;
  /** Ton du statut : échec ou en cours. */
  tone: 'error' | 'pending';
  created_at: string;
  /** Nom du candidat quand il est connu (positionnements seulement). */
  candidateName?: string;
}

const CV_REASONS: Record<string, { reason: string; tone: ToReviewItem['tone'] }> = {
  error: { reason: 'Extraction en échec', tone: 'error' },
  extracting: { reason: 'Extraction en cours', tone: 'pending' },
  uploaded: { reason: 'Importé, extraction non lancée', tone: 'pending' },
};

export function buildToReview(data: DashboardData, limit = 5): ToReviewItem[] {
  const items: ToReviewItem[] = [];
  for (const c of data.candidates) {
    const entry = CV_REASONS[c.status];
    if (!entry) continue;
    items.push({ id: c.id, href: `/review/${c.id}`, kind: 'cv', created_at: c.created_at, ...entry });
  }
  for (const p of data.positionings) {
    if (p.status !== 'error') continue;
    items.push({
      id: p.id,
      href: `/review/${p.candidate_id}/positioning/${p.id}`,
      kind: 'positioning',
      reason: 'Analyse en échec',
      tone: 'error',
      created_at: p.created_at,
      candidateName: p.candidates ? candidateDisplayName(p.candidates.extracted_data) : undefined,
    });
  }
  return items
    .sort((a, b) => {
      if (a.tone !== b.tone) return a.tone === 'error' ? -1 : 1;
      return b.created_at.localeCompare(a.created_at);
    })
    .slice(0, limit);
}

// ─── Derniers positionnements ───────────────────────────────────────

export function pickRecentPositionings(positionings: DashboardPositioning[], limit = 6): DashboardPositioning[] {
  return positionings.filter((p) => p.analysis?.matchScore != null).slice(0, limit);
}

export const POSITIONING_STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  analyzing: 'Analyse en cours',
  analyzed: 'Analysé',
  generating: 'Génération en cours',
  generated: 'Généré',
  exported: 'Exporté',
  error: 'En échec',
};
