import { describe, expect, it } from 'vitest';
import { countIncludedSkills } from './count-included-skills';

const skill = (name: string, added?: boolean, starred?: boolean) => ({
  name,
  source: 'extracted' as const,
  starred: starred ?? false,
  added: added ?? false,
});

describe('countIncludedSkills', () => {
  it('renvoie 0 sans données', () => {
    expect(countIncludedSkills(undefined)).toBe(0);
    expect(countIncludedSkills(null)).toBe(0);
    expect(countIncludedSkills({})).toBe(0);
  });

  it('compte les compétences incluses de toutes les catégories', () => {
    expect(
      countIncludedSkills({
        technologies: [skill('Java', true), skill('Go', false)],
        softSkills: [skill('Écoute', true)],
        expertises: [],
        methodologies: [skill('Scrum', true), skill('Kanban', true)],
      }),
    ).toBe(4);
  });

  it('considère une compétence en texte simple comme incluse', () => {
    expect(countIncludedSkills({ technologies: ['Java', 'Kotlin'] as unknown as never })).toBe(2);
  });

  it('retombe sur « clé » quand « incluse » est absent', () => {
    expect(
      countIncludedSkills({
        technologies: [
          { name: 'Java', source: 'extracted', starred: true } as unknown as never,
          { name: 'Go', source: 'inferred', starred: false } as unknown as never,
        ],
      }),
    ).toBe(1);
  });

  it('ignore les entrées nulles', () => {
    expect(countIncludedSkills({ technologies: [null, skill('Java', true)] as unknown as never })).toBe(1);
  });
});
