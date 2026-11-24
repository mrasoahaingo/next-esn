import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mocks par factory : Clerk et supabase-js ne sont jamais chargés.
vi.mock('@/lib/utils/auth', () => ({ requireOrgId: vi.fn(), requireOrgAdmin: vi.fn() }));
vi.mock('@/lib/utils/supabase', () => ({ getSupabase: vi.fn() }));

import { requireOrgAdmin, requireOrgId } from '@/lib/utils/auth';
import { getSupabase } from '@/lib/utils/supabase';
import { GET, PUT } from '@/app/api/prospection/settings/route';

const mockedRequireOrgId = vi.mocked(requireOrgId);
const mockedRequireOrgAdmin = vi.mocked(requireOrgAdmin);
const mockedGetSupabase = vi.mocked(getSupabase);

type Result = { data: unknown; error: unknown };

/** Faux client supabase chaînable qui enregistre chaque appel. */
function createFakeSupabase(result: Result) {
  const calls = {
    from: [] as unknown[][],
    select: [] as unknown[][],
    eq: [] as unknown[][],
    upsert: [] as unknown[][],
    maybeSingle: 0,
    single: 0,
  };
  const builder = {
    select: (...args: unknown[]) => {
      calls.select.push(args);
      return builder;
    },
    eq: (...args: unknown[]) => {
      calls.eq.push(args);
      return builder;
    },
    upsert: (...args: unknown[]) => {
      calls.upsert.push(args);
      return builder;
    },
    maybeSingle: async () => {
      calls.maybeSingle += 1;
      return result;
    },
    single: async () => {
      calls.single += 1;
      return result;
    },
  };
  const client = {
    from: (...args: unknown[]) => {
      calls.from.push(args);
      return builder;
    },
  };
  return { client, calls };
}

function useFakeSupabase(result: Result) {
  const fake = createFakeSupabase(result);
  mockedGetSupabase.mockReturnValue(fake.client as unknown as ReturnType<typeof getSupabase>);
  return fake;
}

function putRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/prospection/settings', {
    method: 'PUT',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

function adminContext(orgId: string) {
  return {
    orgId,
    userId: 'user_admin',
    orgRole: 'org:admin',
    isSuperAdmin: false,
    has: () => true,
  } as unknown as Awaited<ReturnType<typeof requireOrgAdmin>>;
}

beforeEach(() => {
  mockedRequireOrgId.mockReset();
  mockedRequireOrgAdmin.mockReset();
  mockedGetSupabase.mockReset();
});

describe('PUT /api/prospection/settings', () => {
  it('renvoie 403 pour un non-admin, sans aucun appel Supabase', async () => {
    mockedRequireOrgAdmin.mockRejectedValue(
      NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 }),
    );
    const res = await PUT(putRequest({ heat_threshold: 70 }));
    expect(res.status).toBe(403);
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it('renvoie 400 pour une valeur hors bornes, sans aucun appel Supabase', async () => {
    mockedRequireOrgAdmin.mockResolvedValue(adminContext('org_a'));
    const res = await PUT(putRequest({ heat_threshold: 150 }));
    expect(res.status).toBe(400);
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it('renvoie 400 pour un JSON invalide', async () => {
    mockedRequireOrgAdmin.mockResolvedValue(adminContext('org_a'));
    const res = await PUT(putRequest('{pas du json'));
    expect(res.status).toBe(400);
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it('upsert sur l’org de la session même si le corps porte un org_id étranger', async () => {
    mockedRequireOrgAdmin.mockResolvedValue(adminContext('org_a'));
    const fake = useFakeSupabase({
      data: { org_id: 'org_a', heat_threshold: 70, updated_at: '2026-11-24T14:00:00.000Z' },
      error: null,
    });

    const res = await PUT(putRequest({ heat_threshold: 70, org_id: 'org_other' }));

    expect(res.status).toBe(200);
    expect(fake.calls.from).toEqual([['prospection_settings']]);
    expect(fake.calls.upsert).toHaveLength(1);
    const [row, options] = fake.calls.upsert[0] as [Record<string, unknown>, unknown];
    expect(row.org_id).toBe('org_a');
    expect(row.heat_threshold).toBe(70);
    expect(typeof row.updated_at).toBe('string');
    expect(row).not.toHaveProperty('created_at');
    expect(options).toEqual({ onConflict: 'org_id' });
    expect(fake.calls.single).toBe(1);

    expect(await res.json()).toEqual({
      heat_threshold: 70,
      is_default: false,
      updated_at: '2026-11-24T14:00:00.000Z',
    });
  });

  it('renvoie 500 si Supabase renvoie une erreur', async () => {
    mockedRequireOrgAdmin.mockResolvedValue(adminContext('org_a'));
    useFakeSupabase({ data: null, error: new Error('boom') });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await PUT(putRequest({ heat_threshold: 70 }));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
    errorSpy.mockRestore();
  });
});

describe('GET /api/prospection/settings', () => {
  it('renvoie 401 quand requireOrgId refuse', async () => {
    mockedRequireOrgId.mockRejectedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockedGetSupabase).not.toHaveBeenCalled();
  });

  it('renvoie le défaut 60 sans créer de ligne quand rien n’est enregistré', async () => {
    mockedRequireOrgId.mockResolvedValue('org_a');
    const fake = useFakeSupabase({ data: null, error: null });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ heat_threshold: 60, is_default: true });
    expect(fake.calls.from).toEqual([['prospection_settings']]);
    expect(fake.calls.eq).toEqual([['org_id', 'org_a']]);
    expect(fake.calls.upsert).toHaveLength(0);
  });

  it('renvoie la valeur enregistrée pour l’org de la session', async () => {
    mockedRequireOrgId.mockResolvedValue('org_a');
    useFakeSupabase({ data: { heat_threshold: 80 }, error: null });

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ heat_threshold: 80, is_default: false });
  });
});
