import { describe, it, expect } from 'vitest';
import { collectCandidateStorageObjects, storagePathFromUrl } from './candidate-storage';

const BASE = 'https://abc.supabase.co/storage/v1/object/public';
const ORG = 'org_123';

describe('storagePathFromUrl', () => {
  it('extrait le chemin après le bucket (URL publique)', () => {
    expect(storagePathFromUrl(`${BASE}/cv-original/${ORG}/1700_CV_Camille.pdf`, 'cv-original')).toBe(
      `${ORG}/1700_CV_Camille.pdf`,
    );
  });

  it('ignore la chaîne de requête d’une URL signée', () => {
    expect(
      storagePathFromUrl(
        'https://abc.supabase.co/storage/v1/object/sign/cv-original/org_123/a.pdf?token=xyz',
        'cv-original',
      ),
    ).toBe('org_123/a.pdf');
  });

  it('décode les caractères encodés', () => {
    expect(storagePathFromUrl(`${BASE}/cv-formatted/${ORG}/CV%20Camille.pdf`, 'cv-formatted')).toBe(
      `${ORG}/CV Camille.pdf`,
    );
  });

  it('renvoie undefined pour une URL vide ou un autre bucket', () => {
    expect(storagePathFromUrl(null, 'cv-original')).toBeUndefined();
    expect(storagePathFromUrl('', 'cv-original')).toBeUndefined();
    expect(storagePathFromUrl(`${BASE}/cv-formatted/${ORG}/a.pdf`, 'cv-original')).toBeUndefined();
  });
});

describe('collectCandidateStorageObjects', () => {
  it('retient le PDF d’origine, le CV mis en forme et chaque CV adapté exporté', () => {
    expect(
      collectCandidateStorageObjects({
        orgId: ORG,
        candidate: {
          original_file_url: `${BASE}/cv-original/${ORG}/1_cv.pdf`,
          formatted_file_url: `${BASE}/cv-formatted/${ORG}/esneo_Durand_2.pdf`,
        },
        positionings: [
          { tailored_file_url: `${BASE}/cv-formatted/${ORG}/esneo_Durand_positioning_3.pdf` },
          { tailored_file_url: null },
        ],
      }),
    ).toEqual({
      'cv-original': [`${ORG}/1_cv.pdf`],
      'cv-formatted': [`${ORG}/esneo_Durand_2.pdf`, `${ORG}/esneo_Durand_positioning_3.pdf`],
    });
  });

  it('dédoublonne un même fichier référencé deux fois', () => {
    const url = `${BASE}/cv-formatted/${ORG}/same.pdf`;
    expect(
      collectCandidateStorageObjects({
        orgId: ORG,
        candidate: { formatted_file_url: url },
        positionings: [{ tailored_file_url: url }],
      })['cv-formatted'],
    ).toEqual([`${ORG}/same.pdf`]);
  });

  it('écarte tout chemin hors du dossier de l’organisation', () => {
    expect(
      collectCandidateStorageObjects({
        orgId: ORG,
        candidate: {
          original_file_url: `${BASE}/cv-original/org_autre/1_cv.pdf`,
          formatted_file_url: `${BASE}/cv-formatted/${ORG}/../org_autre/x.pdf`,
        },
        positionings: [{ tailored_file_url: `${BASE}/cv-formatted/legacy.pdf` }],
      }),
    ).toEqual({ 'cv-original': [], 'cv-formatted': [] });
  });

  it('renvoie des listes vides sans aucune URL', () => {
    expect(collectCandidateStorageObjects({ orgId: ORG, candidate: {} })).toEqual({
      'cv-original': [],
      'cv-formatted': [],
    });
  });
});
