import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCoalescingEmitter } from './throttled-emitter';

/** Émetteur de test : enregistre l'état vu à chaque émission (comme le snapshot sérialisé du workflow). */
function recordingEmitter(state: { value: number }, writeDelayMs = 0) {
  const emitted: number[] = [];
  const emit = async () => {
    // Le snapshot est pris au début de l'émission (comme JSON.stringify avant writer.write).
    emitted.push(state.value);
    if (writeDelayMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, writeDelayMs));
    }
  };
  return { emitted, emit };
}

describe('createCoalescingEmitter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('émet immédiatement la première demande', async () => {
    const state = { value: 1 };
    const { emitted, emit } = recordingEmitter(state);
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    await emitter.request();

    expect(emitted).toEqual([1]);
  });

  it('600 demandes rapprochées → au plus durée / intervalle + 2 émissions', async () => {
    const state = { value: 0 };
    const { emitted, emit } = recordingEmitter(state);
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    const stepMs = 13;
    const count = 600;
    for (let i = 1; i <= count; i++) {
      state.value = i;
      await emitter.request();
      await vi.advanceTimersByTimeAsync(stepMs);
    }
    await emitter.flush();

    const durationMs = count * stepMs;
    expect(emitted.length).toBeLessThanOrEqual(Math.floor(durationMs / 300) + 2);
    // Toujours des mises à jour progressives, pas seulement la finale.
    expect(emitted.length).toBeGreaterThan(10);
    expect(emitted.at(-1)).toBe(count);
  });

  it('branche Luna mesurée (646 partiels en 8 s) → ~28 émissions au lieu de 646', async () => {
    const state = { value: 0 };
    const { emitted, emit } = recordingEmitter(state);
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    const partials = 646;
    const durationMs = 8000;
    let elapsed = 0;
    for (let i = 1; i <= partials; i++) {
      state.value = i;
      await emitter.request();
      const next = Math.round((i * durationMs) / partials);
      await vi.advanceTimersByTimeAsync(next - elapsed);
      elapsed = next;
    }
    await emitter.flush();

    expect(emitted.length).toBeLessThanOrEqual(Math.floor(durationMs / 300) + 2);
    expect(emitted.at(-1)).toBe(partials);
  });

  it('les demandes dans la fenêtre sont regroupées en une seule émission différée', async () => {
    const state = { value: 0 };
    const { emitted, emit } = recordingEmitter(state);
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    state.value = 1;
    await emitter.request(); // t=0 : immédiate
    state.value = 2;
    await emitter.request(); // programmée à t=300
    state.value = 3;
    await emitter.request(); // déjà programmée : rien de plus
    expect(emitted).toEqual([1]);

    await vi.advanceTimersByTimeAsync(299);
    expect(emitted).toEqual([1]);

    await vi.advanceTimersByTimeAsync(1);
    // L'émission différée prend l'état courant au moment où elle part.
    expect(emitted).toEqual([1, 3]);

    await vi.advanceTimersByTimeAsync(5000);
    expect(emitted).toEqual([1, 3]);
  });

  it('flush() émet toujours le dernier état, même dans la fenêtre', async () => {
    const state = { value: 0 };
    const { emitted, emit } = recordingEmitter(state);
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    state.value = 1;
    await emitter.request();
    state.value = 2;
    await emitter.request();
    state.value = 3;
    await emitter.flush();

    expect(emitted).toEqual([1, 3]);
  });

  it('flush() émet même sans demande préalable', async () => {
    const state = { value: 7 };
    const { emitted, emit } = recordingEmitter(state);
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    await emitter.flush();

    expect(emitted).toEqual([7]);
  });

  it("pas d'émission après flush() sans nouvelle demande", async () => {
    const state = { value: 0 };
    const { emitted, emit } = recordingEmitter(state);
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    state.value = 1;
    await emitter.request();
    state.value = 2;
    await emitter.request(); // différée programmée
    await emitter.flush(); // annule la différée

    await vi.advanceTimersByTimeAsync(10_000);
    expect(emitted).toEqual([1, 2]);
  });

  it('les émissions ne se chevauchent jamais (écriture lente)', async () => {
    const state = { value: 0 };
    let inFlight = 0;
    let maxInFlight = 0;
    const emitted: number[] = [];
    const emit = async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      emitted.push(state.value);
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      inFlight--;
    };
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    state.value = 1;
    const first = emitter.request(); // émission en cours pendant 1 s
    state.value = 2;
    await emitter.request(); // en cours + demande → une seule émission de plus
    state.value = 3;
    await emitter.request();

    await vi.advanceTimersByTimeAsync(5000);
    await first;

    expect(maxInFlight).toBe(1);
    expect(emitted).toEqual([1, 3]);

    state.value = 4;
    const flushed = emitter.flush();
    await vi.advanceTimersByTimeAsync(1000);
    await flushed;
    expect(maxInFlight).toBe(1);
    expect(emitted).toEqual([1, 3, 4]);
  });

  it("flush() attend l'émission différée en cours avant d'émettre l'état final", async () => {
    const state = { value: 0 };
    const order: string[] = [];
    let n = 0;
    const emit = async () => {
      const id = ++n;
      order.push(`start${id}:${state.value}`);
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      order.push(`end${id}`);
    };
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    state.value = 1;
    const p1 = emitter.request();
    await vi.advanceTimersByTimeAsync(100);
    await p1;
    state.value = 2;
    await emitter.request(); // différée à t=300
    await vi.advanceTimersByTimeAsync(250); // t=350 : différée partie, en cours
    state.value = 3;
    const flushed = emitter.flush();
    await vi.advanceTimersByTimeAsync(500);
    await flushed;

    expect(order).toEqual(['start1:1', 'end1', 'start2:2', 'end2', 'start3:3', 'end3']);
  });

  it("propage l'erreur d'une émission immédiate à l'appelant de request()", async () => {
    const emitter = createCoalescingEmitter({
      emit: async () => {
        throw new Error('write failed');
      },
      intervalMs: 300,
    });

    await expect(emitter.request()).rejects.toThrow('write failed');
  });

  it("propage l'erreur de flush() à son appelant", async () => {
    const emitter = createCoalescingEmitter({
      emit: async () => {
        throw new Error('write failed');
      },
      intervalMs: 300,
    });

    await expect(emitter.flush()).rejects.toThrow('write failed');
  });

  it("l'erreur d'une émission différée remonte au prochain flush()", async () => {
    let calls = 0;
    const emitter = createCoalescingEmitter({
      emit: async () => {
        calls++;
        if (calls === 2) throw new Error('deferred write failed');
      },
      intervalMs: 300,
    });

    await emitter.request(); // ok
    await emitter.request(); // différée → échouera
    await vi.advanceTimersByTimeAsync(300);
    expect(calls).toBe(2);

    await expect(emitter.flush()).rejects.toThrow('deferred write failed');
  });

  it("l'erreur d'une émission différée remonte aussi à la demande suivante", async () => {
    let calls = 0;
    const emitter = createCoalescingEmitter({
      emit: async () => {
        calls++;
        if (calls === 2) throw new Error('deferred write failed');
      },
      intervalMs: 300,
    });

    await emitter.request();
    await emitter.request();
    await vi.advanceTimersByTimeAsync(300);

    await expect(emitter.request()).rejects.toThrow('deferred write failed');
    // Remontée une seule fois : l'émetteur reste utilisable ensuite.
    await expect(emitter.flush()).resolves.toBeUndefined();
  });

  it('close() annule la différée et ignore les demandes suivantes', async () => {
    const state = { value: 0 };
    const { emitted, emit } = recordingEmitter(state);
    const emitter = createCoalescingEmitter({ emit, intervalMs: 300 });

    state.value = 1;
    await emitter.request();
    state.value = 2;
    await emitter.request(); // différée
    emitter.close();
    await emitter.request();
    await vi.advanceTimersByTimeAsync(10_000);

    expect(emitted).toEqual([1]);
  });

  it("accepte une horloge et un ordonnanceur injectés", async () => {
    let clock = 0;
    const scheduled: Array<{ at: number; fn: () => void }> = [];
    const emitted: number[] = [];
    const emitter = createCoalescingEmitter({
      emit: async () => {
        emitted.push(clock);
      },
      intervalMs: 300,
      now: () => clock,
      schedule: (fn, ms) => {
        const entry = { at: clock + ms, fn };
        scheduled.push(entry);
        return () => {
          const i = scheduled.indexOf(entry);
          if (i >= 0) scheduled.splice(i, 1);
        };
      },
    });

    await emitter.request();
    clock = 100;
    await emitter.request();
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0].at).toBe(300);

    clock = 300;
    scheduled.shift()!.fn();
    await emitter.flush();
    expect(emitted).toEqual([0, 300, 300]);
  });
});
