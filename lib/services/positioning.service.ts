import {
  positioningAnalysisSchema,
  positioningOutputSchema,
  jobPostingAnalysisSchema,
} from '@/lib/schema';
import type { ExtractedCV, JobPostingAnalysis, PositioningAnalysis } from '@/lib/schema';
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
    if (k.startsWith('generationExpertise:')) continue;
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

/** Exclut les clés réservées obsolètes (`generationExpertise:*` — plus persistées). */
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

/** Fusion pour persister `positionings.answers` (historique recruteur). */
export function mergePositioningAnswersForPersistence(params: {
  baseAnswers: Record<string, PositioningAnswerStoredValue>;
  recruiterAnswerEntries: Record<string, PositioningRecruiterAnswerEntry[]>;
}): Record<string, PositioningAnswerStoredValue> {
  const { baseAnswers, recruiterAnswerEntries } = params;
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

/** Bloc utilisateur : réponses phase analyse / affinage. */
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

/** Fenêtre temporelle pour le verdict final (synthèse) : cohérent avec l’objectif « focus récent ». */
const SYNTHESIS_VERDICT_RECENCY_YEARS = 5;

/** Nombre d’expériences les plus récentes qui font foi pour le niveau (Lead / Senior / Expert, etc.). */
const SYNTHESIS_LEVEL_EVIDENCE_EXPERIENCE_COUNT = 2;

function buildSynthesisVerdictInstructionsBlock(referenceDate: Date): string {
  const d = referenceDate.toISOString().slice(0, 10);
  return `## Verdict final (synthèse uniquement)

Pour **matchScore**, **matchSummary**, **matchScoreConfidence** et **matchScoreConfidenceNote** : base ton jugement **uniquement** sur ce qui relève du parcours professionnel du candidat sur les **${SYNTHESIS_VERDICT_RECENCY_YEARS} dernières années** par rapport à la date de référence **${d}** (UTC).

- Priorise les expériences et compétences **démontrées ou encore actives** dans cette fenêtre.
- N’utilise pas le parcours plus ancien pour **hausser ou baisser** le score ni pour le niveau de confiance (tu peux y faire **allusion** en au plus une phrase dans **matchSummary** si le contexte l’exige, sans qu’il influe sur le score).
- Si le CV ne permet pas d’évaluer la pertinence sur ces ${SYNTHESIS_VERDICT_RECENCY_YEARS} ans, réduis la confiance et explique-le dans **matchScoreConfidenceNote**.

### Niveau attendu (Lead, Senior, Expert, confirmé, etc.)

Pour décider si le candidat **tient le niveau** du poste (séniorité, autonomie, rôle), ne t’appuie **pas** sur le parcours au-delà des **${SYNTHESIS_LEVEL_EVIDENCE_EXPERIENCE_COUNT} expériences les plus récentes** du JSON CV : \`experiences[0]\` et \`experiences[1]\` (convention : **0 = la plus récente**). Si une seule expérience existe, elle suffit.

- **\`experiences[0]\` définit techniquement le niveau actuel** du candidat (poste en cours ou dernier poste) : c’est la **référence principale** pour le verdict sur la séniorité.
- **\`experiences[1]\`** (si présente) **corrobore** : elle confirme la cohérence du niveau sur le poste précédent ; elle ne doit **pas** être traitée comme un second critère équivalent qui « conteste » le niveau lu sur \`experiences[0]\` sans bonne raison (ex. rupture de carrière explicite dans le CV).
- Si \`experiences[0]\` (éventuellement soutenue par \`experiences[1]\`) montre un niveau **aligné** avec le besoin, **ne fais pas** baisser **matchScoreConfidence** au **motif principal** d’**ambiguïté ou de contradiction** dans la fiche de poste ou le barème (ex. « première expérience » vs « profil confirmé »).
- Tu peux **mentionner** l’ambiguïté textuelle en **une phrase** dans **matchSummary** ou en **complément** dans **matchScoreConfidenceNote**, sans en faire la **cause principale** d’une confiance \`medium\` ou \`low\` : la confiance suit surtout le **niveau démontré sur le poste actuel** (\`experiences[0]\`) vs le besoin.

`;
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
  const referenceDate = options?.referenceDate ?? new Date();
  const verdictInstructions = buildSynthesisVerdictInstructionsBlock(referenceDate);

  return `${buildAnalysisUserContent(cv, jobDescription, jobAnalysis, matchingWeights, options, priorAnswers)}

---

${verdictInstructions}Voici l'analyse détaillée déjà produite (à synthétiser en score + résumé + confiance, cohérents avec le barème mission si fourni ; le verdict final doit respecter les règles ci-dessus) :

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
): string {
  const analysisAnswerLines = formatPositioningAnswerLines(answers);

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
    ? `\n\nVoici les réponses du recruteur (phase analyse / affinage) :\n\n${analysisAnswerLines}`
    : '';

  return `${preamble}${cvBlock}${jobTail}Voici l'analyse de matching :\n\n${JSON.stringify(analysis, null, 2)}${analysisAnswersSection}`;
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
      ),
    },
  ];
}
