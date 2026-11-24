import { describe, expect, it } from 'vitest';
import type { ExtractedCV } from '@/lib/schema';
import { isNullLikeText, sanitizeExtractedCv, stripSkillMarkdown } from '@/lib/utils/cv-sanitize';

/** Les sorties LLM non strictes ne respectent pas le type : on les construit en `unknown`. */
function asCv(raw: unknown): Partial<ExtractedCV> {
  return raw as Partial<ExtractedCV>;
}

function skill(name: unknown, extra: Record<string, unknown> = {}): unknown {
  return { name, source: 'extracted', starred: false, added: true, ...extra };
}

describe('isNullLikeText', () => {
  it('reconnaît null et les chaînes "null" / "undefined"', () => {
    expect(isNullLikeText(null)).toBe(true);
    expect(isNullLikeText('null')).toBe(true);
    expect(isNullLikeText(' NULL ')).toBe(true);
    expect(isNullLikeText('undefined')).toBe(true);
  });

  it('ne confond pas les autres valeurs', () => {
    expect(isNullLikeText('')).toBe(false);
    expect(isNullLikeText('Nullam')).toBe(false);
    expect(isNullLikeText('Paris')).toBe(false);
    expect(isNullLikeText(0)).toBe(false);
  });
});

describe('stripSkillMarkdown', () => {
  it('retire le gras et l’emphase', () => {
    expect(stripSkillMarkdown('**TypeScript**')).toBe('TypeScript');
    expect(stripSkillMarkdown('__Node.js__')).toBe('Node.js');
    expect(stripSkillMarkdown('*React*')).toBe('React');
    expect(stripSkillMarkdown('**Node.js** (Express)')).toBe('Node.js (Express)');
  });

  it('nettoie une frame de streaming incomplète', () => {
    expect(stripSkillMarkdown('**Type')).toBe('Type');
  });

  it('laisse intacts les noms légitimes', () => {
    expect(stripSkillMarkdown('C#')).toBe('C#');
    expect(stripSkillMarkdown('C++')).toBe('C++');
    expect(stripSkillMarkdown('*nix')).toBe('*nix');
    expect(stripSkillMarkdown('  Go  ')).toBe('Go');
  });
});

describe('sanitizeExtractedCv', () => {
  it('supprime les champs optionnels null-like et vide les champs requis null-like', () => {
    const out = sanitizeExtractedCv(
      asCv({
        personalInfo: {
          firstName: 'A',
          lastName: 'B',
          title: 'T',
          email: 'null',
          phone: null,
          location: 'Paris',
        },
      }),
    );
    expect(out.personalInfo).toEqual({ firstName: 'A', lastName: 'B', title: 'T', location: 'Paris' });
    expect(out.personalInfo).not.toHaveProperty('email');
    expect(out.personalInfo).not.toHaveProperty('phone');

    const required = sanitizeExtractedCv(
      asCv({ personalInfo: { firstName: 'A', lastName: 'B', title: 'null' } }),
    );
    expect(required.personalInfo?.title).toBe('');
  });

  it('nettoie, filtre et dédoublonne les compétences', () => {
    const out = sanitizeExtractedCv(
      asCv({
        skills: {
          technologies: [
            skill('**TypeScript**', { starred: true }),
            skill('TypeScript'),
            skill('typescript'),
            skill('null'),
            skill(''),
            '**Go**',
          ],
          softSkills: [],
          expertises: [skill(null)],
          methodologies: [skill('*Scrum*')],
        },
        experiences: [
          {
            role: 'Dev',
            company: 'Acme',
            startDate: '2020',
            isCurrent: true,
            description: ['Tâche'],
            skills: ['**AWS**', '', 'null', 'aws'],
          },
        ],
      }),
    );
    const techs = out.skills?.technologies as unknown[];
    expect(techs).toHaveLength(2);
    expect(techs[0]).toEqual(skill('TypeScript', { starred: true }));
    expect(techs[1]).toBe('Go');
    expect(out.skills?.expertises).toEqual([]);
    expect(out.skills?.methodologies).toEqual([skill('Scrum')]);
    expect(out.experiences?.[0].skills).toEqual(['AWS']);
  });

  it('supprime les champs d’expérience optionnels null-like et les points forts null-like', () => {
    const out = sanitizeExtractedCv(
      asCv({
        experiences: [
          {
            role: 'null',
            company: 'Acme',
            companyDomain: 'null',
            location: null,
            startDate: '2020',
            endDate: 'null',
            isCurrent: false,
            description: ['Tâche', 'null'],
          },
        ],
        education: [{ degree: 'Master', school: 'null', year: null }],
        strengths: ['Rigueur', 'null', null],
      }),
    );
    const exp = out.experiences?.[0];
    expect(exp).not.toHaveProperty('endDate');
    expect(exp).not.toHaveProperty('companyDomain');
    expect(exp).not.toHaveProperty('location');
    expect(exp?.role).toBe('');
    expect(exp?.description).toEqual(['Tâche']);
    expect(out.education?.[0]).toEqual({ degree: 'Master', school: '', year: '' });
    expect(out.strengths).toEqual(['Rigueur']);
  });

  it('conserve le gras markdown du résumé', () => {
    const out = sanitizeExtractedCv(asCv({ summary: 'Expert **React** et **Node.js**.' }));
    expect(out.summary).toBe('Expert **React** et **Node.js**.');
    expect(sanitizeExtractedCv(asCv({ summary: 'null' })).summary).toBe('');
  });

  it('est idempotent, ne mute pas l’entrée et n’ajoute aucune clé', () => {
    const raw = {
      personalInfo: { firstName: 'A', lastName: 'B', title: 'T', phone: 'null' },
      skills: { technologies: [skill('**Go**'), skill('go')] },
      experiences: [{ role: 'Dev', company: 'X', startDate: '2020', isCurrent: true, description: [], skills: ['**AWS**'] }],
    };
    const snapshot = structuredClone(raw);
    const once = sanitizeExtractedCv(asCv(raw));
    expect(raw).toEqual(snapshot);
    expect(sanitizeExtractedCv(once)).toEqual(once);

    expect(sanitizeExtractedCv(asCv({}))).toEqual({});
    const partial = sanitizeExtractedCv(asCv({ personalInfo: { firstName: 'A' } }));
    expect(partial).toEqual({ personalInfo: { firstName: 'A' } });
  });

  it('renvoie une entrée non-objet telle quelle', () => {
    expect(sanitizeExtractedCv(null as unknown as Partial<ExtractedCV>)).toBeNull();
    expect(sanitizeExtractedCv('x' as unknown as Partial<ExtractedCV>)).toBe('x');
  });
});
