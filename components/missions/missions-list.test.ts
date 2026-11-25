import { describe, expect, it } from 'vitest';
import {
  countMissionsByFilter,
  filterMissions,
  matchesMissionQuery,
  missionAnalysisStatus,
  missionHeadline,
  missionsCountLabel,
  summarizeMissionPositionings,
  type MissionListItem,
} from './missions-list';

function mission(overrides: Partial<MissionListItem> = {}): MissionListItem {
  return {
    id: 'm1',
    title: 'Tech lead Java',
    company: 'Acme',
    job_description: 'Fiche',
    positioning_count: 0,
    created_at: '2026-11-20T10:00:00Z',
    ...overrides,
  };
}

describe('missionAnalysisStatus', () => {
  it('dérive l’état de la fiche des seuls champs serveur', () => {
    expect(missionAnalysisStatus(mission()).key).toBe('todo');
    expect(missionAnalysisStatus(mission({ job_analysis_workflow_run_id: 'run' }))).toMatchObject({
      key: 'analyzing',
      tone: 'info',
      pulse: true,
    });
    expect(missionAnalysisStatus(mission({ job_analysis: { executiveSummary: 'ok', keyPoints: [] } }))).toMatchObject({
      key: 'analyzed',
      tone: 'ok',
    });
    expect(missionAnalysisStatus(mission({ workflow_last_error: { message: 'boom' } }))).toMatchObject({
      key: 'error',
      tone: 'err',
    });
  });

  it('place l’échec avant l’analyse en cours', () => {
    expect(
      missionAnalysisStatus(mission({ workflow_last_error: { message: 'boom' }, job_analysis_workflow_run_id: 'r' })).key,
    ).toBe('error');
  });
});

describe('matchesMissionQuery', () => {
  it('ignore les accents et la casse, sur l’intitulé et l’entreprise', () => {
    const m = mission({ title: 'Développeur sénior', company: 'Société Générale' });
    expect(matchesMissionQuery(m, 'developpeur')).toBe(true);
    expect(matchesMissionQuery(m, 'societe')).toBe(true);
    expect(matchesMissionQuery(m, 'SENIOR generale')).toBe(true);
    expect(matchesMissionQuery(m, 'python')).toBe(false);
    expect(matchesMissionQuery(m, '  ')).toBe(true);
  });
});

describe('filterMissions / countMissionsByFilter', () => {
  const list = [
    mission({ id: 'a', created_at: '2026-11-01T00:00:00Z' }),
    mission({ id: 'b', created_at: '2026-11-03T00:00:00Z', job_analysis_workflow_run_id: 'r' }),
    mission({ id: 'c', created_at: '2026-11-02T00:00:00Z', title: 'Data engineer', job_analysis: { keyPoints: [{}] } }),
  ];

  it('trie la plus récente en premier et combine recherche et état', () => {
    expect(filterMissions(list, { query: '', filter: 'all' }).map((m) => m.id)).toEqual(['b', 'c', 'a']);
    expect(filterMissions(list, { query: '', filter: 'analyzing' }).map((m) => m.id)).toEqual(['b']);
    expect(filterMissions(list, { query: 'java', filter: 'analyzed' })).toEqual([]);
  });

  it('compte chaque chip sur la liste filtrée par la recherche seulement', () => {
    expect(countMissionsByFilter(list, '')).toEqual({ all: 3, todo: 1, analyzing: 1, analyzed: 1, error: 0 });
    expect(countMissionsByFilter(list, 'data')).toEqual({ all: 1, todo: 0, analyzing: 0, analyzed: 1, error: 0 });
  });
});

describe('summarizeMissionPositionings', () => {
  it('prend le compte de l’API et le meilleur score des positionnements de la mission', () => {
    const summary = summarizeMissionPositionings(mission({ positioning_count: 3 }), [
      { id: 'p1', mission_id: 'm1', analysis: { matchScore: 62 } },
      { id: 'p2', mission_id: 'm1', analysis: { matchScore: 84 } },
      { id: 'p3', mission_id: 'm1', analysis: null },
      { id: 'p4', mission_id: 'autre', analysis: { matchScore: 99 } },
    ]);
    expect(summary).toEqual({ count: 3, best: 84 });
    expect(summarizeMissionPositionings(mission(), [])).toEqual({ count: 0, best: null });
  });
});

describe('libellés', () => {
  it('compose l’intitulé et l’entreprise', () => {
    expect(missionHeadline({ title: 'Tech lead', company: 'Acme' })).toBe('Tech lead, Acme');
    expect(missionHeadline({ title: 'Tech lead', company: null })).toBe('Tech lead');
    expect(missionHeadline({ title: '  ', company: null })).toBe('Sans intitulé');
  });

  it('accorde le compteur de fiches', () => {
    expect(missionsCountLabel(0)).toBe('Aucune fiche de mission');
    expect(missionsCountLabel(1)).toBe('1 fiche de mission');
    expect(missionsCountLabel(4)).toBe('4 fiches de mission');
  });
});
