import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HEAT_THRESHOLD,
  PROSPECTION_COMPANY_STATUSES,
  PROSPECTION_CONTACT_SOURCES,
  PROSPECTION_RUN_STATUSES,
  PROSPECTION_RUN_TRIGGERS,
  PROSPECTION_SIGNAL_SOURCES,
  PROSPECTION_SIGNAL_TYPES,
} from '@/lib/prospection/constants';

/**
 * Contrat statique de la migration du domaine prospection : les phases 10 à 14
 * écrivent dans ces tables sans renégocier le schéma. Ce test garantit les
 * contraintes structurantes (SIREN, RGPD, snapshots de score), l'idempotence
 * et l'alignement des CHECK avec les constantes TypeScript.
 */
const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');
const MIGRATION_SUFFIX = '_prospection_domain.sql';

const PROSPECTION_TABLES = [
  'prospection_settings',
  'prospection_automations',
  'prospection_companies',
  'prospection_run_logs',
  'prospection_signals',
  'prospection_scores',
  'prospection_contacts',
  'prospection_actions',
] as const;

const migrationFiles = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql'));
const prospectionFiles = migrationFiles.filter((file) => file.endsWith(MIGRATION_SUFFIX));
const migrationFile = prospectionFiles[0] ?? '';
const rawSql = migrationFile ? readFileSync(join(MIGRATIONS_DIR, migrationFile), 'utf-8') : '';
/** SQL sans commentaires `--` (aucune chaîne littérale de la migration n'en contient). */
const sql = rawSql.replace(/--.*$/gm, '');

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Valeurs de la liste `IN (...)` d'un CHECK nommé, triées. */
function checkValues(constraintName: string): string[] {
  const pattern = new RegExp(
    `CONSTRAINT\\s+${escapeRegExp(constraintName)}\\s+CHECK\\s*\\(\\s*\\w+\\s+IN\\s*\\(([^)]*)\\)`,
    'i',
  );
  const match = sql.match(pattern);
  if (!match) return [];
  return [...match[1].matchAll(/'([^']*)'/g)].map((value) => value[1]).sort();
}

const sorted = (values: readonly string[]): string[] => [...values].sort();

describe('migration prospection_domain : fichier', () => {
  it('existe en un seul exemplaire avec un timestamp de 14 chiffres', () => {
    expect(prospectionFiles).toHaveLength(1);
    expect(migrationFile).toMatch(/^\d{14}_prospection_domain\.sql$/);
  });

  it('a un préfixe de timestamp partagé par aucune autre migration', () => {
    const prefix = migrationFile.slice(0, 14);
    const sharing = migrationFiles.filter((file) => file.startsWith(prefix));
    expect(sharing).toEqual([migrationFile]);
  });
});

describe('migration prospection_domain : tables et contraintes', () => {
  it.each(PROSPECTION_TABLES)('crée la table %s de façon idempotente', (table) => {
    expect(sql).toMatch(new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${table}\\s*\\(`, 'i'));
  });

  it('garantit un SIREN unique par org avec un format contrôlé (SIG-04)', () => {
    expect(sql).toMatch(
      /CONSTRAINT\s+prospection_companies_org_siren_key\s+UNIQUE\s*\(\s*org_id\s*,\s*siren\s*\)/i,
    );
    expect(sql).toMatch(/CONSTRAINT\s+prospection_companies_siren_format\s+CHECK/i);
  });

  it('rend la provenance et la rétention RGPD obligatoires (CONT-05)', () => {
    expect(sql).toMatch(/contact_source\s+TEXT\s+NOT\s+NULL/i);
    expect(sql).toMatch(/contact_sourced_at\s+TIMESTAMPTZ\s+NOT\s+NULL/i);
    expect(sql).toMatch(/gdpr_retention_expires_at\s+TIMESTAMPTZ\s+NOT\s+NULL/i);
  });

  it.each([
    'signal_last_fetched_at',
    'enrichment_gated_at',
    'justification',
    'call_pitch',
    'synthesis_generated_at',
  ])('porte la colonne %s sur prospection_companies', (column) => {
    expect(sql).toMatch(new RegExp(`\\n\\s*${column}\\s+(TEXT|TIMESTAMPTZ)\\b`, 'i'));
  });

  it("indexe l'historique des scores par entreprise (D-06)", () => {
    expect(sql).toMatch(
      /CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+prospection_scores_company_created_idx\s+ON\s+prospection_scores\s*\(\s*company_id\s*,\s*created_at\s+DESC\s*\)/i,
    );
  });

  it('impose un seul snapshot par entreprise et par run, sans index partiel (D-05)', () => {
    expect(sql).toMatch(
      /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+prospection_scores_company_run_key\s+ON\s+prospection_scores\s*\(\s*company_id\s*,\s*run_id\s*\)\s*;/i,
    );
  });

  it('fixe le seuil de chaleur par défaut à DEFAULT_HEAT_THRESHOLD (CONT-04)', () => {
    const match = sql.match(/heat_threshold\s+SMALLINT\s+NOT\s+NULL\s+DEFAULT\s+(\d+)/i);
    expect(match?.[1]).toBe(String(DEFAULT_HEAT_THRESHOLD));
    expect(DEFAULT_HEAT_THRESHOLD).toBe(60);
  });
});

describe('migration prospection_domain : sûreté de déploiement', () => {
  it.each([
    ['CREATE TYPE', /CREATE\s+TYPE/i],
    ['CONCURRENTLY', /CONCURRENTLY/i],
    ['BEGIN;', /\bBEGIN\s*;/i],
    ['COMMIT;', /\bCOMMIT\s*;/i],
    ['GENERATED ALWAYS', /GENERATED\s+ALWAYS/i],
  ])("n'utilise pas %s", (_label, pattern) => {
    expect(sql).not.toMatch(pattern);
  });

  it('utilise IF NOT EXISTS sur chaque CREATE TABLE / CREATE INDEX', () => {
    const creates = [...sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX)\s+[^\n]*/gi)];
    expect(creates.length).toBeGreaterThan(0);
    for (const statement of creates) {
      expect(statement[0]).toMatch(/IF\s+NOT\s+EXISTS/i);
    }
  });

  it('fait précéder chaque CREATE POLICY du DROP POLICY IF EXISTS correspondant', () => {
    const creates = [...sql.matchAll(/CREATE\s+POLICY[\s\S]*?'([a-z_]+)'\s*\|\|\s*t/gi)];
    expect(creates.map((match) => match[1]).sort()).toEqual(
      ['anon_deny_all_', 'org_delete_', 'org_insert_', 'org_select_', 'org_update_'],
    );
    for (const create of creates) {
      const drop = new RegExp(
        `DROP\\s+POLICY\\s+IF\\s+EXISTS\\s+%I\\s+ON\\s+%I'\\s*,\\s*'${create[1]}'\\s*\\|\\|\\s*t`,
        'i',
      );
      const dropMatch = drop.exec(sql);
      expect(dropMatch, `DROP POLICY manquant pour ${create[1]}`).not.toBeNull();
      expect(dropMatch!.index).toBeLessThan(create.index ?? 0);
    }
  });

  it('active la RLS sur exactement les 8 tables du domaine', () => {
    const match = sql.match(/FOREACH\s+t\s+IN\s+ARRAY\s+ARRAY\s*\[([\s\S]*?)\]\s*LOOP/i);
    expect(match).not.toBeNull();
    const tables = [...(match?.[1] ?? '').matchAll(/'([^']+)'/g)].map((value) => value[1]);
    expect(sorted(tables)).toEqual(sorted(PROSPECTION_TABLES));
    expect(sql).toMatch(/ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
  });
});

describe('migration prospection_domain : alignement CHECK ↔ constantes', () => {
  it.each([
    ['prospection_signals_source_check', PROSPECTION_SIGNAL_SOURCES],
    ['prospection_signals_type_check', PROSPECTION_SIGNAL_TYPES],
    ['prospection_companies_status_check', PROSPECTION_COMPANY_STATUSES],
    ['prospection_actions_status_check', PROSPECTION_COMPANY_STATUSES],
    ['prospection_contacts_source_check', PROSPECTION_CONTACT_SOURCES],
    ['prospection_run_logs_status_check', PROSPECTION_RUN_STATUSES],
    ['prospection_run_logs_trigger_check', PROSPECTION_RUN_TRIGGERS],
  ] as const)('%s liste exactement les valeurs de la constante', (constraint, values) => {
    expect(checkValues(constraint)).toEqual(sorted(values));
  });
});
