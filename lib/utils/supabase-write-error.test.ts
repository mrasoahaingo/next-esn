import { describe, it, expect } from 'vitest';
import { formatSupabaseWriteError } from './supabase-write-error';

describe('formatSupabaseWriteError', () => {
  it('reprend table / recordId / operation et aplatit le message Supabase', () => {
    expect(
      formatSupabaseWriteError({
        table: 'positionings',
        recordId: 'abc',
        operation: 'export.update',
        supabaseError: { message: 'boom' },
      }),
    ).toEqual({
      table: 'positionings',
      recordId: 'abc',
      operation: 'export.update',
      supabaseError: 'boom',
    });
  });

  it('reprend code / details / hint quand ils sont présents, les omet sinon', () => {
    const withAll = formatSupabaseWriteError({
      table: 'missions',
      recordId: 'm1',
      operation: 'workflow.cancel.missions',
      supabaseError: {
        message: 'duplicate key',
        code: '23505',
        details: 'Key (id)=(m1) already exists.',
        hint: 'utiliser upsert',
      },
    });
    expect(withAll).toEqual({
      table: 'missions',
      recordId: 'm1',
      operation: 'workflow.cancel.missions',
      supabaseError: 'duplicate key',
      code: '23505',
      details: 'Key (id)=(m1) already exists.',
      hint: 'utiliser upsert',
    });

    const withNullish = formatSupabaseWriteError({
      table: 'missions',
      recordId: 'm1',
      operation: 'workflow.cancel.missions',
      supabaseError: { message: 'boom', code: undefined, details: null, hint: null },
    });
    expect(Object.keys(withNullish).sort()).toEqual(
      ['operation', 'recordId', 'supabaseError', 'table'].sort(),
    );
  });

  it('remplace un supabaseError null/undefined par "unknown" sans lever', () => {
    expect(
      formatSupabaseWriteError({
        table: 'radar_companies',
        recordId: 'c1',
        operation: 'radar.findOrCreateCompany.refreshName',
        supabaseError: null,
      }).supabaseError,
    ).toBe('unknown');

    expect(
      formatSupabaseWriteError({
        table: 'radar_companies',
        recordId: 'c1',
        operation: 'radar.findOrCreateCompany.refreshName',
        supabaseError: undefined,
      }).supabaseError,
    ).toBe('unknown');
  });

  it('sérialise un supabaseError sans message sans jamais produire "[object Object]" ni lever', () => {
    const fromObject = formatSupabaseWriteError({
      table: 'radar_actions',
      recordId: 'a1',
      operation: 'radar.brief.logAction',
      supabaseError: { status: 500, reason: 'gateway' },
    }).supabaseError;
    expect(fromObject).not.toContain('[object Object]');
    expect(fromObject).toContain('gateway');

    expect(
      formatSupabaseWriteError({
        table: 'radar_actions',
        recordId: 'a1',
        operation: 'radar.brief.logAction',
        supabaseError: 42,
      }).supabaseError,
    ).toBe('42');

    // Structure circulaire : JSON.stringify lèverait, la fonction doit absorber.
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    expect(() =>
      formatSupabaseWriteError({
        table: 'radar_actions',
        recordId: 'a1',
        operation: 'radar.brief.logAction',
        supabaseError: circular,
      }),
    ).not.toThrow();
  });

  it('remplace un recordId null/undefined par "unknown" en gardant la clé', () => {
    const result = formatSupabaseWriteError({
      table: 'missions',
      recordId: null,
      operation: 'missionJobAnalysis.cancel.clearRunId',
      supabaseError: { message: 'boom' },
    });
    expect(result.recordId).toBe('unknown');

    const omitted = formatSupabaseWriteError({
      table: 'missions',
      operation: 'missionJobAnalysis.cancel.clearRunId',
      supabaseError: { message: 'boom' },
    });
    expect(omitted.recordId).toBe('unknown');
  });

  it('ne laisse fuir aucune donnée métier : seules les clés énumérées sont recopiées', () => {
    const result = formatSupabaseWriteError({
      table: 'positionings',
      recordId: 'p1',
      operation: 'positioning.export.update',
      supabaseError: { message: 'boom', code: '23505' },
      // Champs métier volontairement passés en trop : ils ne doivent pas ressortir.
      tailored_cv: { personalInfo: { email: 'candidat@example.com' } },
      enrichment_data: { contacts: ['dsi@example.com'] },
    } as never);

    expect(Object.keys(result).sort()).toEqual(
      ['code', 'operation', 'recordId', 'supabaseError', 'table'].sort(),
    );
    expect(JSON.stringify(result)).not.toContain('example.com');
  });
});
