import { describe, expect, it } from 'vitest';
import { scoreTone, scoreToneSoftBg, scoreToneText, SCORE_THRESHOLDS } from './score-tone';

describe('scoreTone', () => {
  it('classe les scores selon les seuils partagés', () => {
    expect(scoreTone(100)).toBe('strong');
    expect(scoreTone(SCORE_THRESHOLDS.strong)).toBe('strong');
    expect(scoreTone(SCORE_THRESHOLDS.strong - 1)).toBe('partial');
    expect(scoreTone(SCORE_THRESHOLDS.partial)).toBe('partial');
    expect(scoreTone(SCORE_THRESHOLDS.partial - 1)).toBe('weak');
    expect(scoreTone(0)).toBe('weak');
  });

  it('renvoie des classes Tailwind cohérentes', () => {
    expect(scoreToneText(84)).toBe('text-success');
    expect(scoreToneText(55)).toBe('text-warning');
    expect(scoreToneText(12)).toBe('text-destructive');
    expect(scoreToneSoftBg(84)).toBe('bg-success/12');
  });
});
