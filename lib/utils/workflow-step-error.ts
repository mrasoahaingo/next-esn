/** Erreur enrichie avec la clé d’étape workflow (ERR-03). */
export type ErrorWithWorkflowStepKey = Error & { stepKey?: string };

/**
 * Marqueur de clé d’étape inscrit dans le message d’erreur.
 *
 * Quand un step épuise ses tentatives, le runtime workflow ne transmet au workflow que le message
 * (`new FatalError('Step "…" failed after N retries: <message>')`) : la propriété `stepKey` est
 * perdue. Le marqueur, lui, survit dans le message et permet l’attribution de l’échec à l’étape.
 */
const STEP_KEY_MARKER_RE = /\[stepKey=([A-Za-z0-9_-]+)\]\s?/;

export function readStepKeyFromMessage(message: string | null | undefined): string | undefined {
  if (!message) return undefined;
  return STEP_KEY_MARKER_RE.exec(message)?.[1];
}

export function stripStepKeyMarker(message: string): string {
  return message.replace(STEP_KEY_MARKER_RE, '');
}

export function attachWorkflowStepKey(err: unknown, stepKey: string): Error {
  const e = err instanceof Error ? err : new Error(String(err));
  (e as ErrorWithWorkflowStepKey).stepKey = stepKey;
  if (!readStepKeyFromMessage(e.message)) {
    try {
      e.message = `[stepKey=${stepKey}] ${e.message}`;
    } catch {
      // message non modifiable : la propriété `stepKey` reste disponible dans le step
    }
  }
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
  if (err instanceof Error) return readStepKeyFromMessage(err.message);
  return undefined;
}
