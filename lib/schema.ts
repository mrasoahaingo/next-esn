import { z } from 'zod';

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
