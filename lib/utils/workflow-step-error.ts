/** Erreur enrichie avec la clé d’étape workflow (ERR-03). */
export type ErrorWithWorkflowStepKey = Error & { stepKey?: string };

export function attachWorkflowStepKey(err: unknown, stepKey: string): Error {
  const e = err instanceof Error ? err : new Error(String(err));
  (e as ErrorWithWorkflowStepKey).stepKey = stepKey;
  return e;
}

export function readWorkflowStepKey(err: unknown): string | undefined {
  if (
    err &&
    typeof err === 'object' &&
    'stepKey' in err &&
    typeof (err as { stepKey: unknown }).stepKey === 'string'
  ) {
    return (err as { stepKey: string }).stepKey;
  }
  return undefined;
}
