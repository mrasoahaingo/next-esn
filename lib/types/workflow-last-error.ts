import { z } from 'zod';

export const workflowLastErrorSchema = z.object({
  stepKey: z.string(),
  message: z.string(),
  /** Run workflow à l'origine de l'échec. Optionnel : les lignes déjà en base n'en portent pas. */
  runId: z.string().optional(),
});

export type WorkflowLastError = z.infer<typeof workflowLastErrorSchema>;

/** Colonne JSONB `workflow_last_error` sur candidates / positionings / missions. */
export type WithWorkflowLastError = {
  workflow_last_error: WorkflowLastError | null;
};
