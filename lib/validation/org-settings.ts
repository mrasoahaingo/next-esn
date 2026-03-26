import { z } from 'zod';
import { matchingWeightsSchema } from '@/lib/config/matching-weights';

const optionalText = z.union([z.string().max(2000), z.literal('')]).optional();

export const organizationSettingsPatchSchema = z.object({
  display_name: z.string().max(200).optional(),
  contact_email: z.union([z.string().email().max(320), z.literal('')]).optional(),
  website_url: z.union([z.string().url().max(2000), z.literal('')]).optional(),
  app_logo_url: optionalText,
  positioning_brand_context: z.union([z.string().max(8000), z.literal('')]).optional(),
  /** null = réinitialiser aux défauts applicatifs */
  matching_weights: matchingWeightsSchema.partial().nullable().optional(),
});

export type OrganizationSettingsPatch = z.infer<typeof organizationSettingsPatchSchema>;
