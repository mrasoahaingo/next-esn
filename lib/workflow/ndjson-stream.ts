/**
 * Lecture d’un flux NDJSON de workflow (une ligne = un `writer.write` côté workflow = un index
 * de chunk côté workflow-server). Logique pure : aucun import React.
 *
 * Compter les lignes complètes reçues donne donc la position exacte de reprise
 * (`startIndex`) si la connexion navigateur ↔ route Next est coupée.
 */

export type NdjsonChunk<T, M> = {
  data?: Partial<T>;
  meta?: M;
};

export type NdjsonReadEnd =
  /** Fin propre du corps HTTP (ne prouve PAS que le run est terminé : la fonction a pu être coupée). */
  | { kind: 'eof' }
  /** Ligne `{ error, stepKey? }` écrite par `handleWorkflowError` : échec réel du run. */
  | { kind: 'error-line'; message: string; stepKey?: string }
  /** Aucun octet reçu pendant `idleTimeoutMs` : connexion possiblement morte sans fermeture. */
  | { kind: 'idle' }
  | { kind: 'aborted' }
  /** Erreur réseau / corps tronqué (`TypeError: network error`, `terminated`, …). */
  | { kind: 'transport-error'; error: unknown };

export type NdjsonReadResult = {
  end: NdjsonReadEnd;
  /** Nombre de lignes complètes reçues (= nombre de chunks workflow consommés). */
  lines: number;
};

type RawLine = {
  data?: unknown;
  meta?: unknown;
  error?: unknown;
  stepKey?: unknown;
};

type GuardedRead =
  | { type: 'read'; result: ReadableStreamReadResult<Uint8Array> }
  | { type: 'error'; error: unknown }
  | { type: 'idle' }
  | { type: 'aborted' };

function readWithGuards(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal: AbortSignal | undefined,
  idleTimeoutMs: number | undefined,
): Promise<GuardedRead> {
  return new Promise<GuardedRead>((resolve) => {
    if (signal?.aborted) {
      resolve({ type: 'aborted' });
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      resolve({ type: 'aborted' });
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (idleTimeoutMs !== undefined && idleTimeoutMs > 0) {
      timer = setTimeout(() => {
        cleanup();
        resolve({ type: 'idle' });
      }, idleTimeoutMs);
    }
    reader.read().then(
      (result) => {
        cleanup();
        resolve({ type: 'read', result });
      },
      (error: unknown) => {
        cleanup();
        resolve(signal?.aborted ? { type: 'aborted' } : { type: 'error', error });
      },
    );
  });
}

/**
 * Consomme un corps NDJSON jusqu’à : fin du corps, ligne d’erreur, inactivité, abandon ou erreur
 * réseau. N’émet que des lignes complètes ; une ligne tronquée par une coupure n’est ni traitée
 * ni comptée (le serveur la renverra en entier à la reprise).
 */
export async function readNdjsonStream<T, M>(
  body: ReadableStream<Uint8Array>,
  options: {
    onChunk: (chunk: NdjsonChunk<T, M>) => void;
    signal?: AbortSignal;
    idleTimeoutMs?: number;
  },
): Promise<NdjsonReadResult> {
  const { onChunk, signal, idleTimeoutMs } = options;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lines = 0;

  /** Retourne une fin `error-line` si la ligne porte une erreur de run, sinon null. */
  const handleParsed = (parsed: RawLine): NdjsonReadEnd | null => {
    if (typeof parsed.error === 'string') {
      return {
        kind: 'error-line',
        message: parsed.error,
        ...(typeof parsed.stepKey === 'string' ? { stepKey: parsed.stepKey } : {}),
      };
    }
    onChunk({
      ...(parsed.data !== undefined ? { data: parsed.data as Partial<T> } : {}),
      ...(parsed.meta !== undefined ? { meta: parsed.meta as M } : {}),
    });
    return null;
  };

  const parse = (raw: string): RawLine | null => {
    try {
      const value: unknown = JSON.parse(raw);
      return value && typeof value === 'object' ? (value as RawLine) : null;
    } catch {
      return null;
    }
  };

  let end: NdjsonReadEnd;
  try {
    for (;;) {
      const step = await readWithGuards(reader, signal, idleTimeoutMs);
      if (step.type === 'aborted') {
        end = { kind: 'aborted' };
        break;
      }
      if (step.type === 'idle') {
        end = { kind: 'idle' };
        break;
      }
      if (step.type === 'error') {
        end = { kind: 'transport-error', error: step.error };
        break;
      }

      const { done, value } = step.result;
      if (done) {
        buffer += decoder.decode();
        const rest = buffer.trim();
        // Reste sans « \n » final : uniquement s’il s’agit d’un JSON complet (sinon ligne tronquée).
        const parsed = rest ? parse(rest) : null;
        if (parsed) {
          lines++;
          const errEnd = handleParsed(parsed);
          if (errEnd) {
            end = errEnd;
            break;
          }
        }
        end = { kind: 'eof' };
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';

      let errEnd: NdjsonReadEnd | null = null;
      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        // Une ligne complète = un chunk livré, même illisible : elle compte pour la reprise.
        lines++;
        const parsed = parse(trimmed);
        if (!parsed) continue;
        errEnd = handleParsed(parsed);
        if (errEnd) break;
      }
      if (errEnd) {
        end = errEnd;
        break;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  return { end, lines };
}
