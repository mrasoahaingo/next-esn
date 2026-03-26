import {
  positioningAnalysisSchema,
  positioningOutputSchema,
  jobPostingAnalysisSchema,
} from '@/lib/schema';
import type {
  ExtractedCV,
  JobPostingAnalysis,
  PositioningAnalysis,
  PositioningExpertiseConfirmationItem,
} from '@/lib/schema';
import type { MatchingWeightsConfig } from '@/lib/config/matching-weights';
import { buildExperienceRecencyContextBlock } from '@/lib/utils/experience-recency';
import { prepareCvForMatchingPrompt } from '@/lib/utils/cv-experience-time';

export { positioningAnalysisSchema, positioningOutputSchema };
export type { MatchingWeightsConfig };

/** Clés réservées — injectées comme les Q/R `candidat:` / `client:` (prompts + snapshot score). */
export const POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY =
  'candidat:Contexte libre (recruteur)';
export const POSITIONING_ANALYSIS_FREEFORM_CLIENT_KEY =
  'client:Contexte libre (demande client)';

/** Reprend les questions / suggestions persistées (`generation_expertise_prompts`) avec ids stables `ec-i`. */
export function normalizeStoredExpertisePrompts(raw: unknown): PositioningExpertiseConfirmationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    const o = item as Record<string, unknown>;
    const suggested = Array.isArray(o.suggestedAnswers)
      ? o.suggestedAnswers.map((s) => String(s).trim()).filter((s) => s.length > 0)
      : [];
    return {
      id: typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `ec-${i}`,
      question: String(o.question ?? '').trim(),
      context: String(o.context ?? '').trim(),
      suggestedAnswers: suggested.length ? suggested : ['À préciser avec le candidat'],
    };
  });
}

const MISSION_BARÈME_USAGE_RULES_WITH_RAW = `## Règles d'usage du barème
- Pour les compétences, lacunes et questions : t'aligner sur **chaque point clé** (champ \`id\`) lorsque pertinent.
- Le **niveau d'expertise attendu** (bloc séparé s'il est fourni) **prime** sur les correspondances technologiques et sur la pondération par récence pour décider si le candidat a le bon **niveau** (séniorité, autonomie, périmètre).
- Le texte brut de la fiche de poste ci-après sert de **contexte complémentaire** au JSON.
`;

const MISSION_BARÈME_USAGE_RULES_STRUCTURED_ONLY = `## Règles d'usage du barème
- Le matching s'appuie **uniquement** sur le JSON du barème mission ci-dessus (points clés, niveau attendu, listes). **Ne pas** te baser sur un texte brut de fiche : il n'est pas fourni dans ce message.
- Pour les compétences, lacunes et questions : t'aligner sur **chaque point clé** (champ \`id\`) lorsque pertinent.
- Le **niveau d'expertise attendu** (bloc séparé s'il est fourni) **prime** sur les correspondances technologiques et sur la pondération par récence.
`;

export type PositioningPromptOptions = {
  /** Libellé poste / client affiché en référence quand le texte brut n'est pas joint au prompt */
  positionHeadline?: string;
  /** Poste en cours / années d’expérience : instant de référence (défaut : maintenant). Utile surtout pour les tests. */
  referenceDate?: Date;
};

export function buildMissionPositionHeadline(
  mission: { title?: string | null; company?: string | null } | null | undefined,
): string | undefined {
  if (!mission) return undefined;
  const parts = [mission.title, mission.company].filter(
    (s): s is string => typeof s === 'string' && s.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(' — ') : undefined;
}

/** Une entrée historique (réponse ou note) — les réponses s’ajoutent sans écraser les précédentes. */
export type PositioningRecruiterAnswerEntry = {
  id: string;
  text: string;
  createdAt: string;
};

/** Valeur en base : chaîne historique ou historique structuré. */
export type PositioningAnswerStoredValue = string | PositioningRecruiterAnswerEntry[];

function parseEntryArray(raw: unknown): PositioningRecruiterAnswerEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (!x || typeof x !== 'object') return null;
      const o = x as Record<string, unknown>;
      const text = String(o.text ?? '').trim();
      if (!text) return null;
      const id = typeof o.id === 'string' && o.id ? o.id : crypto.randomUUID();
      const createdAt =
        typeof o.createdAt === 'string' && o.createdAt ? o.createdAt : new Date().toISOString();
      return { id, text, createdAt };
    })
    .filter((x): x is PositioningRecruiterAnswerEntry => x != null);
}

export function parsePositioningAnswers(raw: unknown): Record<string, PositioningAnswerStoredValue> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, PositioningAnswerStoredValue> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k.startsWith('generationExpertise:')) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim();
      continue;
    }
    if (Array.isArray(v)) {
      const entries = parseEntryArray(v);
      if (entries.length) out[k] = entries;
    } else if (typeof v === 'string' && v.trim()) {
      out[k] = v.trim();
    }
  }
  return out;
}

/** Compat : même clé que `parsePositioningAnswers` mais les tableaux sont aplatis en texte pour les anciens appels. */
export function normalizePositioningAnswers(raw: unknown): Record<string, string> {
  const p = parsePositioningAnswers(raw);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    else if (Array.isArray(v) && v.length) {
      out[k] = v.map((e) => e.text.trim()).filter(Boolean).join('\n\n');
    }
  }
  return out;
}

/** Extrait les entrées phase analyse (candidat/client) depuis une carte parsée. */
export function extractRecruiterEntriesFromParsed(
  parsed: Record<string, PositioningAnswerStoredValue>,
): Record<string, PositioningRecruiterAnswerEntry[]> {
  const out: Record<string, PositioningRecruiterAnswerEntry[]> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (k.startsWith('generationExpertise:')) continue;
    if (!k.startsWith('candidat:') && !k.startsWith('client:')) continue;
    if (typeof v === 'string' && v.trim()) {
      out[k] = [
        {
          id: `legacy:${k}`,
          text: v.trim(),
          createdAt: new Date().toISOString(),
        },
      ];
    } else if (Array.isArray(v) && v.length) {
      out[k] = v.map((e) => ({ ...e, text: e.text.trim() })).filter((e) => e.text);
    }
  }
  return out;
}

/**
 * Retire une entrée du snapshot `analysis_recruiter_answers` (affiché dans Résultats).
 * Valeur legacy chaîne unique : id stable `legacy:<clé>`.
 * Retourne `null` si aucun changement (id introuvable ou snapshot vide).
 */
export function removeEntryFromAnalysisRecruiterSnapshot(
  rawSnapshot: unknown,
  key: string,
  entryId: string,
): Record<string, PositioningAnswerStoredValue> | null {
  if (rawSnapshot == null || typeof rawSnapshot !== 'object') return null;
  const parsed = parsePositioningAnswers(rawSnapshot);
  const phase = analysisPhaseAnswersOnly(parsed);
  const v = phase[key];
  if (v == null) return null;

  if (Array.isArray(v)) {
    const next = v.filter((e) => e.id !== entryId);
    if (next.length === v.length) return null;
    if (next.length === 0) {
      const rest = { ...phase };
      delete rest[key];
      return rest as Record<string, PositioningAnswerStoredValue>;
    }
    return { ...phase, [key]: next };
  }
  if (typeof v === 'string' && v.trim()) {
    if (entryId === `legacy:${key}`) {
      const rest = { ...phase };
      delete rest[key];
      return rest as Record<string, PositioningAnswerStoredValue>;
    }
    return null;
  }
  return null;
}

/** Exclut les réponses réservées à la phase génération (confirmations expertise). */
export function analysisPhaseAnswersOnly(
  answers: Record<string, PositioningAnswerStoredValue> | null | undefined,
): Record<string, PositioningAnswerStoredValue> {
  if (!answers) return {};
  const out: Record<string, PositioningAnswerStoredValue> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (k.startsWith('generationExpertise:')) continue;
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
    else if (Array.isArray(v) && v.length) {
      const filtered = v.filter((e) => e.text?.trim());
      if (filtered.length) out[k] = filtered;
    }
  }
  return out;
}

/** Compat comparaison snapshot / brouillon (chaîne stable par clé). */
export function flattenAnswerMapForCompare(
  answers: Record<string, PositioningAnswerStoredValue> | null | undefined,
): Record<string, string> {
  if (!answers) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (k.startsWith('generationExpertise:')) continue;
    if (typeof v === 'string') {
      if (v.trim()) out[k] = v.trim();
    } else if (Array.isArray(v)) {
      const parts = v.map((e) => e.text.trim()).filter(Boolean);
      if (parts.length) out[k] = parts.join('\u0001');
    }
  }
  return out;
}

/** True si les cartes Q/R phase analyse (clés `candidat:` / `client:` normalisées) diffèrent. */
export function analysisPhaseAnswerMapsDiffer(left: unknown, right: unknown): boolean {
  const L = flattenAnswerMapForCompare(analysisPhaseAnswersOnly(parsePositioningAnswers(left)));
  const R = flattenAnswerMapForCompare(analysisPhaseAnswersOnly(parsePositioningAnswers(right)));
  const keys = new Set([...Object.keys(L), ...Object.keys(R)]);
  for (const k of keys) {
    if ((L[k] ?? '').trim() !== (R[k] ?? '').trim()) return true;
  }
  return false;
}

/**
 * True si une réponse de l’affinage (questions affichées pour l’analyse courante) diffère du snapshot
 * du dernier score pour ces mêmes clés. Ignore les entrées du snapshot qui ne correspondent plus à une
 * question actuelle (ex. libellés de questions régénérés par le LLM après relance).
 */
export function analysisPhaseAffinageDiffersFromSnapshotForCurrentQuestions(params: {
  /** Snapshot brut (ex. colonne `analysis_recruiter_answers`) ou déjà parsé. */
  snapshot: Record<string, PositioningAnswerStoredValue> | null | undefined;
  mergedPhaseAnswers: Record<string, PositioningAnswerStoredValue>;
  analysis: Partial<PositioningAnalysis> | null;
}): boolean {
  const { snapshot, mergedPhaseAnswers, analysis } = params;
  if (snapshot == null || typeof snapshot !== 'object') return false;
  const snap = flattenAnswerMapForCompare(
    analysisPhaseAnswersOnly(parsePositioningAnswers(snapshot)),
  );
  const merged = flattenAnswerMapForCompare(analysisPhaseAnswersOnly(mergedPhaseAnswers));

  const keys: string[] = [];
  for (const q of analysis?.candidateQuestions ?? []) {
    keys.push(`candidat:${q.question}`);
  }
  for (const q of analysis?.clientQuestions ?? []) {
    keys.push(`client:${q.question}`);
  }
  keys.push(POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY);
  keys.push(POSITIONING_ANALYSIS_FREEFORM_CLIENT_KEY);

  for (const k of keys) {
    if ((snap[k] ?? '').trim() !== (merged[k] ?? '').trim()) return true;
  }
  return false;
}

/** Fusion pour persister `positionings.answers` (historique recruteur + confirmations génération). */
export function mergePositioningAnswersForPersistence(params: {
  baseAnswers: Record<string, PositioningAnswerStoredValue>;
  recruiterAnswerEntries: Record<string, PositioningRecruiterAnswerEntry[]>;
  generationExpertiseResponses: Record<string, string>;
}): Record<string, PositioningAnswerStoredValue> {
  const { baseAnswers, recruiterAnswerEntries, generationExpertiseResponses } = params;
  const next: Record<string, PositioningAnswerStoredValue> = {};

  for (const [k, v] of Object.entries(baseAnswers)) {
    if (
      k.startsWith('candidat:') ||
      k.startsWith('client:') ||
      k.startsWith('generationExpertise:')
    ) {
      continue;
    }
    if (typeof v === 'string' && v.trim()) next[k] = v.trim();
  }

  const recruiterKeys = new Set<string>([
    ...Object.keys(recruiterAnswerEntries),
    ...Object.keys(baseAnswers).filter(
      (k) =>
        (k.startsWith('candidat:') || k.startsWith('client:')) && !k.startsWith('generationExpertise:'),
    ),
  ]);

  for (const k of recruiterKeys) {
    if (Object.prototype.hasOwnProperty.call(recruiterAnswerEntries, k)) {
      const arr = recruiterAnswerEntries[k];
      if (arr && arr.length > 0) next[k] = arr.map((e) => ({ ...e }));
      continue;
    }
    const fb = baseAnswers[k];
    if (typeof fb === 'string' && fb.trim()) next[k] = fb.trim();
    else if (Array.isArray(fb) && fb.length) next[k] = fb.map((e) => ({ ...e }));
  }

  for (const [id, text] of Object.entries(generationExpertiseResponses)) {
    if (text.trim()) next[`generationExpertise:${id}`] = text.trim();
  }
  return next;
}

function formatEntryDateShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

/** Lignes Q/R pour les prompts (clés `candidat:` / `client:` / autres hors génération). */
export function formatPositioningAnswerLines(
  answers: Record<string, PositioningAnswerStoredValue> | null | undefined,
): string {
  const phase = analysisPhaseAnswersOnly(answers ?? {});
  const entries = Object.entries(phase).filter(([, v]) => {
    if (typeof v === 'string') return v.trim().length > 0;
    if (Array.isArray(v)) return v.some((e) => e.text?.trim());
    return false;
  });
  if (!entries.length) return '';
  return entries
    .map(([k, v]) => {
      const label = k.startsWith('candidat:')
        ? 'Candidat'
        : k.startsWith('client:')
          ? 'Client'
          : 'Info';
      const q = k.replace(/^(candidat:|client:)/, '');
      if (typeof v === 'string') {
        return `[${label}] Q: ${q}\nR: ${v}`;
      }
      const lines = v
        .filter((e) => e.text?.trim())
        .map((e, i) => {
          const when = e.createdAt ? ` — ${formatEntryDateShort(e.createdAt)}` : '';
          return `[${label}] Q: ${q}\nR (${i + 1}${when}): ${e.text.trim()}`;
        });
      return lines.join('\n\n');
    })
    .join('\n\n');
}

/** Fusion POST analyze : incoming remplace clé par clé (corps JSON). */
export function mergeIncomingPositioningAnswers(
  existing: Record<string, PositioningAnswerStoredValue>,
  incoming: Record<string, PositioningAnswerStoredValue>,
): Record<string, PositioningAnswerStoredValue> {
  return { ...existing, ...incoming };
}

/** Bloc : confirmations expertise saisies par le recruteur (ids `ec-0`, …). */
export function buildGenerationExpertiseRecruiterBlock(
  prompts: PositioningExpertiseConfirmationItem[] | null | undefined,
  answers: Record<string, PositioningAnswerStoredValue>,
): string {
  if (!prompts?.length) return '';
  const parts: string[] = [];
  for (const p of prompts) {
    const id = p.id ?? '';
    if (!id) continue;
    const key = `generationExpertise:${id}`;
    const raw = answers[key];
    const r = typeof raw === 'string' ? raw.trim() : '';
    if (!r) continue;
    parts.push(`Q: ${p.question}\nR: ${r}`);
  }
  if (!parts.length) return '';
  return `\n\n## Confirmations d’expertise (saisies par le recruteur — source prioritaire pour ajuster niveau et compétences dans les livrables)\n\n${parts.join('\n\n')}\n`;
}

/** Bloc utilisateur : réponses phase analyse uniquement (pas les confirmations génération). */
export function buildPriorAnswersPromptBlock(
  answers: Record<string, PositioningAnswerStoredValue> | null | undefined,
): string {
  const lines = formatPositioningAnswerLines(answers);
  if (!lines) return '';
  return `\n\n## Réponses déjà fournies (à traiter comme faits établis pour le matching, les lacunes et le score — ne pas les ignorer)\n\n${lines}\n`;
}

/**
 * True si l'analyse mission en base suffit pour matcher **sans** envoyer le texte brut de la fiche au LLM.
 */
export function hasUsableJobAnalysisForPositioning(raw: unknown): boolean {
  if (raw == null || typeof raw !== 'object') return false;
  const parsed = jobPostingAnalysisSchema.safeParse(raw);
  const j: Partial<JobPostingAnalysis> = parsed.success ? parsed.data : (raw as JobPostingAnalysis);
  if ((j.keyPoints?.length ?? 0) > 0) return true;
  if (j.expectedExpertiseLevel != null && typeof j.expectedExpertiseLevel === 'object') return true;
  return false;
}

function missionRulesBlock(structuredOnly: boolean): string {
  return structuredOnly ? MISSION_BARÈME_USAGE_RULES_STRUCTURED_ONLY : MISSION_BARÈME_USAGE_RULES_WITH_RAW;
}

/**
 * Préfixe mission pour les prompts d'analyse / génération de positionnement : niveau attendu d'abord, puis barème.
 */
export function buildMissionAnalysisPromptPrefix(
  jobAnalysis: JobPostingAnalysis | null | undefined,
  structuredOnly: boolean,
): string {
  if (!jobAnalysis) return '';

  const parts: string[] = [];

  if (jobAnalysis.expectedExpertiseLevel) {
    parts.push(
      `## Niveau d'expertise attendu (PRIORITÉ ABSOLUE — prime sur les technos et la récence)\n\n${JSON.stringify(jobAnalysis.expectedExpertiseLevel, null, 2)}`,
    );
  }

  const rubricPayload = {
    executiveSummary: jobAnalysis.executiveSummary,
    keyPoints: jobAnalysis.keyPoints ?? [],
    cvSearchKeywords: jobAnalysis.cvSearchKeywords,
    openQuestions: jobAnalysis.openQuestions,
    redFlags: jobAnalysis.redFlags,
  };

  parts.push(
    `## Barème mission (synthèse exécutive, points clés, listes)\n\n${JSON.stringify(rubricPayload, null, 2)}`,
  );

  return `${parts.join('\n\n')}\n\n${missionRulesBlock(structuredOnly)}\n\n`;
}

export function buildAnalysisUserContent(
  cv: ExtractedCV,
  jobDescription: string,
  jobAnalysis?: JobPostingAnalysis | null,
  matchingWeights?: MatchingWeightsConfig | null,
  options?: PositioningPromptOptions,
  priorAnswers?: Record<string, PositioningAnswerStoredValue> | null,
): string {
  const referenceDate = options?.referenceDate ?? new Date();
  const cvPrepared = prepareCvForMatchingPrompt(cv, referenceDate);
  const structuredOnly = hasUsableJobAnalysisForPositioning(jobAnalysis ?? null);
  const preamble = buildMissionAnalysisPromptPrefix(jobAnalysis ?? null, structuredOnly);
  const recencyBlock = buildExperienceRecencyContextBlock(cvPrepared, matchingWeights, referenceDate);

  const cvBlock = `${recencyBlock}Voici le CV du candidat :\n\n${JSON.stringify(cvPrepared, null, 2)}\n\n`;
  const answersBlock = buildPriorAnswersPromptBlock(priorAnswers ?? null);

  if (structuredOnly) {
    const ref = options?.positionHeadline?.trim() || 'Mission liée (titre non renseigné)';
    return `${preamble}${cvBlock}## Référence poste\n${ref}\n${answersBlock}`;
  }

  return `${preamble}${cvBlock}Voici la fiche de poste (texte brut) :\n\n${jobDescription}${answersBlock}`;
}

export function buildPositioningSynthesisUserContent(
  cv: ExtractedCV,
  jobDescription: string,
  mergedAnalysis: Partial<PositioningAnalysis>,
  jobAnalysis?: JobPostingAnalysis | null,
  matchingWeights?: MatchingWeightsConfig | null,
  options?: PositioningPromptOptions,
  priorAnswers?: Record<string, PositioningAnswerStoredValue> | null,
): string {
  return `${buildAnalysisUserContent(cv, jobDescription, jobAnalysis, matchingWeights, options, priorAnswers)}

---

Voici l'analyse détaillée déjà produite (à synthétiser en score + résumé + confiance, cohérents avec le barème mission si fourni) :

${JSON.stringify(mergedAnalysis, null, 2)}`;
}

export function buildGenerateUserContent(
  cv: ExtractedCV,
  jobDescription: string,
  analysis: PositioningAnalysis,
  answers: Record<string, PositioningAnswerStoredValue>,
  jobAnalysis?: JobPostingAnalysis | null,
  matchingWeights?: MatchingWeightsConfig | null,
  options?: PositioningPromptOptions,
  generationExpertisePrompts?: PositioningExpertiseConfirmationItem[] | null,
): string {
  const analysisAnswerLines = formatPositioningAnswerLines(answers);
  const expertiseRecruiterBlock = buildGenerationExpertiseRecruiterBlock(
    generationExpertisePrompts ?? null,
    answers,
  );

  const referenceDate = options?.referenceDate ?? new Date();
  const cvPrepared = prepareCvForMatchingPrompt(cv, referenceDate);
  const structuredOnly = hasUsableJobAnalysisForPositioning(jobAnalysis ?? null);
  const preamble = buildMissionAnalysisPromptPrefix(jobAnalysis ?? null, structuredOnly);
  const recencyBlock = buildExperienceRecencyContextBlock(cvPrepared, matchingWeights, referenceDate);
  const cvBlock = `${recencyBlock}Voici le CV du candidat :\n\n${JSON.stringify(cvPrepared, null, 2)}\n\n`;

  const jobTail = structuredOnly
    ? `## Référence poste\n${options?.positionHeadline?.trim() || 'Mission liée (titre non renseigné)'}\n\n`
    : `Voici la fiche de poste (texte brut) :\n\n${jobDescription}\n\n`;

  const analysisAnswersSection = analysisAnswerLines
    ? `\n\nVoici les réponses aux questions (phase analyse — contexte ; le recruteur complète les confirmations expertise à part) :\n\n${analysisAnswerLines}`
    : '';

  return `${preamble}${cvBlock}${jobTail}Voici l'analyse de matching :\n\n${JSON.stringify(analysis, null, 2)}${analysisAnswersSection}${expertiseRecruiterBlock}`;
}

export function buildAnalysisMessages(
  cv: ExtractedCV,
  jobDescription: string,
  jobAnalysis?: JobPostingAnalysis | null,
  matchingWeights?: MatchingWeightsConfig | null,
  options?: PositioningPromptOptions,
  priorAnswers?: Record<string, PositioningAnswerStoredValue> | null,
) {
  return [
    {
      role: 'user' as const,
      content: buildAnalysisUserContent(
        cv,
        jobDescription,
        jobAnalysis,
        matchingWeights,
        options,
        priorAnswers,
      ),
    },
  ];
}

export function buildGenerateMessages(
  cv: ExtractedCV,
  jobDescription: string,
  analysis: PositioningAnalysis,
  answers: Record<string, PositioningAnswerStoredValue>,
  jobAnalysis?: JobPostingAnalysis | null,
  matchingWeights?: MatchingWeightsConfig | null,
  options?: PositioningPromptOptions,
  generationExpertisePrompts?: PositioningExpertiseConfirmationItem[] | null,
) {
  return [
    {
      role: 'user' as const,
      content: buildGenerateUserContent(
        cv,
        jobDescription,
        analysis,
        answers,
        jobAnalysis,
        matchingWeights,
        options,
        generationExpertisePrompts,
      ),
    },
  ];
}
