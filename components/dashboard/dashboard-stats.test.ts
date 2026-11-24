import { describe, expect, it } from 'vitest';
import {
  buildCvPipeline,
  buildScoreDistribution,
  buildSkillDemand,
  buildToReview,
  computeDashboardStats,
  computeSkillCoverage,
  EMPTY_DASHBOARD_DATA,
  MINUTES_SAVED_PER_CV,
  pickRecentPositionings,
  type DashboardCandidate,
  type DashboardData,
  type DashboardPositioning,
} from './dashboard-stats';

function candidate(partial: Partial<DashboardCandidate> & { id: string }): DashboardCandidate {
  return { status: 'ready', created_at: '2026-11-20T08:00:00Z', ...partial };
}

function positioning(partial: Partial<DashboardPositioning> & { id: string }): DashboardPositioning {
  return {
    candidate_id: 'c1',
    job_description: 'Tech lead Java',
    status: 'analyzed',
    analysis: null,
    created_at: '2026-11-20T08:00:00Z',
    candidates: null,
    ...partial,
  };
}

const data: DashboardData = {
  candidates: [
    candidate({ id: 'c1', status: 'generated', ai_extraction_duration_ms: 30_000, user_review_time_seconds: 90 }),
    candidate({ id: 'c2', status: 'reviewing', ai_extraction_duration_ms: 30_000 }),
    candidate({ id: 'c3', status: 'extracting', created_at: '2026-11-22T08:00:00Z' }),
    candidate({ id: 'c4', status: 'error', created_at: '2026-11-21T08:00:00Z' }),
    candidate({ id: 'c5', status: 'uploaded', created_at: '2026-11-23T08:00:00Z' }),
  ],
  positionings: [
    positioning({
      id: 'p1',
      analysis: {
        matchScore: 85,
        skillMatches: [
          { skill: 'Java', relevance: 'strong' },
          { skill: 'Kafka', relevance: 'partial' },
        ],
      },
      ai_analysis_duration_ms: 60_000,
      user_time_seconds: 30,
    }),
    positioning({
      id: 'p2',
      analysis: {
        matchScore: 45,
        skillMatches: [
          { skill: 'Java', relevance: 'missing' },
          { skill: 'Kafka', relevance: 'strong' },
          { skill: 'AWS', relevance: 'missing' },
        ],
      },
    }),
    positioning({ id: 'p3', status: 'draft' }),
    positioning({ id: 'p4', status: 'error', created_at: '2026-11-24T08:00:00Z' }),
  ],
  recruiter_skills: { total: 3, items: [] },
};

describe('computeDashboardStats', () => {
  it('compte les CV, les positionnements et le score moyen', () => {
    const stats = computeDashboardStats(data);
    expect(stats.totalCvs).toBe(5);
    expect(stats.extractedCvs).toBe(2);
    expect(stats.readyCvs).toBe(1);
    expect(stats.totalPositionings).toBe(4);
    expect(stats.analyzed.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(stats.avgScore).toBe(65);
    expect(stats.timeSavedMinutes).toBe(2 * MINUTES_SAVED_PER_CV);
  });

  it('additionne le temps par opération', () => {
    const { timeByOperation } = computeDashboardStats(data);
    expect(timeByOperation.aiExtractionMs).toBe(60_000);
    expect(timeByOperation.aiAnalysisMs).toBe(60_000);
    expect(timeByOperation.userReviewSeconds).toBe(90);
    expect(timeByOperation.userPositioningSeconds).toBe(30);
    expect(timeByOperation.totalMinutes).toBe(4);
  });

  it('ne fabrique aucun chiffre sans donnée', () => {
    const stats = computeDashboardStats(EMPTY_DASHBOARD_DATA);
    expect(stats.avgScore).toBeNull();
    expect(stats.timeSavedMinutes).toBeNull();
    expect(stats.timeByOperation.totalMinutes).toBe(0);
  });
});

describe('buildScoreDistribution', () => {
  it('range les scores dans quatre tranches, toujours dans le même ordre', () => {
    const { analyzed } = computeDashboardStats(data);
    expect(buildScoreDistribution(analyzed)).toEqual([
      { range: '0-39', count: 0 },
      { range: '40-59', count: 1 },
      { range: '60-79', count: 0 },
      { range: '80-100', count: 1 },
    ]);
  });
});

describe('buildSkillDemand', () => {
  it('trie par fréquence puis par nom, et calcule le taux de maîtrise', () => {
    const demand = buildSkillDemand(data.positionings);
    expect(demand.map((d) => d.skill)).toEqual(['Java', 'Kafka', 'AWS']);
    expect(demand[0]).toMatchObject({ strong: 1, partial: 0, missing: 1, total: 2, matchRate: 50 });
    expect(demand[1]).toMatchObject({ strong: 1, partial: 1, missing: 0, total: 2, matchRate: 75 });
    expect(buildSkillDemand(data.positionings, 1)).toHaveLength(1);
  });
});

describe('computeSkillCoverage', () => {
  it('compte les relevances et donne la couverture globale', () => {
    expect(computeSkillCoverage(data.positionings)).toEqual({
      strong: 2,
      partial: 1,
      missing: 2,
      total: 5,
      rate: 50,
    });
    expect(computeSkillCoverage([]).rate).toBeNull();
  });
});

describe('buildCvPipeline', () => {
  it('donne un compteur et une part par étape, dans l’ordre du flux', () => {
    const pipeline = buildCvPipeline(data.candidates);
    expect(pipeline.map((s) => s.key)).toEqual(['uploaded', 'extracting', 'reviewing', 'ready', 'generated']);
    expect(pipeline.map((s) => s.count)).toEqual([1, 1, 1, 0, 1]);
    expect(pipeline[0].pct).toBe(20);
    expect(buildCvPipeline([]).every((s) => s.pct === 0)).toBe(true);
  });
});

describe('buildToReview', () => {
  it('liste les CV en cours ou en échec et les positionnements en échec, échecs d’abord', () => {
    const items = buildToReview(data);
    expect(items.map((i) => `${i.kind}:${i.id}`)).toEqual([
      'positioning:p4',
      'cv:c4',
      'cv:c5',
      'cv:c3',
    ]);
    expect(items[1]).toMatchObject({ href: '/review/c4', reason: 'Extraction en échec', tone: 'error' });
    expect(items[0].href).toBe('/review/c1/positioning/p4');
  });

  it('respecte la limite', () => {
    expect(buildToReview(data, 2)).toHaveLength(2);
  });
});

describe('pickRecentPositionings', () => {
  it('ne garde que les positionnements qui portent un score', () => {
    expect(pickRecentPositionings(data.positionings).map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(pickRecentPositionings(data.positionings, 1)).toHaveLength(1);
  });
});
