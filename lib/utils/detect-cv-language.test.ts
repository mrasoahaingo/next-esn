import { describe, it, expect } from 'vitest';
import { detectCvLanguage } from './detect-cv-language';

describe('detectCvLanguage', () => {
  it('returns fr for empty string (safe default)', () => {
    expect(detectCvLanguage('')).toBe('fr');
  });

  it('returns fr for French CV text', () => {
    expect(detectCvLanguage('Bonjour, voici mon expérience professionnelle')).toBe('fr');
  });

  it('returns en for English CV text', () => {
    expect(detectCvLanguage('Hello, here is my professional experience')).toBe('en');
  });

  it('returns fr for text with mostly French CV words', () => {
    const frenchText =
      'Développeur senior avec 10 ans d\'expérience. Formation en informatique. Compétences : gestion de projet, équipe, entreprise. Stage chez une grande entreprise française. Diplôme ingénieur niveau master. Responsable technique dans une équipe de 8 personnes.';
    expect(detectCvLanguage(frenchText)).toBe('fr');
  });

  it('returns en for text with mostly English CV words', () => {
    const englishText =
      'Senior developer with 10 years of experience. Education in computer science. Skills: project management, team, company. Internship at a large company. Degree in engineering level master. Manager responsible for a team of 8 people.';
    expect(detectCvLanguage(englishText)).toBe('en');
  });

  it('returns fr when FR score slightly exceeds scaled EN score', () => {
    // Text with 6 FR keyword hits and only 3 EN keyword hits
    // EN score: experience=1, skills=1, with=1 = 3 total
    // FR score: expérience=1, formation=1, compétences=1, équipe=1, poste=1, diplôme=1 = 6 total
    // 3 > 6 * 1.2 = 7.2 → false → fr
    const text =
      'Mon expérience inclut une solide formation. Mes compétences couvrent la gestion d\'équipe. J\'ai occupé un poste de chef avec un diplôme en informatique.';
    expect(detectCvLanguage(text)).toBe('fr');
  });

  it('returns en for clearly English CV with common English words', () => {
    const englishCv =
      'Senior Software Engineer with extensive experience in the field. Education at MIT. Skills include project management and team leadership. Responsible for developer team. Degree in computer science. Position as manager with the company.';
    expect(detectCvLanguage(englishCv)).toBe('en');
  });

  it('returns fr for clearly French CV', () => {
    const frenchCv =
      'Ingénieur logiciel senior avec une longue expérience dans le domaine. Formation à Paris. Compétences en gestion de projet et management d\'équipe. Responsable d\'une équipe de développeurs. Diplôme d\'ingénieur. Poste de chef de projet dans notre entreprise.';
    expect(detectCvLanguage(frenchCv)).toBe('fr');
  });
});
