/**
 * Formatage et log uniformes des échecs d'écriture Supabase.
 *
 * `supabase-js` ne lève pas : il renvoie `{ error }`. Un appel dont la valeur de retour n'est
 * jamais lue perd son échec en silence. Cet utilitaire donne à tous les sites d'écriture la
 * MÊME forme de log que les 4 `handleWorkflowError` (workflows/positioning-analyze.ts) :
 * table, identifiant de ligne, opération, message Supabase.
 *
 * Contrainte de sécurité (T-seo-01, prolonge T-ksd-02) : aucune valeur métier écrite
 * (`tailored_cv`, `enrichment_data`, emails, payloads) ne doit entrer dans le log. La fonction
 * ne recopie donc qu'une liste FERMÉE de clés — toute clé supplémentaire portée par `context`
 * est ignorée.
 *
 * Aucun import : logique pure, testable isolément.
 */

export type SupabaseWriteErrorContext = {
  /** Table Supabase visée par l'écriture. */
  table: string;
  /** Identifiant de la ligne visée ; `'unknown'` dans le log s'il est absent. */
  recordId?: string | null;
  /**
   * Chaîne stable identifiant le site d'appel (ex. `'positioning.export.update'`).
   * Joue le même rôle diagnostique que `stepKey` dans `handleWorkflowError`.
   */
  operation: string;
  /** L'objet `error` renvoyé par supabase-js, de forme non garantie. */
  supabaseError: unknown;
};

/** Lit une propriété string non vide sur une valeur de forme inconnue. */
function readStringProp(value: unknown, key: string): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const raw = (value as Record<string, unknown>)[key];
  if (raw === undefined || raw === null) return undefined;
  const asString = typeof raw === 'string' ? raw : String(raw);
  return asString.length > 0 ? asString : undefined;
}

/**
 * Sérialise un `error` Supabase en une seule string diagnostiquable.
 * Ne lève jamais : une structure circulaire retombe sur `String(...)`.
 */
function serializeSupabaseError(supabaseError: unknown): string {
  if (supabaseError === null || supabaseError === undefined) return 'unknown';

  const message = readStringProp(supabaseError, 'message');
  if (message) return message;

  if (typeof supabaseError === 'object') {
    // `String({})` vaut `[object Object]` — inutilisable en diagnostic. On tente JSON d'abord.
    try {
      const serialized = JSON.stringify(supabaseError);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Structure circulaire : on retombe sur String(...) ci-dessous.
    }
  }

  const fallback = String(supabaseError);
  return fallback.length > 0 ? fallback : 'unknown';
}

/**
 * Construit l'objet de log d'un échec d'écriture Supabase.
 * Fonction pure, sans effet de bord. Clés toujours présentes : `table`, `recordId`,
 * `operation`, `supabaseError`. Clés présentes seulement si renseignées par Supabase :
 * `code`, `details`, `hint`.
 */
export function formatSupabaseWriteError(
  context: SupabaseWriteErrorContext,
): Record<string, string> {
  const { table, recordId, operation, supabaseError } = context;

  const formatted: Record<string, string> = {
    table,
    recordId: recordId ?? 'unknown',
    operation,
    supabaseError: serializeSupabaseError(supabaseError),
  };

  for (const key of ['code', 'details', 'hint'] as const) {
    const value = readStringProp(supabaseError, key);
    if (value !== undefined) formatted[key] = value;
  }

  return formatted;
}

/**
 * Point d'entrée des sites best-effort : logue l'échec sans lever et sans valeur de retour.
 * Les sites qui doivent faire échouer leur appelant lèvent eux-mêmes APRÈS avoir appelé ceci.
 */
export function logSupabaseWriteError(context: SupabaseWriteErrorContext): void {
  console.error('supabase write failed', formatSupabaseWriteError(context));
}
