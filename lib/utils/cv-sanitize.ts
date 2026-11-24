import type { ExtractedCV } from '@/lib/schema';

/**
 * Normalisation déterministe d'un CV produit par le LLM.
 *
 * Depuis le passage à `openai/gpt-6-luna` avec `strictJsonSchema: false` (voir `lib/ai.ts`), le
 * modèle n'est plus contraint par le schéma JSON : pour un champ optionnel absent il peut émettre
 * `null` (JSON) ou la chaîne `"null"`, et il recopie le gras markdown du résumé (`**…**`) dans les
 * noms de compétences. Ces valeurs finissaient en base, dans l'éditeur et dans le PDF.
 *
 * Fonctions pures, sans mutation de l'entrée ; tolérantes aux frames partielles de streaming
 * (clés absentes, tableaux incomplets) : elles n'ajoutent jamais une clé absente.
 */

type UnknownRecord = Record<string, unknown>;

const NULL_LIKE_STRINGS = new Set(['null', 'undefined']);

const PERSONAL_INFO_OPTIONAL_KEYS = [
  'email',
  'phone',
  'location',
  'yearsOfExperience',
  'availability',
  'inferredSeniorityBand',
  'seniorityInferenceNote',
] as const;
const PERSONAL_INFO_REQUIRED_KEYS = ['firstName', 'lastName', 'title'] as const;

const EXPERIENCE_OPTIONAL_KEYS = ['companyDomain', 'location', 'endDate', 'spacingAfter'] as const;
const EXPERIENCE_REQUIRED_KEYS = ['role', 'company', 'startDate'] as const;

const EDUCATION_OPTIONAL_KEYS = ['spacingAfter'] as const;
const EDUCATION_REQUIRED_KEYS = ['degree', 'school', 'year'] as const;

const SKILL_CATEGORIES = ['technologies', 'softSkills', 'expertises', 'methodologies'] as const;

/** Paire d'emphase (`*…*`, `_…_`, `` `…` ``) qui encadre toute la chaîne. */
const WRAPPING_EMPHASIS = /^([*_`])(.+)\1$/;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `null`, ou chaîne dont le contenu est littéralement « null » / « undefined » (casse et espaces ignorés). */
export function isNullLikeText(value: unknown): boolean {
  if (value === null) return true;
  if (typeof value !== 'string') return false;
  return NULL_LIKE_STRINGS.has(value.trim().toLowerCase());
}

/**
 * Nom de compétence en texte brut : retire `**` / `__` (y compris non refermés, frames de streaming)
 * puis une paire d'emphase encadrant toute la chaîne. Un `*` isolé (`*nix`) et `C#` / `C++` restent.
 */
export function stripSkillMarkdown(name: string): string {
  let out = name.replace(/\*\*|__/g, '').trim();
  const wrapped = WRAPPING_EMPHASIS.exec(out);
  if (wrapped) out = wrapped[2];
  return out.trim();
}

/** Clés optionnelles null-like → supprimées ; clés requises null-like → chaîne vide. */
function cleanFields(
  obj: UnknownRecord,
  optionalKeys: readonly string[],
  requiredKeys: readonly string[],
): void {
  for (const key of optionalKeys) {
    if (key in obj && isNullLikeText(obj[key])) delete obj[key];
  }
  for (const key of requiredKeys) {
    if (key in obj && isNullLikeText(obj[key])) obj[key] = '';
  }
}

/** Retire les entrées null-like d'un tableau de chaînes (points forts, puces de description). */
function withoutNullLike(values: unknown[]): unknown[] {
  return values.filter((v) => !isNullLikeText(v));
}

/** Nettoie et dédoublonne (insensible à la casse, première occurrence gardée) une liste de compétences. */
function cleanSkillList(values: unknown[]): unknown[] {
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const item of values) {
    let entry: unknown = item;
    let name: string | undefined;
    if (typeof item === 'string') {
      name = stripSkillMarkdown(item);
      entry = name;
    } else if (isRecord(item)) {
      if (isNullLikeText(item.name)) continue;
      if (typeof item.name === 'string') {
        name = stripSkillMarkdown(item.name);
        entry = { ...item, name };
      }
    } else if (isNullLikeText(item)) {
      continue;
    }

    if (name !== undefined) {
      if (!name || isNullLikeText(name)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(entry);
  }
  return out;
}

function sanitizeExperience(exp: unknown): unknown {
  if (!isRecord(exp)) return exp;
  cleanFields(exp, EXPERIENCE_OPTIONAL_KEYS, EXPERIENCE_REQUIRED_KEYS);
  if (Array.isArray(exp.description)) exp.description = withoutNullLike(exp.description);
  if (Array.isArray(exp.skills)) exp.skills = cleanSkillList(exp.skills);
  else if ('skills' in exp && exp.skills === null) delete exp.skills;
  return exp;
}

function sanitizeEducation(edu: unknown): unknown {
  if (!isRecord(edu)) return edu;
  cleanFields(edu, EDUCATION_OPTIONAL_KEYS, EDUCATION_REQUIRED_KEYS);
  return edu;
}

/**
 * Copie normalisée d'un CV : valeurs null-like retirées (optionnelles) ou vidées (requises),
 * markdown retiré des noms de compétences (`skills.*`, `experiences[].skills`) avec dédoublonnage.
 * Le gras markdown du `summary` est conservé (il est légitime et rendu en gras dans le PDF).
 * Idempotent. Une entrée non-objet est renvoyée telle quelle.
 */
export function sanitizeExtractedCv<T extends Partial<ExtractedCV>>(cv: T): T {
  if (!isRecord(cv)) return cv;
  const out = structuredClone(cv) as UnknownRecord;

  if ('language' in out && isNullLikeText(out.language)) delete out.language;

  if ('personalInfo' in out) {
    if (out.personalInfo === null) delete out.personalInfo;
    else if (isRecord(out.personalInfo)) {
      cleanFields(out.personalInfo, PERSONAL_INFO_OPTIONAL_KEYS, PERSONAL_INFO_REQUIRED_KEYS);
    }
  }

  if ('summary' in out && isNullLikeText(out.summary)) out.summary = '';

  if (Array.isArray(out.experiences)) out.experiences = out.experiences.map(sanitizeExperience);
  if (Array.isArray(out.education)) out.education = out.education.map(sanitizeEducation);

  if (isRecord(out.skills)) {
    const skills = out.skills;
    for (const category of SKILL_CATEGORIES) {
      if (Array.isArray(skills[category])) skills[category] = cleanSkillList(skills[category]);
    }
  }

  if (Array.isArray(out.strengths)) out.strengths = withoutNullLike(out.strengths);
  else if ('strengths' in out && out.strengths === null) delete out.strengths;

  if ('sectionSpacing' in out && out.sectionSpacing === null) delete out.sectionSpacing;

  return out as T;
}
