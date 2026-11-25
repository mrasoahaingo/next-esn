import { describe, expect, it } from 'vitest';
import { formatDurationFr, formatExtractionSummary } from './format-extraction-summary';

const NBSP = ' ';

describe('formatDurationFr', () => {
  it('affiche les secondes seules sous une minute', () => {
    expect(formatDurationFr(42_000)).toBe(`42${NBSP}s`);
  });

  it('affiche minutes et secondes', () => {
    expect(formatDurationFr(134_000)).toBe(`2${NBSP}min 14${NBSP}s`);
  });

  it('omet les secondes quand elles sont nulles', () => {
    expect(formatDurationFr(180_000)).toBe(`3${NBSP}min`);
  });

  it('arrondit et ne descend pas sous zéro', () => {
    expect(formatDurationFr(1_499)).toBe(`1${NBSP}s`);
    expect(formatDurationFr(-5_000)).toBe(`0${NBSP}s`);
  });
});

describe('formatExtractionSummary', () => {
  it('compose durée et nombre d’étapes', () => {
    expect(formatExtractionSummary({ durationMs: 42_000, stepCount: 5 })).toBe(
      `Extraction terminée en 42${NBSP}s · 5${NBSP}étapes`,
    );
  });

  it('omet la durée quand elle est inconnue', () => {
    expect(formatExtractionSummary({ durationMs: null, stepCount: 5 })).toBe(
      `Extraction terminée · 5${NBSP}étapes`,
    );
    expect(formatExtractionSummary({ durationMs: 0, stepCount: 5 })).toBe(
      `Extraction terminée · 5${NBSP}étapes`,
    );
  });

  it('accorde « étape » au singulier et omet le compte à zéro', () => {
    expect(formatExtractionSummary({ durationMs: 1_000, stepCount: 1 })).toBe(
      `Extraction terminée en 1${NBSP}s · 1${NBSP}étape`,
    );
    expect(formatExtractionSummary({ durationMs: undefined, stepCount: 0 })).toBe('Extraction terminée');
  });
});
