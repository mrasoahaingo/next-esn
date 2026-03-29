import { z } from 'zod';

export const SignalSource = z.enum(['job_offer', 'public_market', 'linkedin', 'press']);
export const HeatLevel = z.enum(['cold', 'warm', 'hot', 'burning']);
export const ActionType = z.enum([
  'email_sent',
  'call_made',
  'linkedin_message',
  'meeting',
  'brief_generated',
  'dismissed',
  'feedback',
]);
export const ActionOutcome = z.enum(['pending', 'positive', 'negative', 'no_response']);

export const RawSignalSchema = z.object({
  source: SignalSource,
  title: z.string().min(1),
  rawContent: z.string().optional(),
  weight: z.number().int().min(0).max(25),
  metadata: z.record(z.string(), z.unknown()).default({}),
  companyName: z.string().min(1),
  companySiren: z.string().optional(),
  detectedAt: z.string().datetime({ offset: true }).optional(),
});
export type RawSignal = z.infer<typeof RawSignalSchema>;

export const JobOfferItemSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  contractType: z.string(),
  technologies: z.array(z.string()).default([]),
  seniorityLevel: z.string(),
  salaryRange: z.string().optional(),
  postedDate: z.string().optional(),
  url: z.string().url().optional(),
});

export const JobOfferExtractionSchema = z.object({
  offers: z.array(JobOfferItemSchema).default([]),
});

export const PublicMarketSchema = z.object({
  reference: z.string(),
  title: z.string(),
  organization: z.string(),
  lots: z
    .array(
      z.object({
        number: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  estimatedBudget: z.string().optional(),
  deadline: z.string().optional(),
  url: z.string().optional(),
});

export const PressExtractionSchema = z.object({
  signals: z
    .array(
      z.object({
        company: z.string(),
        signalType: z.enum([
          'nomination',
          'fundraising',
          'digital_transformation',
          'outsourcing',
          'hiring',
        ]),
        title: z.string(),
        details: z.string(),
      }),
    )
    .default([]),
});

export const ProspectScoreSchema = z.object({
  companyId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  signalCount: z.number().int(),
  convergenceBonus: z.number().int(),
  heat: HeatLevel,
  breakdown: z.record(z.string(), z.number()),
});
export type ProspectScore = z.infer<typeof ProspectScoreSchema>;

export const MatchSchema = z.object({
  consultantId: z.string().uuid(),
  consultantName: z.string(),
  matchScore: z.number().min(0).max(1),
  matchReason: z.string(),
  skills: z.array(z.string()).default([]),
  tjm: z.number().optional(),
  availability: z.string(),
});
export type Match = z.infer<typeof MatchSchema>;

export const ProspectListItemSchema = z.object({
  companyId: z.string().uuid(),
  companyName: z.string(),
  siren: z.string().nullable().optional(),
  sector: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  score: z.number().int().min(0).max(100),
  heat: HeatLevel,
  signalCount: z.number().int(),
  convergenceBonus: z.number().int(),
  breakdown: z.record(z.string(), z.number()),
  technologies: z.array(z.string()).default([]),
  latestSignalAt: z.string().datetime({ offset: true }).nullable().optional(),
});
export type ProspectListItem = z.infer<typeof ProspectListItemSchema>;

export const ProspectSignalSchema = z.object({
  id: z.string().uuid(),
  source: SignalSource,
  title: z.string(),
  rawContent: z.string().nullable().optional(),
  weight: z.number().int(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  detectedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
});
export type ProspectSignal = z.infer<typeof ProspectSignalSchema>;

export const ProspectDetailSchema = z.object({
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
    siren: z.string().nullable().optional(),
    sector: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    headcount: z.number().nullable().optional(),
    website: z.string().nullable().optional(),
    linkedinUrl: z.string().nullable().optional(),
    enrichmentData: z.record(z.string(), z.unknown()).default({}),
  }),
  score: ProspectScoreSchema.nullable(),
  signals: z.array(ProspectSignalSchema),
  matches: z.array(MatchSchema),
  actions: z.array(
    z.object({
      id: z.string().uuid(),
      action: ActionType,
      outcome: ActionOutcome,
      notes: z.string().nullable().optional(),
      performedAt: z.string().datetime({ offset: true }),
      userId: z.string(),
    }),
  ),
});
export type ProspectDetail = z.infer<typeof ProspectDetailSchema>;

export const ProspectActionInputSchema = z.object({
  companyId: z.string().uuid(),
  action: ActionType,
  outcome: ActionOutcome.default('pending'),
  notes: z.string().trim().max(4000).optional(),
});
export type ProspectActionInput = z.infer<typeof ProspectActionInputSchema>;

export const ProspectFiltersSchema = z.object({
  sector: z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().optional()),
  heat: z.preprocess((value) => (value === '' ? undefined : value), HeatLevel.optional()),
  city: z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().optional()),
  technology: z.preprocess((value) => (value === '' ? undefined : value), z.string().trim().optional()),
});
export type ProspectFilters = z.infer<typeof ProspectFiltersSchema>;

export const RadarSourceStatusSchema = z.object({
  key: z.string(),
  label: z.string(),
  enabled: z.boolean(),
  detail: z.string(),
});
export type RadarSourceStatus = z.infer<typeof RadarSourceStatusSchema>;
