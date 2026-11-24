import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Double statique de la règle ESLint `no-restricted-imports` (eslint.config.mjs) :
 * tout appel LLM doit passer par `createGatewayLanguageModel` de `@/lib/ai`, seul chemin qui
 * impose ZDR + inférence UE. `eslint .` n'étant pas forcément exécuté en CI, ce test bloque aussi.
 */

const ROOT = path.resolve(__dirname, '..');
const SCANNED_DIRS = ['app', 'lib', 'workflows', 'components'];
const GUARD_FILE = path.join('lib', 'ai.ts');
const LLM_CALL_FNS = ['generateText', 'streamText', 'generateObject', 'streamObject', 'embed', 'embedMany'];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const files = SCANNED_DIRS.flatMap((d) => listSourceFiles(path.join(ROOT, d)))
  .map((full) => ({ rel: path.relative(ROOT, full), src: readFileSync(full, 'utf8') }))
  .filter((f) => f.rel !== GUARD_FILE);

/** Noms importés (alias et `type` retirés) depuis un module donné. */
function namedImportsFrom(src: string, moduleName: string): string[] {
  const escaped = moduleName.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const re = new RegExp(`import\\s+(?:type\\s+)?\\{([^}]*)\\}\\s*from\\s*['"]${escaped}['"]`, 'g');
  const names: string[] = [];
  for (const m of src.matchAll(re)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (name) names.push(name);
    }
  }
  return names;
}

describe('verrou : aucun appel Gateway hors garde-fou', () => {
  it('scanne bien des fichiers source', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('aucun import de createGateway / gateway depuis ai, ni de @ai-sdk/* (sauf @ai-sdk/react)', () => {
    const offenders: string[] = [];
    for (const { rel, src } of files) {
      const fromAi = namedImportsFrom(src, 'ai');
      if (fromAi.includes('createGateway') || fromAi.includes('gateway')) offenders.push(`${rel} (ai)`);
      if (/(?:from\s*|import\s*\(\s*|require\s*\(\s*)['"]@ai-sdk\/(?!react['"])[^'"]+['"]/.test(src)) {
        offenders.push(`${rel} (@ai-sdk/*)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('les fichiers qui appellent un LLM passent par @/lib/ai et jamais par un modèle en chaîne brute', () => {
    const offenders: string[] = [];
    for (const { rel, src } of files) {
      const fromAi = namedImportsFrom(src, 'ai');
      if (!fromAi.some((n) => LLM_CALL_FNS.includes(n))) continue;
      if (!/from\s*['"]@\/lib\/ai['"]/.test(src)) offenders.push(`${rel} (pas d'import @/lib/ai)`);
      if (/\bmodel\s*:\s*['"`]/.test(src)) offenders.push(`${rel} (modèle en chaîne brute)`);
    }
    expect(offenders).toEqual([]);
  });
});
