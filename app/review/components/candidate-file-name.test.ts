import { describe, expect, it } from 'vitest';
import { candidateFileName, candidateNameFromFile } from './candidate-file-name';

describe('candidateFileName', () => {
  it('garde le dernier segment sans le préfixe horodaté', () => {
    expect(candidateFileName('https://x.supabase.co/storage/v1/cvs/org/1712345678_CV_Camille_Durand.pdf')).toBe(
      'CV_Camille_Durand.pdf',
    );
  });

  it('décode les caractères encodés et ignore la query string', () => {
    expect(candidateFileName('/bucket/1712_CV%20Camille.docx?token=abc')).toBe('CV Camille.docx');
  });

  it('renvoie null sans URL ou sans nom', () => {
    expect(candidateFileName(null)).toBeNull();
    expect(candidateFileName(undefined)).toBeNull();
    expect(candidateFileName('')).toBeNull();
    expect(candidateFileName('/bucket/')).toBeNull();
  });

  it('tolère un segment mal encodé', () => {
    expect(candidateFileName('/bucket/100%_cv.pdf')).toBe('100%_cv.pdf');
  });
});

describe('candidateNameFromFile', () => {
  it('retire l’extension et remplace les tirets bas', () => {
    expect(candidateNameFromFile('/cvs/1712345678_CV_Camille_Durand.pdf')).toBe('CV Camille Durand');
  });

  it('renvoie null quand rien ne reste', () => {
    expect(candidateNameFromFile('/cvs/123_.pdf')).toBeNull();
    expect(candidateNameFromFile(null)).toBeNull();
  });
});
