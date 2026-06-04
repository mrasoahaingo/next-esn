import { describe, expect, it } from 'vitest';
import type { ExtractedCV } from '@/lib/schema';
import {
  formatTotalExperienceYears,
  hasConcreteEndDate,
  normalizeExtractedCvExperienceTime,
  prepareCvForMatchingPrompt,
} from '@/lib/utils/cv-experience-time';
import { sortExperienceIndicesByRecency } from '@/lib/utils/experience-recency';

function baseCv(overrides: Partial<ExtractedCV> = {}): ExtractedCV {
  return {
    language: 'fr',
    personalInfo: {
      firstName: 'Jean',
      lastName: 'Dupont',
      title: 'Développeur',
      yearsOfExperience: '3 ans',
    },
    summary: 'Résumé.',
    experiences: [],
    education: [],
    skills: {
      technologies: [],
      softSkills: [],
      expertises: [],
      methodologies: [],
    },
    ...overrides,
  };
}

describe('hasConcreteEndDate', () => {
  it('returns false for empty or présent-only strings', () => {
    expect(hasConcreteEndDate(undefined)).toBe(false);
    expect(hasConcreteEndDate('')).toBe(false);
    expect(hasConcreteEndDate('  ')).toBe(false);
    expect(hasConcreteEndDate('Présent')).toBe(false);
    expect(hasConcreteEndDate('En cours')).toBe(false);
  });

  it('returns true when a 4-digit year is present', () => {
    expect(hasConcreteEndDate('2024')).toBe(true);
    expect(hasConcreteEndDate('mars 2023')).toBe(true);
  });
});

describe('normalizeExtractedCvExperienceTime', () => {
  it('sets isCurrent and clears endDate when the most recent role has no concrete end', () => {
    const ref = new Date('2026-06-15T12:00:00Z');
    const cv = baseCv({
      experiences: [
        {
          role: 'Lead',
          company: 'Acme',
          startDate: '2020',
          endDate: 'Présent',
          isCurrent: false,
          description: [],
        },
        {
          role: 'Dev',
          company: 'Old',
          startDate: '2015',
          endDate: '2019',
          isCurrent: false,
          description: [],
        },
      ],
    });
    const out = normalizeExtractedCvExperienceTime(cv, ref);
    expect(out.experiences![0].isCurrent).toBe(true);
    expect(out.experiences![0].endDate).toBeUndefined();
  });

  it('does not change the first experience when endDate has a year', () => {
    const ref = new Date('2026-01-01T00:00:00Z');
    const cv = baseCv({
      experiences: [
        {
          role: 'Dev',
          company: 'X',
          startDate: '2022',
          endDate: '2024',
          isCurrent: false,
          description: [],
        },
      ],
    });
    const out = normalizeExtractedCvExperienceTime(cv, ref);
    expect(out.experiences![0]).toEqual(cv.experiences![0]);
  });
});

describe('prepareCvForMatchingPrompt', () => {
  it('recomputes yearsOfExperience using referenceDate for an open-ended recent role (French CV → "8 ans")', () => {
    const ref = new Date('2026-03-01T00:00:00Z');
    const cv = baseCv({
      personalInfo: {
        firstName: 'Jean',
        lastName: 'Dupont',
        title: 'Développeur',
        yearsOfExperience: '2 ans',
      },
      experiences: [
        {
          role: 'Dev',
          company: 'Acme',
          startDate: '2018',
          isCurrent: false,
          description: [],
        },
      ],
    });
    const out = prepareCvForMatchingPrompt(cv, ref);
    expect(out.experiences![0].isCurrent).toBe(true);
    expect(out.personalInfo.yearsOfExperience).toBe('8 ans');
  });

  it('uses "years" label for an English CV', () => {
    const ref = new Date('2026-03-01T00:00:00Z');
    const cv = baseCv({
      language: 'en',
      personalInfo: {
        firstName: 'John',
        lastName: 'Doe',
        title: 'Developer',
        yearsOfExperience: '2 years',
      },
      experiences: [
        {
          role: 'Dev',
          company: 'Acme',
          startDate: '2018',
          isCurrent: false,
          description: [],
        },
      ],
    });
    const out = prepareCvForMatchingPrompt(cv, ref);
    expect(out.personalInfo.yearsOfExperience).toBe('8 years');
  });
});

describe('sortExperienceIndicesByRecency + normalization', () => {
  it('ranks the ongoing first role as most recent using referenceDate year', () => {
    const ref = new Date('2026-01-15T00:00:00Z');
    const cv = normalizeExtractedCvExperienceTime(
      baseCv({
        experiences: [
          {
            role: 'Recent',
            company: 'A',
            startDate: '2024',
            isCurrent: false,
            description: [],
          },
          {
            role: 'Old',
            company: 'B',
            startDate: '2010',
            endDate: '2015',
            isCurrent: false,
            description: [],
          },
        ],
      }),
      ref,
    );
    const order = sortExperienceIndicesByRecency(cv.experiences!, ref);
    expect(order[0]).toBe(0);
  });
});

describe('formatTotalExperienceYears', () => {
  it('returns undefined when no experience has a parseable start year', () => {
    const ref = new Date('2026-01-01T00:00:00Z');
    const cv = baseCv({
      experiences: [
        {
          role: 'X',
          company: 'Y',
          startDate: 'bientôt',
          isCurrent: true,
          description: [],
        },
      ],
    });
    expect(formatTotalExperienceYears(cv, ref)).toBeUndefined();
  });
});
