import { describe, expect, it } from 'vitest';
import {
  followWorkflowRun,
  workflowStreamBackoffMs,
  workflowStreamResumeUrl,
} from '@/lib/workflow/follow-workflow-run';
import { testStream } from '@/lib/workflow/__test-utils__/streams';

const line = (o: unknown) => JSON.stringify(o) + '\n';
const snap = (n: number) => line({ index: n, data: { n } });

function ndjson(body: ReadableStream<Uint8Array>): Response {
  return new Response(body, { headers: { 'Content-Type': 'application/x-ndjson' } });
}
function terminal(status = 'completed'): Response {
  return Response.json({ status });
}

/** fetch simulé : renvoie les réponses dans l’ordre et mémorise les URL demandées. */
function scriptedFetch(responses: Array<Response | Error>) {
  const urls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    urls.push(String(input));
    const next = responses.shift();
    if (!next) throw new Error('fetch inattendu');
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
  return { impl, urls };
}

const noSleep = async () => {};

describe('followWorkflowRun', () => {
  it('reprend après une coupure du flux à l’index exact des lignes reçues, jusqu’au statut terminal', async () => {
    // Symptôme prod : le flux du POST s’arrête après 2 lignes alors que le run continue.
    const { impl, urls } = scriptedFetch([
      ndjson(testStream([snap(2), snap(3)])),
      terminal('completed'),
    ]);
    const seen: unknown[] = [];
    const out = await followWorkflowRun({
      runId: 'run_1',
      initialBody: testStream([snap(0), snap(1)]),
      signal: new AbortController().signal,
      onChunk: (c) => seen.push(c.data),
      fetchImpl: impl,
      sleep: noSleep,
    });
    expect(urls).toEqual([
      '/api/workflow/run_1/stream?startIndex=2',
      '/api/workflow/run_1/stream?startIndex=4',
    ]);
    expect(seen).toEqual([{ n: 0 }, { n: 1 }, { n: 2 }, { n: 3 }]);
    expect(out).toEqual({ kind: 'finished', linesConsumed: 4, confirmedByServer: true });
  });

  it('ne conclut jamais « terminé » sur une simple fin de corps HTTP', async () => {
    const { impl } = scriptedFetch([
      ndjson(testStream([])), // run encore « running », flux déjà fermé : aucune ligne
      ndjson(testStream([])),
      terminal('completed'),
    ]);
    const out = await followWorkflowRun({
      runId: 'r',
      initialBody: testStream([snap(0)]),
      signal: new AbortController().signal,
      onChunk: () => {},
      fetchImpl: impl,
      sleep: noSleep,
    });
    expect(out.kind).toBe('finished');
  });

  it('se reconnecte après une erreur réseau sur le corps', async () => {
    const { impl, urls } = scriptedFetch([ndjson(testStream([snap(1)])), terminal()]);
    const out = await followWorkflowRun({
      runId: 'r',
      initialBody: testStream([snap(0)], 'error'),
      signal: new AbortController().signal,
      onChunk: () => {},
      fetchImpl: impl,
      sleep: noSleep,
    });
    expect(urls[0]).toBe('/api/workflow/r/stream?startIndex=1');
    expect(out).toMatchObject({ kind: 'finished', linesConsumed: 2 });
  });

  it('rouvre une connexion restée muette (idle) sans la compter comme un échec', async () => {
    const { impl, urls } = scriptedFetch([ndjson(testStream([snap(1)])), terminal()]);
    const out = await followWorkflowRun({
      runId: 'r',
      initialBody: testStream([snap(0)], 'hang'),
      signal: new AbortController().signal,
      onChunk: () => {},
      fetchImpl: impl,
      sleep: noSleep,
      idleTimeoutMs: 15,
    });
    expect(urls).toEqual(['/api/workflow/r/stream?startIndex=1', '/api/workflow/r/stream?startIndex=2']);
    expect(out.kind).toBe('finished');
  });

  it('remonte l’échec du run quand le flux porte la ligne d’erreur', async () => {
    const { impl, urls } = scriptedFetch([]);
    const out = await followWorkflowRun({
      runId: 'r',
      initialBody: testStream([snap(0), line({ error: 'No output generated', stepKey: 'gaps' })]),
      signal: new AbortController().signal,
      onChunk: () => {},
      fetchImpl: impl,
      sleep: noSleep,
    });
    expect(urls).toEqual([]);
    expect(out).toEqual({ kind: 'failed', message: 'No output generated', stepKey: 'gaps', linesConsumed: 2 });
  });

  it('traite un run introuvable (404) comme terminé : l’état persisté fait foi', async () => {
    const { impl } = scriptedFetch([Response.json({ error: 'Run not found' }, { status: 404 })]);
    const out = await followWorkflowRun({
      runId: 'r',
      signal: new AbortController().signal,
      onChunk: () => {},
      fetchImpl: impl,
      sleep: noSleep,
    });
    expect(out.kind).toBe('finished');
  });

  it('réessaie sur erreur HTTP / réseau avec backoff, puis abandonne le suivi (lost)', async () => {
    const delays: number[] = [];
    const { impl } = scriptedFetch([
      new TypeError('Failed to fetch'),
      Response.json({ error: 'boom' }, { status: 500 }),
      new TypeError('Failed to fetch'),
    ]);
    const out = await followWorkflowRun({
      runId: 'r',
      signal: new AbortController().signal,
      onChunk: () => {},
      fetchImpl: impl,
      sleep: async (ms) => {
        delays.push(ms);
      },
      maxConsecutiveFailures: 3,
    });
    expect(delays).toEqual([1000, 2000]);
    expect(out.kind).toBe('lost');
  });

  it('nudge : interrompt une lecture muette pour revérifier immédiatement le statut', async () => {
    const nudge: { current: (() => void) | null } = { current: null };
    const { impl, urls } = scriptedFetch([terminal('completed')]);
    const p = followWorkflowRun({
      runId: 'r',
      initialBody: testStream([snap(0)], 'hang'),
      signal: new AbortController().signal,
      onChunk: () => {},
      nudge,
      fetchImpl: impl,
      sleep: noSleep,
      idleTimeoutMs: 60_000,
    });
    await new Promise((r) => setTimeout(r, 5));
    expect(nudge.current).toBeTypeOf('function');
    nudge.current?.();
    const out = await p;
    expect(urls).toEqual(['/api/workflow/r/stream?startIndex=1']);
    expect(out.kind).toBe('finished');
  });

  it('abort global : arrête sans autre requête', async () => {
    const ac = new AbortController();
    const { impl, urls } = scriptedFetch([]);
    const p = followWorkflowRun({
      runId: 'r',
      initialBody: testStream([], 'hang'),
      signal: ac.signal,
      onChunk: () => {},
      fetchImpl: impl,
      sleep: noSleep,
    });
    ac.abort();
    expect((await p).kind).toBe('aborted');
    expect(urls).toEqual([]);
  });
});

describe('helpers', () => {
  it('workflowStreamResumeUrl encode le runId et borne l’index', () => {
    expect(workflowStreamResumeUrl('a/b', -3)).toBe('/api/workflow/a%2Fb/stream?startIndex=0');
  });
  it('workflowStreamBackoffMs plafonne à 15 s', () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(workflowStreamBackoffMs)).toEqual([0, 1000, 2000, 4000, 8000, 15000, 15000]);
  });
});
