import { describe, expect, it } from 'vitest';
import {
  isValidSiren,
  normalizeCompanyName,
  normalizeSiren,
} from '@/lib/prospection/company-identity';

describe('normalizeCompanyName', () => {
  it('donne le même nom normalisé avec ou sans forme juridique pointée', () => {
    expect(normalizeCompanyName('ACME S.A.S.')).toBe('acme');
    expect(normalizeCompanyName('Acme')).toBe('acme');
    expect(normalizeCompanyName('ACME S.A.S.')).toBe(normalizeCompanyName('Acme'));
  });

  it('retire les accents, le suffixe légal et compacte les espaces', () => {
    expect(normalizeCompanyName('Société Générale SA')).toBe('societe generale');
  });

  it('remplace la ponctuation et les esperluettes par des espaces', () => {
    expect(normalizeCompanyName('  Dupont & Fils, SARL ')).toBe('dupont fils');
  });

  it('transforme les traits d’union en espaces', () => {
    expect(normalizeCompanyName('Saint-Gobain')).toBe('saint gobain');
  });

  it('retire la forme juridique européenne SE', () => {
    expect(normalizeCompanyName('Capgemini SE')).toBe('capgemini');
  });
});

describe('normalizeSiren', () => {
  it('retire les espaces et les points', () => {
    expect(normalizeSiren('552 100 554')).toBe('552100554');
    expect(normalizeSiren('552.100.554')).toBe('552100554');
  });

  it('renvoie undefined si la valeur n’est pas composée de 9 chiffres', () => {
    expect(normalizeSiren('12345')).toBeUndefined();
    expect(normalizeSiren(null)).toBeUndefined();
    expect(normalizeSiren(undefined)).toBeUndefined();
    expect(normalizeSiren('55210055A')).toBeUndefined();
  });
});

describe('isValidSiren', () => {
  it('accepte un SIREN dont la clé de Luhn est valide', () => {
    expect(isValidSiren('552100554')).toBe(true);
    expect(isValidSiren('732829320')).toBe(true);
  });

  it('refuse une clé de Luhn invalide', () => {
    expect(isValidSiren('552100555')).toBe(false);
  });

  it('refuse une longueur ou des caractères incorrects', () => {
    expect(isValidSiren('55210055')).toBe(false);
    expect(isValidSiren('abcdefghi')).toBe(false);
  });
});
