import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Contrat statique de la migration *_drop_radar.sql (quick 261124-lfg).
// Elle supprime les objets du radar retiré, sans CASCADE et sans toucher pgvector
// ni aucune table conservée. Les commentaires SQL sont retirés avant l'analyse.

const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

const RADAR_TABLES = [
  'radar_companies',
  'radar_signals',
  'radar_prospect_scores',
  'radar_consultants',
  'radar_matches',
  'radar_actions',
  'radar_run_logs',
  'radar_org_settings',
] as const;

const RADAR_TYPES = [
  'signal_source',
  'heat_level',
  'availability_status',
  'action_type',
  'action_outcome',
  'radar_source',
] as const;

const KEPT_TABLES = ['candidates', 'missions', 'positionings', 'org_settings'] as const;

function findDropRadarFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('_drop_radar.sql'));
}

function stripSqlComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const idx = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');
}

function loadStatements(): string[] {
  const [file] = findDropRadarFiles();
  const sql = stripSqlComments(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  return sql
    .split(';')
    .map((stmt) => stmt.replace(/\s+/g, ' ').trim())
    .filter((stmt) => stmt.length > 0);
}

function indexOfStatement(statements: string[], pattern: RegExp): number {
  return statements.findIndex((stmt) => pattern.test(stmt));
}

describe('migration drop_radar', () => {
  it('existe en un seul exemplaire avec un timestamp de 14 chiffres', () => {
    const files = findDropRadarFiles();
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{14}_drop_radar\.sql$/);
  });

  it('ne contient que des DROP ... IF EXISTS sur des noms qualifiés public.', () => {
    const statements = loadStatements();
    expect(statements.length).toBeGreaterThan(0);
    for (const stmt of statements) {
      expect(stmt).toMatch(/^DROP (TABLE|TYPE|FUNCTION) IF EXISTS public\.[a-z_]+/i);
    }
  });

  it('supprime les 8 tables radar, et uniquement des tables public.radar_*', () => {
    const statements = loadStatements();
    const droppedTables = statements
      .map((stmt) => /^DROP TABLE IF EXISTS public\.([a-z_]+)$/i.exec(stmt)?.[1])
      .filter((name): name is string => Boolean(name));
    expect([...droppedTables].sort()).toEqual([...RADAR_TABLES].sort());
    for (const name of droppedTables) {
      expect(name.startsWith('radar_')).toBe(true);
    }
  });

  it('supprime les 6 types radar', () => {
    const statements = loadStatements();
    const droppedTypes = statements
      .map((stmt) => /^DROP TYPE IF EXISTS public\.([a-z_]+)$/i.exec(stmt)?.[1])
      .filter((name): name is string => Boolean(name));
    expect([...droppedTypes].sort()).toEqual([...RADAR_TYPES].sort());
  });

  it('supprime match_consultants avec sa signature complète', () => {
    const statements = loadStatements();
    expect(statements).toContain(
      'DROP FUNCTION IF EXISTS public.match_consultants(vector, text, double precision, integer)',
    );
  });

  it('supprime la fonction et toutes les tables avant le premier DROP TYPE', () => {
    const statements = loadStatements();
    const firstType = indexOfStatement(statements, /^DROP TYPE /i);
    const fn = indexOfStatement(statements, /^DROP FUNCTION IF EXISTS public\.match_consultants\(/i);
    expect(firstType).toBeGreaterThan(-1);
    expect(fn).toBeGreaterThan(-1);
    expect(fn).toBeLessThan(firstType);
    for (const table of RADAR_TABLES) {
      const idx = indexOfStatement(statements, new RegExp(`^DROP TABLE IF EXISTS public\\.${table}$`, 'i'));
      expect(idx, table).toBeGreaterThan(-1);
      expect(idx, table).toBeLessThan(firstType);
    }
  });

  it('respecte l’ordre des clés étrangères (enfants avant parents)', () => {
    const statements = loadStatements();
    const pos = (table: string): number =>
      indexOfStatement(statements, new RegExp(`^DROP TABLE IF EXISTS public\\.${table}$`, 'i'));
    const companies = pos('radar_companies');
    for (const child of ['radar_matches', 'radar_signals', 'radar_prospect_scores', 'radar_actions']) {
      expect(pos(child), child).toBeLessThan(companies);
    }
    expect(pos('radar_matches')).toBeLessThan(pos('radar_consultants'));
  });

  it('n’utilise ni CASCADE, ni DROP EXTENSION, ni instruction d’écriture', () => {
    const [file] = findDropRadarFiles();
    const sql = stripSqlComments(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    expect(sql).not.toMatch(/\bCASCADE\b/i);
    expect(sql).not.toMatch(/\bDROP\s+EXTENSION\b/i);
    expect(sql).not.toMatch(/\b(CREATE|ALTER|INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
  });

  it('ne cite aucune table conservée', () => {
    const [file] = findDropRadarFiles();
    const sql = stripSqlComments(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    for (const table of KEPT_TABLES) {
      expect(sql).not.toMatch(new RegExp(`public\\.${table}\\b`, 'i'));
      expect(sql).not.toMatch(new RegExp(`(^|[^a-z_])${table}([^a-z_]|$)`, 'i'));
    }
  });
});
