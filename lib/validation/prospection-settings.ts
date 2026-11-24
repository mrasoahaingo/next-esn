import { z } from 'zod';
import { HEAT_THRESHOLD_MAX, HEAT_THRESHOLD_MIN } from '@/lib/prospection/constants';

/**
 * Corps de `PUT /api/prospection/settings`. Objet Zod par défaut : les clés inconnues
 * (dont un `org_id` injecté) sont retirées — l'org vient toujours de la session Clerk.
 */
export const prospectionSettingsPutSchema = z.object({
  heat_threshold: z.number().int().min(HEAT_THRESHOLD_MIN).max(HEAT_THRESHOLD_MAX),
});

export type ProspectionSettingsPut = z.infer<typeof prospectionSettingsPutSchema>;
