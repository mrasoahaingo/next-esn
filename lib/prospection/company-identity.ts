// ─── Identité entreprise (SIG-04) ──────────────────────────────────────────
// Normalisation reprise de l'ancien domaine radar (commit 7ecd35e^), corrigée :
// les points sont supprimés AVANT le retrait des formes juridiques, pour que
// « S.A.S. » devienne « sas » puis disparaisse.
//
// Règle de rapprochement : on ne fusionne jamais sur le nom une entreprise dont
// le SIREN est connu — la contrainte DB `(org_id, siren)` prime. Le nom normalisé
// ne sert qu'à dédoublonner les entreprises encore non résolues (siren NULL).

const LEGAL_SUFFIXES =
  /\b(sas|sarl|sa|srl|sasu|eurl|sci|snc|sca|se|scp|gie|gip|ep|spa|nv|bv|gmbh|ag|ltd|llc|inc|corp|plc)\b/gi;

/**
 * Nom d'entreprise comparable : minuscules, sans accents, sans forme juridique,
 * ponctuation remplacée par des espaces, espaces compactés.
 * Ex. « ACME S.A.S. » et « Acme » → « acme ».
 */
export function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\./g, '')
    .replace(LEGAL_SUFFIXES, '')
    .replace(/[,\-&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Retire espaces et points (« 552 100 554 ») ; renvoie undefined si le résultat n'est pas 9 chiffres. */
export function normalizeSiren(raw: string | null | undefined): string | undefined {
  const digits = (raw ?? '').replace(/[\s.]/g, '');
  return /^[0-9]{9}$/.test(digits) ? digits : undefined;
}

/** SIREN valide = 9 chiffres dont la clé de Luhn est correcte. */
export function isValidSiren(siren: string): boolean {
  if (!/^[0-9]{9}$/.test(siren)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    let digit = Number(siren[8 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}
