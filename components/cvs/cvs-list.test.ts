import { describe, expect, it } from 'vitest';
import {
  candidateName,
  candidateTitle,
  countByFilter,
  cvFilterLabel,
  filterCandidates,
  groupPositioningsByCandidate,
  normalizeSearch,
  positioningLabel,
  summarizePositionings,
  type CvListCandidate,
  type CvListPositioning,
} from './cvs-list';

function candidate(overrides: Partial<CvListCandidate> & { id: string }): CvListCandidate {
  return {
    status: 'reviewing',
    extracted_data: null,
    created_at: '2026-11-20T10:00:00Z',
    original_file_url: 'org/123_cv_camille.pdf',
    ...overrides,
  };
}

function positioning(overrides: Partial<CvListPositioning> & { id: string }): CvListPositioning {
  return {
    candidate_id: 'c1',
    mission_id: null,
    job_description: 'Tech lead Java\nParis',
    status: 'analyzed',
    workflow_run_id: null,
    analysis: null,
    missions: null,
    created_at: '2026-11-20T10:00:00Z',
    ...overrides,
  };
}

describe('candidateName / candidateTitle', () => {
  it('préfère l’état civil extrait, sinon nettoie le nom du fichier', () => {
    expect(
      candidateName(candidate({ id: 'a', extracted_data: { personalInfo: { firstName: 'Camille', lastName: 'Durand' } } })),
    ).toBe('Camille Durand');
    expect(candidateName(candidate({ id: 'b' }))).toBe('cv camille');
    expect(candidateName(candidate({ id: 'c', original_file_url: 'org/' }))).toBe('Sans nom');
  });

  it('renvoie `null` sans titre', () => {
    expect(candidateTitle(candidate({ id: 'a' }))).toBeNull();
    expect(candidateTitle(candidate({ id: 'a', extracted_data: { personalInfo: { title: ' Dev ' } } }))).toBe('Dev');
  });
});

describe('positioningLabel', () => {
  it('nomme la mission quand elle existe, sinon la première ligne de la fiche', () => {
    expect(positioningLabel(positioning({ id: 'p', missions: { id: 'm', title: 'Tech lead', company: 'Acme' } }))).toBe(
      'Tech lead, Acme',
    );
    expect(positioningLabel(positioning({ id: 'p' }))).toBe('Tech lead Java');
    expect(positioningLabel(positioning({ id: 'p', job_description: 'x'.repeat(80) }), 20)).toHaveLength(20);
  });
});

describe('filterCandidates', () => {
  const list = [
    candidate({ id: '1', created_at: '2026-11-01T00:00:00Z', extracted_data: { personalInfo: { firstName: 'Élodie', lastName: 'Martin', title: 'Data engineer' } } }),
    candidate({ id: '2', status: 'extracting', created_at: '2026-11-03T00:00:00Z', extracted_data: { personalInfo: { firstName: 'Noé', lastName: 'Petit' } } }),
    candidate({ id: '3', status: 'error', created_at: '2026-11-02T00:00:00Z' }),
  ];

  it('trie du plus récent au plus ancien', () => {
    expect(filterCandidates(list, { query: '', filter: 'all' }).map((c) => c.id)).toEqual(['2', '3', '1']);
  });

  it('cherche sans tenir compte des accents ni de la casse, sur le nom et le titre', () => {
    expect(filterCandidates(list, { query: 'elodie', filter: 'all' }).map((c) => c.id)).toEqual(['1']);
    expect(filterCandidates(list, { query: 'DATA eng', filter: 'all' }).map((c) => c.id)).toEqual(['1']);
    expect(filterCandidates(list, { query: 'camille', filter: 'all' }).map((c) => c.id)).toEqual(['3']);
  });

  it('combine le statut et la recherche', () => {
    expect(filterCandidates(list, { query: '', filter: 'extracting' }).map((c) => c.id)).toEqual(['2']);
    expect(filterCandidates(list, { query: 'noé', filter: 'error' })).toEqual([]);
  });

  it('compte chaque chip sur la liste filtrée par la recherche seulement', () => {
    expect(countByFilter(list, '')).toEqual({ all: 3, extracting: 1, reviewing: 1, ready: 0, generated: 0, error: 1 });
    expect(countByFilter(list, 'petit').all).toBe(1);
  });

  it('libelle les chips en français', () => {
    expect(cvFilterLabel('all')).toBe('Tous');
    expect(cvFilterLabel('error')).toBe('Échec');
  });
});

describe('normalizeSearch', () => {
  it('retire accents, casse et espaces de bord', () => {
    expect(normalizeSearch('  Élodie  ')).toBe('elodie');
  });
});

describe('positionnements par candidat', () => {
  const positionings = [
    positioning({ id: 'a', candidate_id: 'c1', analysis: { matchScore: 42 } }),
    positioning({ id: 'b', candidate_id: 'c1', analysis: { matchScore: 84 } }),
    positioning({ id: 'c', candidate_id: 'c1', status: 'draft' }),
    positioning({ id: 'd', candidate_id: 'c2' }),
  ];

  it('regroupe et trie par score décroissant, les brouillons en dernier', () => {
    const grouped = groupPositioningsByCandidate(positionings);
    expect(grouped.get('c1')?.map((p) => p.id)).toEqual(['b', 'a', 'c']);
    expect(grouped.get('c2')?.map((p) => p.id)).toEqual(['d']);
  });

  it('résume le nombre et le meilleur score', () => {
    expect(summarizePositionings(groupPositioningsByCandidate(positionings).get('c1'))).toEqual({ count: 3, best: 84 });
    expect(summarizePositionings(groupPositioningsByCandidate(positionings).get('c2'))).toEqual({ count: 1, best: null });
    expect(summarizePositionings(undefined)).toEqual({ count: 0, best: null });
  });
});
