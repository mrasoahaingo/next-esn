// ─── Émetteur coalescent pour les flux de workflow ───────────────────────────
//
// Certains modèles livrent leur sortie structurée en centaines de partiels minuscules
// (mesuré : 646 partiels pour 833 tokens). Écrire un instantané complet dans le flux
// persistant du workflow à chaque partiel rend la branche plus lente que le modèle.
// Cet émetteur découple la cadence d'écriture de la granularité des partiels : au plus
// une émission par fenêtre de `intervalMs`, plus une émission finale garantie (`flush`).
//
// `emit` doit prendre son instantané au moment où il est appelé (pas au moment de la
// demande) : une émission différée publie donc toujours l'état le plus récent.

export type CoalescingEmitterOptions = {
  /** Écrit l'état courant (une ligne NDJSON). Jamais appelé en parallèle avec lui-même. */
  emit: () => Promise<void>;
  /** Fenêtre minimale entre deux débuts d'émission (défaut 300 ms). */
  intervalMs?: number;
  /** Horloge (défaut `Date.now`). */
  now?: () => number;
  /** Programme `fn` dans `ms` ms et renvoie une fonction d'annulation (défaut `setTimeout`). */
  schedule?: (fn: () => void, ms: number) => () => void;
};

export type CoalescingEmitter = {
  /**
   * Demande une émission : immédiate si la précédente a commencé il y a au moins
   * `intervalMs` et qu'aucune n'est en cours, sinon une seule émission différée est
   * programmée (jamais deux en attente). Rejette si l'émission immédiate échoue ou si une
   * émission différée précédente a échoué.
   */
  request: () => Promise<void>;
  /**
   * Annule l'émission différée éventuelle, attend l'émission en cours puis émet l'état
   * courant. À appeler en fin de branche / de run et avant toute écriture terminale.
   * Rejette si cette émission échoue ou si une émission différée précédente a échoué.
   */
  flush: () => Promise<void>;
  /** Annule l'émission différée et ignore toute demande ultérieure (writer libéré). */
  close: () => void;
};

const defaultSchedule = (fn: () => void, ms: number): (() => void) => {
  const handle = setTimeout(fn, ms);
  return () => clearTimeout(handle);
};

export function createCoalescingEmitter(options: CoalescingEmitterOptions): CoalescingEmitter {
  const { emit, intervalMs = 300, now = Date.now, schedule = defaultSchedule } = options;

  /** File sérielle des émissions : garantit l'absence de chevauchement et l'ordre. */
  let chain: Promise<void> = Promise.resolve();
  let inFlight = 0;
  let lastEmitAt = Number.NEGATIVE_INFINITY;
  let cancelScheduled: (() => void) | null = null;
  let deferredError: { error: unknown } | null = null;
  let closed = false;

  const enqueueEmit = (): Promise<void> => {
    const runEmit = async (): Promise<void> => {
      lastEmitAt = now();
      try {
        await emit();
      } finally {
        inFlight--;
      }
    };
    // File vide : l'émission démarre de façon synchrone (instantané pris tout de suite) ;
    // sinon elle passe après celle en cours.
    const idle = inFlight === 0;
    inFlight++;
    const run = idle ? runEmit() : chain.then(runEmit);
    chain = run.catch(() => {});
    return run;
  };

  const throwDeferredError = (): void => {
    if (deferredError) {
      const { error } = deferredError;
      deferredError = null;
      throw error;
    }
  };

  const cancelPending = (): void => {
    if (cancelScheduled) {
      cancelScheduled();
      cancelScheduled = null;
    }
  };

  const request = async (): Promise<void> => {
    if (closed) return;
    throwDeferredError();
    if (cancelScheduled) return;

    const elapsed = now() - lastEmitAt;
    if (inFlight === 0 && elapsed >= intervalMs) {
      await enqueueEmit();
      return;
    }

    const delay = Math.max(0, intervalMs - elapsed);
    cancelScheduled = schedule(() => {
      cancelScheduled = null;
      if (closed) return;
      // Enfilée de façon synchrone : un flush() ultérieur passe forcément après elle.
      enqueueEmit().catch((error: unknown) => {
        if (!deferredError) deferredError = { error };
      });
    }, delay);
  };

  const flush = async (): Promise<void> => {
    if (closed) return;
    cancelPending();
    throwDeferredError();
    await enqueueEmit();
    // Une émission différée lancée avant ce flush a pu échouer pendant l'attente.
    throwDeferredError();
  };

  const close = (): void => {
    closed = true;
    cancelPending();
  };

  return { request, flush, close };
}
