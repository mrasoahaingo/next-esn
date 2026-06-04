import { describe, it, expect } from 'vitest';
import { buildCvPdfFilename } from './cv-pdf-filename';

describe('buildCvPdfFilename', () => {
  it('returns cv-himeo.pdf when called with undefined', () => {
    expect(buildCvPdfFilename(undefined)).toBe('cv-himeo.pdf');
  });

  it('returns cv-himeo.pdf when called with null', () => {
    expect(buildCvPdfFilename(null)).toBe('cv-himeo.pdf');
  });

  it('returns cv-himeo.pdf when called with empty string', () => {
    expect(buildCvPdfFilename('')).toBe('cv-himeo.pdf');
  });

  it('returns cv-himeo-jean-dupont.pdf for "Jean Dupont"', () => {
    expect(buildCvPdfFilename('Jean Dupont')).toBe('cv-himeo-jean-dupont.pdf');
  });

  it('strips accents and handles hyphens: "Marie-Claire Élise"', () => {
    expect(buildCvPdfFilename('Marie-Claire Élise')).toBe(
      'cv-himeo-marie-claire-elise.pdf'
    );
  });

  it('strips accents for "François Müller"', () => {
    expect(buildCvPdfFilename('François Müller')).toBe(
      'cv-himeo-francois-muller.pdf'
    );
  });

  it('trims and collapses spaces: "  Alice   Bob  "', () => {
    expect(buildCvPdfFilename('  Alice   Bob  ')).toBe(
      'cv-himeo-alice-bob.pdf'
    );
  });

  it('handles single name: "Jean"', () => {
    expect(buildCvPdfFilename('Jean')).toBe('cv-himeo-jean.pdf');
  });
});
