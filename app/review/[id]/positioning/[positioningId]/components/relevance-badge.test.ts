import { describe, expect, it } from 'vitest';
import {
  confidenceBadge,
  experienceRelevanceBadge,
  formatCount,
  formatStrongSkillsCount,
  skillRelevanceBadge,
} from './relevance-badge';

describe('skillRelevanceBadge', () => {
  it('donne un ton et un libellé par niveau, dans les deux vocabulaires du schéma', () => {
    expect(skillRelevanceBadge('strong')).toEqual({ label: 'Fort', tone: 'ok' });
    expect(skillRelevanceBadge('partial')).toEqual({ label: 'Partiel', tone: 'warn' });
    expect(skillRelevanceBadge('missing')).toEqual({ label: 'Manquant', tone: 'err' });
    expect(skillRelevanceBadge('high')).toEqual({ label: 'Fort', tone: 'ok' });
  });

  it('ne rend rien pour une valeur inconnue', () => {
    expect(skillRelevanceBadge(undefined)).toBeNull();
    expect(skillRelevanceBadge('maybe')).toBeNull();
  });
});

describe('experienceRelevanceBadge', () => {
  it('parle de pertinence, pas de présence', () => {
    expect(experienceRelevanceBadge('high')).toEqual({ label: 'Forte', tone: 'ok' });
    expect(experienceRelevanceBadge('medium')).toEqual({ label: 'Moyenne', tone: 'warn' });
    expect(experienceRelevanceBadge('low')).toEqual({ label: 'Faible', tone: 'err' });
    expect(experienceRelevanceBadge('')).toBeNull();
  });
});

describe('confidenceBadge', () => {
  it('suit les trois niveaux et retombe sur neutre', () => {
    expect(confidenceBadge('high')).toEqual({ label: 'Fiabilité élevée', tone: 'ok' });
    expect(confidenceBadge('medium')).toEqual({ label: 'Fiabilité moyenne', tone: 'warn' });
    expect(confidenceBadge('low')).toEqual({ label: 'Fiabilité faible', tone: 'err' });
    expect(confidenceBadge(undefined)).toEqual({ label: 'Fiabilité non évaluée', tone: 'neutral' });
    expect(confidenceBadge(null)).toEqual({ label: 'Fiabilité non évaluée', tone: 'neutral' });
  });
});

describe('formatStrongSkillsCount', () => {
  it('accorde « forte » et tait le compteur sans compétence', () => {
    expect(formatStrongSkillsCount({ strong: 12, total: 15 })).toBe('12 fortes sur 15');
    expect(formatStrongSkillsCount({ strong: 1, total: 3 })).toBe('1 forte sur 3');
    expect(formatStrongSkillsCount({ strong: 0, total: 2 })).toBe('0 forte sur 2');
    expect(formatStrongSkillsCount({ strong: 0, total: 0 })).toBeNull();
  });
});

describe('formatCount', () => {
  it('accorde le nom et gère le zéro', () => {
    expect(formatCount(1, 'lacune', 'lacunes')).toBe('1 lacune');
    expect(formatCount(3, 'lacune', 'lacunes')).toBe('3 lacunes');
    expect(formatCount(0, 'lacune', 'lacunes')).toBeNull();
    expect(formatCount(0, 'lacune', 'lacunes', 'Aucune')).toBe('Aucune');
  });
});
