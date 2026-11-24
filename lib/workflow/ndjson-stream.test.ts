import { describe, expect, it } from 'vitest';
import { readNdjsonStream } from '@/lib/workflow/ndjson-stream';
import { testStream } from '@/lib/workflow/__test-utils__/streams';

const line = (o: unknown) => JSON.stringify(o) + '\n';

describe('readNdjsonStream', () => {
  it('émet chaque ligne complète et compte les lignes (= chunks workflow)', async () => {
    const seen: unknown[] = [];
    const res = await readNdjsonStream<{ a: number }, { phase: string }>(
      testStream([line({ index: 0, data: { a: 1 }, meta: { phase: 'x' } }), line({ index: 1, data: { a: 2 } })]),
      { onChunk: (c) => seen.push(c) },
    );
    expect(res).toEqual({ end: { kind: 'eof' }, lines: 2 });
    expect(seen).toEqual([{ data: { a: 1 }, meta: { phase: 'x' } }, { data: { a: 2 } }]);
  });

  it('recolle une ligne découpée sur plusieurs paquets réseau', async () => {
    const full = line({ data: { a: 42 } });
    const seen: unknown[] = [];
    const res = await readNdjsonStream(testStream([full.slice(0, 5), full.slice(5)]), {
      onChunk: (c) => seen.push(c),
    });
    expect(res.lines).toBe(1);
    expect(seen).toEqual([{ data: { a: 42 } }]);
  });

  it('ne compte pas une ligne tronquée par une coupure réseau (le serveur la renverra)', async () => {
    const partial = line({ data: { a: 2 } }).slice(0, 8);
    const res = await readNdjsonStream(testStream([line({ data: { a: 1 } }), partial], 'error'), {
      onChunk: () => {},
    });
    expect(res.end.kind).toBe('transport-error');
    expect(res.lines).toBe(1);
  });

  it('ignore un reste non JSON à la fin propre du corps', async () => {
    const res = await readNdjsonStream(testStream([line({ data: {} }), '{"data":']), {
      onChunk: () => {},
    });
    expect(res).toEqual({ end: { kind: 'eof' }, lines: 1 });
  });

  it('remonte la ligne d’erreur du workflow avec sa clé d’étape', async () => {
    const res = await readNdjsonStream(
      testStream([line({ data: {} }), line({ error: 'boom', stepKey: 'skills' })], 'hang'),
      { onChunk: () => {} },
    );
    expect(res.end).toEqual({ kind: 'error-line', message: 'boom', stepKey: 'skills' });
    expect(res.lines).toBe(2);
  });

  it('détecte une connexion muette (aucun octet pendant idleTimeoutMs)', async () => {
    const res = await readNdjsonStream(testStream([line({ data: {} })], 'hang'), {
      onChunk: () => {},
      idleTimeoutMs: 20,
    });
    expect(res).toEqual({ end: { kind: 'idle' }, lines: 1 });
  });

  it('s’arrête sur abort', async () => {
    const ac = new AbortController();
    const p = readNdjsonStream(testStream([], 'hang'), { onChunk: () => {}, signal: ac.signal });
    ac.abort();
    expect((await p).end.kind).toBe('aborted');
  });
});
