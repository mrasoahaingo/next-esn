import { readStepKeyFromMessage, stripStepKeyMarker } from '@/lib/utils/workflow-step-error';

/**
 * Messages d’échec de workflow présentables à l’utilisateur. Logique pure.
 *
 * `workflow_last_error.message` contient le message brut de l’exception (ex.
 * `Step "step//./workflows/positioning-analyze//fetchAndAnalyze" failed after 1 retry:
 * [stepKey=skills] No output generated. Check the stream for errors.`) : technique, en anglais.
 * Les messages rédigés par l’application (réconciliation, etc.) sont déjà en français et passent tels quels.
 */

export const WORKFLOW_TECHNICAL_FAILURE_MESSAGE =
  'Une erreur technique est survenue pendant le traitement. Relancez l’opération.';

const STEP_RETRY_PREFIX_RE = /^Step\s+"[^"]*"\s+(?:failed after \d+ (?:retry|retries)|exceeded max retries[^:]*):\s*/i;

const KNOWN_FAILURES: Array<{ test: RegExp; message: string }> = [
  {
    test: /no output generated|NoOutputGenerated|NoObjectGenerated|could not parse the response|did not match schema/i,
    message:
      'Le modèle d’IA n’a pas renvoyé de réponse exploitable. Relancez l’opération ; si l’échec se répète, contactez le support.',
  },
  {
    test: /rate.?limit|too many requests|\b429\b|quota/i,
    message: 'Le service d’IA est momentanément saturé. Réessayez dans quelques minutes.',
  },
  {
    test: /timed? ?out|timeout|ETIMEDOUT|deadline/i,
    message: 'Le modèle d’IA a mis trop de temps à répondre. Relancez l’opération.',
  },
  {
    test: /DB update failed|supabase|database|violates|jsonb/i,
    message: 'L’enregistrement du résultat a échoué. Relancez l’opération.',
  },
];

/** Indices d’un message technique (non rédigé pour l’utilisateur). */
const TECHNICAL_HINT_RE =
  /\b[A-Za-z]*Error\b|\bAI_[A-Za-z]+|ECONN|ENOTFOUND|fetch failed|\bHTTP \d{3}\b|\bstatus code\b|stack|undefined|null|JSON|\bat [\w.]+ \(/;

export function toUserFacingWorkflowErrorMessage(raw: string | null | undefined): string {
  const original = raw?.trim() ?? '';
  if (!original) return WORKFLOW_TECHNICAL_FAILURE_MESSAGE;

  const wasStepFailure = STEP_RETRY_PREFIX_RE.test(original);
  const hadMarker = readStepKeyFromMessage(original) !== undefined;
  const message = stripStepKeyMarker(original.replace(STEP_RETRY_PREFIX_RE, '')).trim();

  for (const known of KNOWN_FAILURES) {
    if (known.test.test(message)) return known.message;
  }

  if (wasStepFailure || hadMarker || TECHNICAL_HINT_RE.test(message)) {
    return WORKFLOW_TECHNICAL_FAILURE_MESSAGE;
  }
  return message;
}

/**
 * Clé d’étape effective : la clé persistée, sinon celle du marqueur dans le message
 * (`unknown` quand la propriété a été perdue au passage step → workflow).
 */
export function resolveWorkflowErrorStepKey(
  stepKey: string | null | undefined,
  message: string | null | undefined,
): string | null {
  if (stepKey && stepKey !== 'unknown') return stepKey;
  return readStepKeyFromMessage(message) ?? null;
}
