import { z } from 'zod';

// ─── Template config ─────────────────────────────────────────────

export const templateConfigSchema = z.object({
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    background: z.string(),
    text: z.string(),
    lightText: z.string(),
  }),
  logo: z.object({
    url: z.string(),
    width: z.number(),
    height: z.number(),
  }),
  footer: z.object({
    line1: z.string(),
    line2: z.string(),
  }),
  sections: z.array(z.enum([
    'summary', 'skills', 'education', 'experiences',
  ])),
  /** Préfixe des noms de fichier PDF exportés (CV / positionnement) pour les candidats utilisant ce gabarit */
  exportFilePrefix: z.string().max(40).optional(),
});

export type TemplateConfig = z.infer<typeof templateConfigSchema>;

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
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
  footer: {
    line1: '',
    line2: '',
  },
  sections: ['summary', 'skills', 'education', 'experiences'],
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
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    title: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    yearsOfExperience: z.string().optional().describe("Total years of professional experience (e.g. '8 ans')"),
    availability: z.string().optional().describe("Availability (e.g. 'Immédiate', 'Préavis 3 mois')"),
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
  })),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    year: z.string(),
  })),
  skills: z.object({
    technologies: z.array(skillSchema).describe("Technical skills: languages, frameworks, databases, tools (mapped to skills.sh taxonomy)"),
    softSkills: z.array(skillSchema).describe("Soft skills: leadership, communication, teamwork, etc."),
    expertises: z.array(skillSchema).describe("Domain expertises: architecture, cloud, data, security, etc."),
    methodologies: z.array(skillSchema).describe("Methodologies: Agile, Scrum, DevOps, TDD, etc."),
  }).describe("Skills organized by category. Mark each skill as 'extracted' if explicitly written in the CV, or 'inferred' if deduced from context."),
  strengths: z.array(z.string()).optional().describe("4-5 bullet points of strengths based on CV and job description"),
});

export type ExtractedCV = z.infer<typeof extractionSchema>;

// Positioning schemas

export const positioningAnalysisSchema = z.object({
  skillMatches: z.array(z.object({
    skill: z.string(),
    category: z.string().describe("Catégorie libre de la compétence, choisie par l'IA pour regrouper les compétences de manière pertinente (ex: 'Backend', 'Cloud & DevOps', 'Leadership', 'Data', 'Frontend', 'Méthodologie'...). Utiliser des noms courts et parlants en français."),
    relevance: z.enum(['strong', 'partial', 'missing']),
    comment: z.string(),
    note: z.string().describe("Note détaillée expliquant pourquoi cette compétence match ou ne match pas, avec références concrètes au CV"),
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
});

export type PositioningAnalysis = z.infer<typeof positioningAnalysisSchema>;

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
