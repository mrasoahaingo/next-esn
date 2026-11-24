import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** Contrat de la migration de bascule vers openai/gpt-6-luna (quick 261124-mk0). */

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'supabase', 'migrations');
const SUFFIX = '_llm_models_gpt6_luna.sql';

const allFiles = readdirSync(MIGRATIONS_DIR);
const matches = allFiles.filter((f) => f.endsWith(SUFFIX));
const fileName = matches[0] ?? '';
const sql = fileName
  ? readFileSync(path.join(MIGRATIONS_DIR, fileName), 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
  : '';

describe('migration llm_models_gpt6_luna', () => {
  it('existe en un seul exemplaire', () => {
    expect(matches).toHaveLength(1);
  });

  it('insère le modèle de façon idempotente et repointe tâches et surcharges', () => {
    expect(sql).toContain("'openai/gpt-6-luna'");
    expect(sql).toContain('ON CONFLICT (gateway_model_id) DO NOTHING');
    expect(sql).toContain('UPDATE llm_tasks');
    expect(sql).toContain('UPDATE llm_task_org_overrides');
    expect(sql).toContain('model_id IS NOT NULL');
    expect(sql).toContain('IS DISTINCT FROM');
  });

  it('ne supprime rien et ne touche pas aux prompts', () => {
    expect(sql).not.toMatch(/\bDELETE\b/i);
    expect(sql).not.toMatch(/\bDROP\b/i);
    expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    expect(sql).not.toContain('system_prompt_template');
  });

  it('est la plus récente des migrations horodatées', () => {
    const ts = (f: string): string | undefined => /^(\d{14})_/.exec(f)?.[1];
    const own = ts(fileName);
    expect(own).toBeDefined();
    const others = allFiles.filter((f) => f !== fileName).map(ts).filter((t): t is string => !!t);
    expect(others.length).toBeGreaterThan(0);
    for (const other of others) expect(own! > other).toBe(true);
  });
});
