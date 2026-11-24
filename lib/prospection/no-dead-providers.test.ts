import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fou anti-réintroduction des fournisseurs morts (audit Phase 9).
 *
 * Proxycurl (Nubela) a fermé et le domaine radar (`lib/radar/`, `app/api/radar/`)
 * a été supprimé par le commit 7ecd35e. Enrich Layer, relance de Nubela, n'est
 * pas retenu. Ce test parcourt toute la racine du dépôt (hors exclusions
 * explicites ci-dessous) et échoue si une référence à ces fournisseurs ou un
 * import du domaine radar réapparaît.
 *
 * Remplaçants : ScrapIn (signaux LinkedIn) + Dropcontact (email).
 * Détail : .planning/phases/09-db-schema-foundation-proxycurl-audit/09-PROXYCURL-AUDIT.md
 *
 * Volontairement un test vitest et non une règle ESLint : une seconde entrée
 * `no-restricted-syntax` en flat config écraserait la règle Supabase existante.
 */

const ROOT = process.cwd();

/** Chemins relatifs à la racine jamais parcourus (historique, outils, générés). */
const EXCLUDED_DIRS = [
  'node_modules',
  '.next',
  '.git',
  '.planning',
  'docs',
  'supabase/migrations',
  '.claude',
  '.agents',
  '.cursor',
  '.vercel',
  '.media',
  '.swc',
  '.hallmark',
  '.taste-skill',
];

/** Lockfiles exclus par nom exact (en plus de tout nom en `-lock.json` ou `.lock`). */
const EXCLUDED_FILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'skills-lock.json'];

const SCANNED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.json'];

const SELF = toPosix(relative(ROOT, fileURLToPath(import.meta.url)));

const DEAD_PROVIDER = /proxycurl|nubela|enrichlayer/i;
const DEAD_IMPORT = /['"]@\/(lib\/radar|app\/api\/radar)\b/;

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

function isExcludedDir(rel: string, name: string): boolean {
  // Tout dossier caché (outils / agents) et tout node_modules, à n'importe quelle profondeur.
  if (name.startsWith('.') || name === 'node_modules') return true;
  return EXCLUDED_DIRS.some((excluded) => rel === excluded || rel.startsWith(`${excluded}/`));
}

function isExcludedFile(rel: string, name: string): boolean {
  if (rel === SELF) return true;
  if (EXCLUDED_FILES.includes(name)) return true;
  return name.endsWith('-lock.json') || name.endsWith('.lock');
}

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = toPosix(relative(ROOT, full));
    if (statSync(full).isDirectory()) {
      if (!isExcludedDir(rel, entry)) found.push(...walk(full));
    } else if (SCANNED_EXTENSIONS.some((ext) => entry.endsWith(ext)) && !isExcludedFile(rel, entry)) {
      found.push(rel);
    }
  }
  return found;
}

function offendersFor(files: string[], pattern: RegExp): string[] {
  return files.filter((rel) => pattern.test(readFileSync(join(ROOT, rel), 'utf8')));
}

describe('fournisseurs morts (audit Phase 9)', () => {
  const files = walk(ROOT);

  it('scanne effectivement le code source', () => {
    expect(files.length).toBeGreaterThan(50);
    for (const expected of ['middleware.ts', 'next.config.ts', 'package.json']) {
      expect(files).toContain(expected);
    }
    for (const dir of ['app/', 'lib/', 'components/', 'workflows/', 'scripts/']) {
      expect(files.some((f) => f.startsWith(dir))).toBe(true);
    }
    const leaked = files.filter((f) =>
      EXCLUDED_DIRS.some((excluded) => f === excluded || f.startsWith(`${excluded}/`)),
    );
    expect(leaked).toEqual([]);
  });

  it('détecte bien les motifs interdits', () => {
    expect(DEAD_PROVIDER.test('PROXYCURL_API_KEY')).toBe(true);
    expect(DEAD_PROVIDER.test('https://nubela.co/proxycurl/api')).toBe(true);
    expect(DEAD_PROVIDER.test('ENRICHLAYER_API_KEY')).toBe(true);
    expect(DEAD_IMPORT.test("import { x } from '@/lib/radar/queries'")).toBe(true);
    expect(DEAD_IMPORT.test("import { RadarChart } from 'recharts'")).toBe(false);
    expect(DEAD_IMPORT.test("'radar_companies'")).toBe(false);
  });

  it('aucune référence Proxycurl / Nubela / Enrich Layer', () => {
    expect(offendersFor(files, DEAD_PROVIDER)).toEqual([]);
  });

  it('aucun import du domaine radar supprimé', () => {
    expect(offendersFor(files, DEAD_IMPORT)).toEqual([]);
  });
});
