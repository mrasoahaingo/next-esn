import { describe, expect, it } from 'vitest';
import type { ExtractedCV } from '@/lib/schema';
import {
  computeReferenceYearsOfExperience,
  formatTotalExperienceYears,
  hasConcreteEndDate,
  normalizeExtractedCvExperienceTime,
  prepareCvForMatchingPrompt,
} from '@/lib/utils/cv-experience-time';
import { sortExperienceIndicesByRecency } from '@/lib/utils/experience-recency';
import { extractYearMonthFromDateString } from '@/lib/utils/cv-date-years';

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

describe('extractYearMonthFromDateString', () => {
  it('lit le mois numérique (MM/YYYY, YYYY-MM, MM-YYYY, YYYY/MM)', () => {
    expect(extractYearMonthFromDateString('09/2019')).toEqual({ year: 2019, month: 8 });
    expect(extractYearMonthFromDateString('2019-09')).toEqual({ year: 2019, month: 8 });
    expect(extractYearMonthFromDateString('09-2019')).toEqual({ year: 2019, month: 8 });
    expect(extractYearMonthFromDateString('2019/09')).toEqual({ year: 2019, month: 8 });
  });

  it('lit les noms de mois FR et EN, complets ou abrégés', () => {
    for (const s of ['Septembre 2019', 'sept. 2019', 'September 2019', 'Sep 2019', 'sep-2019']) {
      expect(extractYearMonthFromDateString(s)).toEqual({ year: 2019, month: 8 });
    }
    expect(extractYearMonthFromDateString('févr. 2020')).toEqual({ year: 2020, month: 1 });
    expect(extractYearMonthFromDateString('Août 2021')).toEqual({ year: 2021, month: 7 });
    expect(extractYearMonthFromDateString('juin 2018')).toEqual({ year: 2018, month: 5 });
    expect(extractYearMonthFromDateString('juil. 2018')).toEqual({ year: 2018, month: 6 });
    expect(extractYearMonthFromDateString('Déc 2017')).toEqual({ year: 2017, month: 11 });
  });

  it('renvoie un mois indéfini sans mois, undefined sans année', () => {
    expect(extractYearMonthFromDateString('2019')).toEqual({ year: 2019, month: undefined });
    expect(extractYearMonthFromDateString('2015 à 2019')).toEqual({ year: 2015, month: undefined });
    expect(extractYearMonthFromDateString('Présent')).toBeUndefined();
  });
});

describe('formatTotalExperienceYears — au mois près, arrondi inférieur', () => {
  const ref = new Date('2026-11-15T00:00:00Z');

  function currentFrom(startDate: string): ExtractedCV {
    return baseCv({
      experiences: [{ role: 'Dev', company: 'Acme', startDate, isCurrent: true, description: [] }],
    });
  }

  it('Septembre 2019 → présent au 11/2026 : 7 ans (87 mois)', () => {
    expect(formatTotalExperienceYears(currentFrom('Septembre 2019'), ref)).toBe('7 ans');
    expect(formatTotalExperienceYears(currentFrom('09/2019'), ref)).toBe('7 ans');
  });

  it('année seule 2019 → présent au 11/2026 : 7 ans (95 mois, arrondi inférieur)', () => {
    expect(formatTotalExperienceYears(currentFrom('2019'), ref)).toBe('7 ans');
  });

  it('compte une seule fois les périodes qui se chevauchent', () => {
    const cv = baseCv({
      experiences: [
        { role: 'A', company: 'X', startDate: '01/2020', endDate: '12/2022', isCurrent: false, description: [] },
        { role: 'B', company: 'Y', startDate: '06/2021', endDate: '12/2023', isCurrent: false, description: [] },
      ],
    });
    expect(formatTotalExperienceYears(cv, ref)).toBe('4 ans');
  });

  it('garde le minimum d’un an, au singulier', () => {
    const cv = currentFrom('09/2026');
    expect(formatTotalExperienceYears(cv, ref)).toBe('1 an');
    expect(formatTotalExperienceYears(cv, ref, 'en')).toBe('1 year');
  });
});

describe('computeReferenceYearsOfExperience', () => {
  const ref = new Date('2026-11-15T00:00:00Z');

  it('renvoie la valeur calculée, pas celle du CV', () => {
    const cv = baseCv({
      personalInfo: { firstName: 'J', lastName: 'D', title: 'Dev', yearsOfExperience: '10 ans' },
      experiences: [{ role: 'Dev', company: 'Acme', startDate: '09/2019', isCurrent: true, description: [] }],
    });
    expect(computeReferenceYearsOfExperience(cv, ref)).toBe('7 ans');
  });

  it('renvoie undefined sans date exploitable (jamais la valeur LLM)', () => {
    const cv = baseCv({
      personalInfo: { firstName: 'J', lastName: 'D', title: 'Dev', yearsOfExperience: '10 ans' },
      experiences: [{ role: 'Dev', company: 'Acme', startDate: 'bientôt', isCurrent: true, description: [] }],
    });
    expect(computeReferenceYearsOfExperience(cv, ref)).toBeUndefined();
  });
});
