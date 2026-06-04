import { z } from 'zod';
import { normalizeSkillKey } from '@/lib/utils/skill-key';

// ─── Template config ─────────────────────────────────────────────

/** Gabarit PDF unique ; les couleurs / logo viennent du `TemplateConfig`. */
export const templateThemeIdSchema = z.literal('classic');

export const templateBlockTypeSchema = z.enum([
  'profile-info',
  'summary',
  'skills',
  'education',
  'experiences',
]);

export const templateBlockVariantSchema = z.enum([
  'default',
  'compact',
  'detailed',
]);

export const templateBlockSchema = z.object({
  type: templateBlockTypeSchema,
  enabled: z.boolean(),
  variant: templateBlockVariantSchema.optional(),
});

export const templateConfigSchema = z.object({
  themeId: templateThemeIdSchema,
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    text: z.string(),
    lightText: z.string(),
  }),
  logo: z.object({
    url: z.string(),
    /** SVG collé (prioritaire sur `url` pour le rendu PDF si le contenu ressemble à du SVG). */
    svgInline: z.string().max(524_288).optional(),
    width: z.number(),
    height: z.number(),
  }),
  header: z.object({
    companyName: z.string(),
    documentTitle: z.string(),
    tagLine: z.string(),
    metaLine: z.string(),
    showCandidateName: z.boolean(),
  }),
  footer: z.object({
    leftText: z.string(),
    centerText: z.string(),
    rightText: z.string(),
  }),
  blocks: z.array(templateBlockSchema),
  /** Préfixe des noms de fichier PDF exportés (CV / positionnement) pour les candidats utilisant ce gabarit */
  exportFilePrefix: z.string().max(40).optional(),
});

export type TemplateConfig = z.infer<typeof templateConfigSchema>;
export type TemplateThemeId = z.infer<typeof templateThemeIdSchema>;
export type TemplateBlock = z.infer<typeof templateBlockSchema>;
export type TemplateBlockType = z.infer<typeof templateBlockTypeSchema>;
export type TemplateBlockVariant = z.infer<typeof templateBlockVariantSchema>;

export const DEFAULT_TEMPLATE_BLOCKS: TemplateBlock[] = [
  { type: 'profile-info', enabled: true, variant: 'default' },
  { type: 'summary', enabled: true, variant: 'default' },
  { type: 'skills', enabled: true, variant: 'default' },
  { type: 'education', enabled: true, variant: 'default' },
  { type: 'experiences', enabled: true, variant: 'detailed' },
];

/** Défaut PDF ; si tu modifies ce bloc, mets à jour `20260419_platform_template_canonical_config.sql`. */
export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  themeId: 'classic',
  colors: {
    primary: '#010557',
    secondary: '#9bcaff',
    background: '#ffffff',
    text: '#4b5563',
    lightText: '#9ca3af',
  },
  logo: {
    url: '',
    width: 90,
    height: 20,
  },
  header: {
    companyName: '',
    documentTitle: 'Dossier de competences techniques',
    tagLine: '',
    metaLine: '',
    showCandidateName: true,
  },
  footer: {
    leftText: '',
    centerText: '',
    rightText: '',
  },
  blocks: DEFAULT_TEMPLATE_BLOCKS,
  exportFilePrefix: 'CV',
};

export const skillSchema = z.object({
  name: z.string(),
  source: z.enum(['extracted', 'inferred']).describe("'extracted' = explicitly mentioned in the CV, 'inferred' = deduced by the AI from context, experience descriptions, or industry knowledge"),
  starred: z.boolean().describe("true = the skill is important, well-known, modern, in-demand. Max 20 starred for technologies. For other categories: star the most valuable ones."),
  added: z.boolean().describe("true = included in the PDF. Automatically set to true for starred skills, false for non-starred. User can manually toggle."),
});

export type Skill = z.infer<typeof skillSchema>;

export const extractionSchema = z.object({
  language: z
    .enum(['fr', 'en'])
    .default('fr')
    .describe(
      "Langue principale du CV détectée depuis le contenu (texte, intitulés de sections, descriptions). 'fr' si majoritairement en français, 'en' si majoritairement en anglais.",
    ),
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    title: z.string(),
    /**
     * Tolère la chaîne vide renvoyée par le LLM quand l'email est absent du CV.
     * — Zod v4 `.email().optional()` rejette `""` au runtime → `.catch(undefined)` absorbe les valeurs invalides.
     * — `z.preprocess` est évité : il crée un `ZodPipe` dont `io:"input"` met `email` dans `required`, ce qui
     *    confond le modèle (champ obligatoire mais absent du CV → pas de sortie → AI_NoOutputGeneratedError).
     */
    email: z.string().email().optional().catch(undefined),
    phone: z.string().optional(),
    location: z.string().optional(),
    yearsOfExperience: z.string().optional().describe("Total years of professional experience (e.g. '8 ans')"),
    availability: z.string().optional().describe("Availability (e.g. 'Immédiate', 'Préavis 3 mois')"),
    /** Estimation prudente pour le matching (titres, durées, descriptions) — pas un jugement définitif */
    inferredSeniorityBand: z
      .enum(['junior', 'confirmed', 'senior', 'expert_lead', 'unknown'])
      .optional()
      .describe(
        "Fourchette de niveau déduite du CV uniquement ; « unknown » si données insuffisantes ou ambiguës.",
      ),
    seniorityInferenceNote: z
      .string()
      .optional()
      .describe(
        "1–2 phrases FR : sur quels faits du CV la fourchette repose ; vide ou absente si unknown.",
      ),
  }),
  summary: z.string().describe("Professional summary (3-4 sentences). Use **double asterisks** around key skills, technologies, and achievements to highlight them in bold."),
  experiences: z.array(z.object({
    role: z.string(),
    company: z.string(),
    companyDomain: z.string().optional().describe("Company website domain (e.g. google.com) for logo display"),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    isCurrent: z.boolean(),
    description: z.array(z.string()).describe("List of missions/tasks"),
    skills: z.array(z.string()).optional().describe("Key technologies/tools used in this experience (e.g. 'React', 'Node.js', 'AWS')"),
    spacingAfter: z.number().min(0).max(100).optional().describe("Extra bottom margin in pt (PDF layout tweak)"),
  })),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    year: z.string(),
    spacingAfter: z.number().min(0).max(100).optional().describe("Extra bottom margin in pt (PDF layout tweak)"),
  })),
  skills: z.object({
    technologies: z.array(skillSchema).describe("Technical skills: languages, frameworks, databases, tools (mapped to skills.sh taxonomy)"),
    softSkills: z.array(skillSchema).describe("Soft skills: leadership, communication, teamwork, etc."),
    expertises: z.array(skillSchema).describe("Domain expertises: architecture, cloud, data, security, etc."),
    methodologies: z.array(skillSchema).describe("Methodologies: Agile, Scrum, DevOps, TDD, etc."),
  }).describe("Skills organized by category. Mark each skill as 'extracted' if explicitly written in the CV, or 'inferred' if deduced from context."),
  strengths: z.array(z.string()).optional().describe("4-5 bullet points of strengths based on CV and job description"),
  sectionSpacing: z.object({
    summary: z.number().min(0).max(100).optional(),
    skills: z.number().min(0).max(100).optional(),
    education: z.number().min(0).max(100).optional(),
    strengths: z.number().min(0).max(100).optional(),
  }).optional().describe("Extra bottom margin per section in pt (PDF layout tweak)"),
});

export type ExtractedCV = z.infer<typeof extractionSchema>;

/** Sous-schémas pour extraction parallèle (streamText + Output.object) */
export const extractionIdentitySchema = extractionSchema.pick({
  language: true,
  personalInfo: true,
  summary: true,
});
export type ExtractionIdentity = z.infer<typeof extractionIdentitySchema>;

export const extractionExperiencesSchema = extractionSchema.pick({ experiences: true });
export type ExtractionExperiences = z.infer<typeof extractionExperiencesSchema>;

export const extractionEducationSchema = extractionSchema.pick({ education: true });
export type ExtractionEducation = z.infer<typeof extractionEducationSchema>;

export const extractionSkillsStrengthsSchema = extractionSchema.pick({
  skills: true,
  strengths: true,
});
export type ExtractionSkillsStrengths = z.infer<typeof extractionSkillsStrengthsSchema>;

// Positioning schemas

export const positioningAnalysisSchema = z.object({
  skillMatches: z.array(z.object({
    skill: z.string(),
    /** Si la mission fournit des points clés avec `id`, lier l’évaluation à ce point */
    keyPointId: z.string().optional(),
    category: z.string().describe("Catégorie libre de la compétence, choisie par l'IA pour regrouper les compétences de manière pertinente (ex: 'Backend', 'Cloud & DevOps', 'Leadership', 'Data', 'Frontend', 'Méthodologie'...). Utiliser des noms courts et parlants en français."),
    relevance: z.enum(['strong', 'partial', 'missing']),
    comment: z.string(),
    note: z.string().describe("Note détaillée expliquant pourquoi cette compétence match ou ne match pas, avec références concrètes au CV"),
    /** Citation littérale extraite du CV, ou la chaîne NO_EVIDENCE si aucune preuve */
    evidenceQuote: z.string().optional(),
  })),
  experienceRelevance: z.array(z.object({
    experience: z.string(),
    relevance: z.enum(['high', 'medium', 'low']),
    comment: z.string(),
    note: z.string().describe("Note détaillée expliquant la pertinence de cette expérience par rapport au poste, avec éléments factuels"),
  })),
  gaps: z.array(z.object({
    gap: z.string(),
    note: z.string().describe("Note détaillée expliquant pourquoi c'est une lacune et son impact potentiel sur le poste"),
  })),
  candidateQuestions: z.array(z.object({
    question: z.string(),
    context: z.string(),
    answer: z.string().optional(),
  })),
  clientQuestions: z.array(z.object({
    question: z.string(),
    context: z.string(),
    answer: z.string().optional(),
  })),
  matchScore: z.number().min(0).max(100),
  matchSummary: z.string(),
  /** Fiabilité du score pour l’aide à la décision (souvent absent sur analyses antérieures) */
  matchScoreConfidence: z.enum(['low', 'medium', 'high']).optional(),
  matchScoreConfidenceNote: z
    .string()
    .optional()
    .describe('Pourquoi le score est plus ou moins fiable (incertitudes, contradictions, barème incomplet).'),
});

export type PositioningAnalysis = z.infer<typeof positioningAnalysisSchema>;

/** Sous-schémas pour analyse de positionnement parallèle (streamText + Output.object) */
export const positioningSkillMatchesSchema = positioningAnalysisSchema.pick({ skillMatches: true });
export const positioningExperienceRelevanceSchema = positioningAnalysisSchema.pick({
  experienceRelevance: true,
});
export const positioningGapsSchema = positioningAnalysisSchema.pick({ gaps: true });
export const positioningQuestionsSchema = positioningAnalysisSchema.pick({
  candidateQuestions: true,
  clientQuestions: true,
});
/** Sortie obligatoire de la branche synthèse (le merge alimente aussi confidence sur l’analyse complète). */
export const positioningSynthesisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchSummary: z.string(),
  matchScoreConfidence: z.enum(['low', 'medium', 'high']),
  matchScoreConfidenceNote: z.string().min(1),
});

export const positioningEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export type PositioningEmail = z.infer<typeof positioningEmailSchema>;

export const positioningOutputSchema = z.object({
  tailoredCv: extractionSchema,
  email: positioningEmailSchema,
  emailFirstContact: positioningEmailSchema,
  emailBulletPoints: positioningEmailSchema,
  candidateEmail: positioningEmailSchema,
});

export type PositioningOutput = z.infer<typeof positioningOutputSchema>;

/** Sous-schémas pour génération positionnement parallèle (streamText + Output.object) */
export const positioningTailoredCvPartSchema = positioningOutputSchema.pick({ tailoredCv: true });
export const positioningEmailPartSchema = positioningOutputSchema.pick({ email: true });
export const positioningEmailFirstContactPartSchema = positioningOutputSchema.pick({
  emailFirstContact: true,
});
export const positioningEmailBulletPointsPartSchema = positioningOutputSchema.pick({
  emailBulletPoints: true,
});
export const positioningCandidateEmailPartSchema = positioningOutputSchema.pick({
  candidateEmail: true,
});

// ─── Analyse fiche de poste (mission) — recruteur ─────────────────

export const jobPostingKeyPointAspectSchema = z.enum([
  'technical',
  'methodology',
  'soft_skills',
  'context_client',
  'constraints',
  'delivery',
  'other',
]);

export type JobPostingKeyPointAspect = z.infer<typeof jobPostingKeyPointAspectSchema>;

/** Bande normalisée du niveau attendu sur la mission (analyse fiche) */
export const jobPostingExpertiseBandSchema = z.enum([
  'junior',
  'confirmed',
  'senior',
  'expert_lead',
  'unclear',
]);

export type JobPostingExpertiseBand = z.infer<typeof jobPostingExpertiseBandSchema>;

function asTrimmedStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter((s) => s.length > 0);
  if (typeof v === 'string' && v.trim()) return [v.trim()];
  return [];
}

/** Tolère les libellés du LLM (ex. « expert », « lead ») pour éviter AI_NoObjectGeneratedError. */
export function normalizeJobPostingExpertiseBand(val: unknown): JobPostingExpertiseBand {
  if (
    val === 'junior' ||
    val === 'confirmed' ||
    val === 'senior' ||
    val === 'expert_lead' ||
    val === 'unclear'
  ) {
    return val;
  }
  const s = String(val ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!s || s === 'unknown' || s === 'inconnu' || s === 'na' || s === 'n a') return 'unclear';
  if (s.includes('junior') || s.includes('debutant') || s.includes('intern')) return 'junior';
  if (
    s.includes('confirme') ||
    s.includes('intermediaire') ||
    s.includes('medior') ||
    s.includes('middle')
  ) {
    return 'confirmed';
  }
  if (s.includes('expert') || s.includes('lead') || s.includes('principal') || s.includes('staff')) {
    return 'expert_lead';
  }
  if (s.includes('senior')) return 'senior';
  return 'unclear';
}

function coerceBooleanLoose(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 'true' || v === 1) return true;
  if (v === 'false' || v === 0) return false;
  return false;
}

function coerceMinYearsHint(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 80) return undefined;
  return Math.round(n);
}

/**
 * Niveau d’expertise attendu — prioritaire sur technos et récence pour le matching et l’aide à la décision.
 * Schéma **tolérant** : le LLM renvoie souvent des enums / tableaux hors contrat strict ; on normalise pour que `Output.object` valide.
 */
export const jobPostingExpectedExpertiseLevelSchema = z.object({
  summary: z
    .unknown()
    .describe(
      'Synthèse recruteur : ce que le niveau attendu implique concrètement sur cette mission (autonomie, périmètre, criticité).',
    )
    .transform((v) => {
      const s = v == null ? '' : String(v).trim();
      return s.length > 0
        ? s
        : 'Niveau attendu : se référer à la fiche et aux points clés pour le détail.';
    }),
  statedLevel: z
    .unknown()
    .describe('Libellé repris de la fiche (ex. « Développeur senior », « Expert API »).')
    .transform((v) => {
      const s = v == null ? '' : String(v).trim();
      return s.length > 0 ? s : 'Non précisé dans la fiche.';
    }),
  interpretedBand: z
    .unknown()
    .describe(
      'Interprétation normalisée : junior | confirmed | senior | expert_lead | unclear (synonymes acceptés).',
    )
    .transform((v) => normalizeJobPostingExpertiseBand(v)),
  signalsFromPosting: z
    .unknown()
    .describe('Signaux factuels tirés du texte (responsabilités, mentoring, taille d’équipe, etc.).')
    .transform((v) => {
      const arr = asTrimmedStringArray(v);
      return arr.length > 0
        ? arr
        : ['Aucun signal structuré extrait ; se référer au résumé du niveau ci-dessus.'];
    }),
  hardOnLevel: z
    .unknown()
    .describe('True si le niveau est clairement non négociable pour cette mission.')
    .transform(coerceBooleanLoose),
  minYearsHint: z
    .any()
    .optional()
    .describe(
      "Années d'expérience minimales suggérées par la fiche, uniquement si l'indication est claire ; sinon omettre.",
    )
    .transform((v) => (v === undefined ? undefined : coerceMinYearsHint(v))),
  recruiterCalibrationQuestions: z
    .unknown()
    .describe('1 à 4 questions courtes pour calibrer le niveau avec le client (complément de openQuestions).')
    .transform((v) => {
      const arr = asTrimmedStringArray(v);
      const q =
        arr.length > 0
          ? arr
          : ['Comment le client valide-t-il qu’un profil a le niveau attendu sur cette mission ?'];
      return q.slice(0, 4);
    }),
});

export type JobPostingExpectedExpertiseLevel = z.infer<typeof jobPostingExpectedExpertiseLevelSchema>;

/** Niveau d’exigence REFACTO (rubric) — optionnel pour rétrocompatibilité */
export const jobPostingRequirementTierSchema = z.enum([
  'hard_constraint',
  'must_have',
  'should_have',
  'nice_to_have',
]);

export type JobPostingRequirementTier = z.infer<typeof jobPostingRequirementTierSchema>;

export const jobPostingEvidenceTypeExpectedSchema = z.enum([
  'explicit',
  'implicit_acceptable',
  'transferable_proven',
]);

export type JobPostingEvidenceTypeExpected = z.infer<typeof jobPostingEvidenceTypeExpectedSchema>;

/** Tolère les libellés LLM hors enum pour éviter AI_NoObjectGeneratedError sur keyPoints. */
function normalizeJobPostingKeyPointAspect(val: unknown): JobPostingKeyPointAspect {
  const direct = jobPostingKeyPointAspectSchema.safeParse(val);
  if (direct.success) return direct.data;

  const s = String(val ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!s) return 'other';

  if (s === 'technical' || s.includes('technique') || s === 'tech') return 'technical';
  if (s === 'methodology' || s.includes('methodologie') || s.includes('process')) return 'methodology';
  if (s.includes('soft') || s.includes('relationnel')) return 'soft_skills';
  if (s.includes('context') || s.includes('client')) return 'context_client';
  if (s.includes('constraint') || s.includes('contrainte')) return 'constraints';
  if (s.includes('delivery') || s.includes('livraison')) return 'delivery';
  return 'other';
}

function normalizeJobPostingRequirementTier(val: unknown): JobPostingRequirementTier | undefined {
  if (val == null || val === '') return undefined;
  const direct = jobPostingRequirementTierSchema.safeParse(val);
  if (direct.success) return direct.data;
  const s = String(val)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  if (!s) return undefined;
  if ((s.includes('hard') && s.includes('constraint')) || s.includes('eliminatoire')) {
    return 'hard_constraint';
  }
  if (s.includes('must')) return 'must_have';
  if (s.includes('should')) return 'should_have';
  if (s.includes('nice')) return 'nice_to_have';
  return undefined;
}

function normalizeJobPostingEvidenceTypeExpected(val: unknown): JobPostingEvidenceTypeExpected | undefined {
  if (val == null || val === '') return undefined;
  const direct = jobPostingEvidenceTypeExpectedSchema.safeParse(val);
  if (direct.success) return direct.data;
  const s = String(val).toLowerCase().trim();
  if (s.includes('explicit')) return 'explicit';
  if (s.includes('implicit')) return 'implicit_acceptable';
  if (s.includes('transfer')) return 'transferable_proven';
  return undefined;
}

function slugAsciiFromLabel(label: string): string {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'point';
}

export const jobPostingKeyPointSchema = z
  .object({
    id: z
      .union([z.string(), z.number()])
      .describe(
        "Identifiant stable pour cette mission / réanalyse (slug ASCII). Pour le technique, préférer aligner id sur canonicalSkillKey quand c'est une techno.",
      )
      .transform((v) => String(v).trim()),
    label: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
    aspect: z
      .union([jobPostingKeyPointAspectSchema, z.string()])
      .describe('Catégorie du point (synonymes FR/EN acceptés).')
      .transform((v) => normalizeJobPostingKeyPointAspect(v)),
    /** Obligatoire si aspect = technical : complété automatiquement depuis le label si omis. */
    canonicalSkillKey: z
      .union([z.string(), z.number(), z.null()])
      .optional()
      .describe(
        'Pour aspect technical uniquement : identifiant stable partagé entre toutes les missions (stats, « compris » global). Ex. react, nodejs, kubernetes.',
      )
      .transform((v) => {
        if (v == null) return undefined;
        const s = String(v).trim();
        return s.length > 0 ? normalizeSkillKey(s) : undefined;
      }),
    category: z.union([z.string(), z.number()]).transform((v) => String(v).trim()),
    importanceRank: z
      .union([z.number(), z.string()])
      .describe('1 = le plus critique pour répondre au besoin mission')
      .transform((v) => {
        const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(',', '.'));
        if (!Number.isFinite(n)) return 1;
        return Math.max(1, Math.round(n));
      }),
    roleInMission: z.union([z.string().max(400), z.number()]).transform((v) => String(v).trim()),
    /** Rubric REFACTO : bloquant vs négociable */
    requirementTier: z
      .union([jobPostingRequirementTierSchema, z.string(), z.null()])
      .optional()
      .describe(
        'hard_constraint = éliminatoire si non satisfait ; les autres se pondèrent entre eux (somme des importanceWeight ≈ 1)',
      )
      .transform((v) => normalizeJobPostingRequirementTier(v)),
    /** Poids 0–1 pour critères non hard_constraint (somme ≈ 1 entre eux) */
    importanceWeight: z
      .union([z.number(), z.string(), z.null()])
      .optional()
      .describe('Uniquement pour must_have / should_have / nice_to_have')
      .transform((v) => {
        if (v == null || v === '') return undefined;
        const n = typeof v === 'number' ? v : Number.parseFloat(String(v).replace(',', '.'));
        if (!Number.isFinite(n)) return undefined;
        return Math.min(1, Math.max(0, n));
      }),
    evidenceTypeExpected: z
      .union([jobPostingEvidenceTypeExpectedSchema, z.string(), z.null()])
      .optional()
      .describe('Type de preuve attendu sur le CV pour scorer ce critère')
      .transform((v) => normalizeJobPostingEvidenceTypeExpected(v)),
    valueSought: z
      .union([z.string().max(300), z.number(), z.null()])
      .optional()
      .describe('Formulation courte de l’exigence vérifiable (ex. "Python confirmé 3+ ans", "Anglais C1")')
      .transform((v) => {
        if (v == null || v === '') return undefined;
        return String(v).trim();
      }),
    scoringRubricHint: z
      .union([z.string().max(250), z.number(), z.null()])
      .optional()
      .describe('Indication brève pour le scoring 0 / 50 / 100 (barème métier)')
      .transform((v) => {
        if (v == null || v === '') return undefined;
        return String(v).trim();
      }),
  })
  .transform((data) => {
    const { aspect, label, importanceRank } = data;
    let { id, canonicalSkillKey } = data;
    if (!id) {
      id = `${slugAsciiFromLabel(label)}-${importanceRank}`;
    }
    if (aspect === 'technical' && !canonicalSkillKey?.trim()) {
      canonicalSkillKey = normalizeSkillKey(slugAsciiFromLabel(label));
    }
    return { ...data, id, canonicalSkillKey };
  });

export const jobPostingAnalysisSchema = z.object({
  executiveSummary: z
    .string()
    .max(1200)
    .describe('3 à 5 phrases : besoin, contexte, enjeux, non-négociable vs secondaire'),
  /**
   * Niveau d’expertise attendu : prime sur les correspondances technos et la récence dans les prompts de positionnement.
   * Optionnel pour rétrocompat ; les nouvelles analyses mission doivent le remplir (consigne LLM).
   */
  expectedExpertiseLevel: jobPostingExpectedExpertiseLevelSchema.optional(),
  /** Mots-clés prioritaires pour sélectionner le contexte CV au scoring (REFACTO §3.2) */
  cvSearchKeywords: z
    .array(z.string().max(50))
    .optional()
    .describe('10 à 15 termes techniques ou métiers à prioriser pour le matching CV'),
  keyPoints: z
    .array(jobPostingKeyPointSchema)
    .describe('Points clés triés par importanceRank croissant (rang 1 en premier)'),
  openQuestions: z.array(z.string().max(400)).optional().describe('Zones floues ou à clarifier avec le client'),
  redFlags: z.array(z.string().max(400)).optional().describe('Ambiguïtés ou risques pour le discours commercial'),
  keyPointExplanations: z
    .record(z.string(), z.lazy(() => jobPostingKeyPointExplainSchema))
    .optional()
    .describe('Cache d’explications détaillées par point clé (clé = pointId)'),
});

export type JobPostingAnalysis = z.infer<typeof jobPostingAnalysisSchema>;

export const jobPostingExecutiveSchema = jobPostingAnalysisSchema.pick({ executiveSummary: true });
export const jobPostingKeyPointsBlockSchema = jobPostingAnalysisSchema.pick({
  keyPoints: true,
  openQuestions: true,
  redFlags: true,
  cvSearchKeywords: true,
  expectedExpertiseLevel: true,
});

export const jobPostingKeyPointExplainSchema = z.object({
  definition: z.string().describe('Définition accessible pour un recruteur'),
  usageInMission: z.string().describe('En quoi c’est central dans cette mission'),
  candidateQuestions: z.array(z.string()).describe('Questions pertinentes en entretien'),
  expectedAnswers: z.object({
    debutant: z.string(),
    confirme: z.string(),
    senior: z.string(),
  }),
});

export type JobPostingKeyPointExplain = z.infer<typeof jobPostingKeyPointExplainSchema>;
