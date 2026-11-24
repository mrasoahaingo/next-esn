import { describe, expect, it } from 'vitest';
import type { ExtractedCV, PositioningAnalysis } from '@/lib/schema';
import { buildGenerateUserContent } from '@/lib/services/positioning.service';

const REF = new Date('2026-11-15T00:00:00Z');

function baseCv(overrides: Partial<ExtractedCV> = {}): ExtractedCV {
  return {
    language: 'fr',
    personalInfo: {
      firstName: 'Jean',
      lastName: 'Dupont',
      title: 'Développeur',
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

const analysis = {
  skillMatches: [],
  experienceRelevance: [],
  gaps: [],
} as unknown as PositioningAnalysis;

function generate(cv: ExtractedCV): string {
  return buildGenerateUserContent(cv, 'Fiche de poste', analysis, {}, null, null, { referenceDate: REF });
}

describe('buildGenerateUserContent — règles de sortie', () => {
  it('ajoute le bloc « Règles de sortie » (pas de "null", pas de markdown dans les compétences)', () => {
    const content = generate(baseCv());
    expect(content).toContain('## Règles de sortie');
    expect(content).toContain('"null"');
    expect(content).toMatch(/compétences[^\n]*markdown/i);
  });

  it('n’injecte pas un champ "null" du CV source dans le prompt', () => {
    const cv = baseCv({
      personalInfo: {
        firstName: 'Jean',
        lastName: 'Dupont',
        title: 'Développeur',
        phone: 'null',
      },
    });
    expect(generate(cv)).not.toContain('"phone"');
  });
});
