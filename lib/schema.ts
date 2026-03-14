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
    'strengths', 'summary', 'skills', 'experiences', 'education',
  ])),
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
    line1: 'Himeo Group – Solutions humaines & digitales',
    line2: 'contact@himeo.fr – www.himeo.fr',
  },
  sections: ['strengths', 'summary', 'skills', 'experiences', 'education'],
};

export const extractionSchema = z.object({
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    title: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
  }),
  summary: z.string().describe("Professional summary (3-4 sentences)"),
  experiences: z.array(z.object({
    role: z.string(),
    company: z.string(),
    companyDomain: z.string().optional().describe("Company website domain (e.g. google.com) for logo display"),
    location: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    isCurrent: z.boolean(),
    description: z.array(z.string()).describe("List of missions/tasks"),
  })),
  education: z.array(z.object({
    degree: z.string(),
    school: z.string(),
    year: z.string(),
  })),
  skills: z.array(z.string()).describe("List of technical skills mapped to skills.sh taxonomy"),
  strengths: z.array(z.string()).describe("4-5 bullet points of strengths based on CV and job description"),
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
  candidateEmail: positioningEmailSchema,
});

export type PositioningOutput = z.infer<typeof positioningOutputSchema>;
