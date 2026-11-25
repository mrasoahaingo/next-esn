import { describe, expect, it } from 'vitest';
import {
  candidateDisplayName,
  formatDurationMs,
  formatRelativeDate,
  formatShortDate,
  formatTimeSaved,
  jobTitleFromDescription,
  plural,
} from './dashboard-format';

describe('formatTimeSaved', () => {
  it('passe des minutes aux heures, jours (8 h) et semaines (5 j)', () => {
    expect(formatTimeSaved(40)).toBe('40 min');
    expect(formatTimeSaved(120)).toBe('2 h');
    expect(formatTimeSaved(90)).toBe('1,5 h');
    expect(formatTimeSaved(8 * 60)).toBe('1 j');
    expect(formatTimeSaved(12 * 60)).toBe('1,5 j');
    expect(formatTimeSaved(5 * 8 * 60)).toBe('1 sem');
  });
});

describe('formatDurationMs', () => {
  it('écrit les durées avec leurs unités', () => {
    expect(formatDurationMs(42_000)).toBe('42 s');
    expect(formatDurationMs(185_000)).toBe('3 min 05 s');
    expect(formatDurationMs(180_000)).toBe('3 min');
    expect(formatDurationMs(72 * 60_000)).toBe('1 h 12 min');
    expect(formatDurationMs(120 * 60_000)).toBe('2 h');
  });
});

describe('formatShortDate', () => {
  it('rend un jour et un mois court, ou un tiret si la date est invalide', () => {
    expect(formatShortDate('2026-11-24T10:00:00Z')).toMatch(/^24 nov\.?$/);
    expect(formatShortDate('pas une date')).toBe('—');
  });
});

describe('candidateDisplayName', () => {
  it('assemble prénom et nom, et replie sur « Sans nom »', () => {
    expect(candidateDisplayName({ personalInfo: { firstName: 'Camille', lastName: 'Durand' } })).toBe(
      'Camille Durand',
    );
    expect(candidateDisplayName({ personalInfo: { lastName: 'Durand' } })).toBe('Durand');
    expect(candidateDisplayName({ personalInfo: { title: 'Dev' } })).toBe('Sans nom');
    expect(candidateDisplayName(null)).toBe('Sans nom');
  });
});

describe('jobTitleFromDescription', () => {
  it('garde la première ligne et tronque avec une vraie ellipse', () => {
    expect(jobTitleFromDescription('Tech lead Java\nAcme, Paris')).toBe('Tech lead Java');
    const long = 'A'.repeat(60);
    const result = jobTitleFromDescription(long);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBe(50);
  });
});

describe('plural', () => {
  it('accorde au-delà de un', () => {
    expect(plural(1, 'CV extrait')).toBe('CV extrait');
    expect(plural(3, 'CV extrait')).toBe('CV extraits');
    expect(plural(2, 'analyse')).toBe('analyses');
  });
});

describe('formatRelativeDate', () => {
  const now = new Date('2026-11-24T15:30:00');

  it('parle en minutes puis en heures le jour même', () => {
    expect(formatRelativeDate('2026-11-24T15:29:50', now)).toBe('à l’instant');
    expect(formatRelativeDate('2026-11-24T15:25:00', now)).toBe('il y a 5 min');
    expect(formatRelativeDate('2026-11-24T13:10:00', now)).toBe('il y a 2 h');
  });

  it('dit « hier » puis donne la date courte', () => {
    expect(formatRelativeDate('2026-11-23T23:00:00', now)).toBe('hier');
    expect(formatRelativeDate('2026-11-23T01:00:00', now)).toBe('hier');
    expect(formatRelativeDate('2026-03-21T10:00:00', now)).toBe('21 mars');
    expect(formatRelativeDate('2025-12-02T10:00:00', now)).toBe('2 déc. 2025');
  });

  it('affiche « — » pour une date invalide', () => {
    expect(formatRelativeDate('pas une date', now)).toBe('—');
  });
});
