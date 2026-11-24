import { describe, expect, it } from 'vitest';
import {
  computeCategoryCoverage,
  countStrongSkills,
  DEFAULT_SKILL_CATEGORY,
  normalizeRelevance,
} from './matching-readout';

describe('normalizeRelevance', () => {
  it('ramène les deux vocabulaires du schéma à trois niveaux', () => {
    expect(normalizeRelevance('strong')).toBe('strong');
    expect(normalizeRelevance('high')).toBe('strong');
    expect(normalizeRelevance('partial')).toBe('partial');
    expect(normalizeRelevance('medium')).toBe('partial');
    expect(normalizeRelevance('missing')).toBe('missing');
    expect(normalizeRelevance('low')).toBe('missing');
  });

  it('ignore les valeurs inconnues ou absentes', () => {
    expect(normalizeRelevance(undefined)).toBeNull();
    expect(normalizeRelevance('')).toBeNull();
    expect(normalizeRelevance('maybe')).toBeNull();
  });
});

describe('computeCategoryCoverage', () => {
  it('regroupe par catégorie et calcule la couverture (fort = 1, partiel = 0,5)', () => {
    const rows = computeCategoryCoverage([
      { skill: 'Java', category: 'Backend', relevance: 'strong' },
      { skill: 'Spring', category: 'Backend', relevance: 'partial' },
      { skill: 'Kafka', category: 'Backend', relevance: 'missing' },
      { skill: 'AWS', category: 'Cloud', relevance: 'strong' },
    ]);
    expect(rows).toEqual([
      { category: 'Backend', strong: 1, partial: 1, missing: 1, total: 3, coveragePercent: 50 },
      { category: 'Cloud', strong: 1, partial: 0, missing: 0, total: 1, coveragePercent: 100 },
    ]);
  });

  it('trie les catégories les plus fournies d’abord, puis par ordre alphabétique', () => {
    const rows = computeCategoryCoverage([
      { category: 'Zèbre', relevance: 'strong' },
      { category: 'Éléphant', relevance: 'strong' },
      { category: 'Data', relevance: 'strong' },
      { category: 'Data', relevance: 'partial' },
    ]);
    expect(rows.map((r) => r.category)).toEqual(['Data', 'Éléphant', 'Zèbre']);
  });

  it('place les compétences sans catégorie dans « Autres » et ignore les pertinences inconnues', () => {
    const rows = computeCategoryCoverage([
      { skill: 'Agile', relevance: 'partial' },
      { skill: '  ', category: '   ', relevance: 'strong' },
      { skill: 'Inconnu', category: 'Backend', relevance: 'maybe' },
    ]);
    expect(rows).toEqual([
      { category: DEFAULT_SKILL_CATEGORY, strong: 1, partial: 1, missing: 0, total: 2, coveragePercent: 75 },
    ]);
  });

  it('rend une liste vide sans compétence', () => {
    expect(computeCategoryCoverage([])).toEqual([]);
  });
});

describe('countStrongSkills', () => {
  it('compte les compétences fortes sur le total évalué', () => {
    expect(
      countStrongSkills([
        { relevance: 'strong' },
        { relevance: 'high' },
        { relevance: 'partial' },
        { relevance: 'nope' },
      ]),
    ).toEqual({ strong: 2, total: 3 });
  });
});
