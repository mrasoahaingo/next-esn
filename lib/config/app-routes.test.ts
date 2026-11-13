import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it, expect } from 'vitest';
import { APP_ROUTE_PREFIXES, ORG_SELECTION_PREFIX, isAppPath } from './app-routes';

/**
 * Garde-fou de sécurité : le middleware ne protège que APP_ROUTE_PREFIXES (+ /api).
 * Toute nouvelle page de l'app oubliée dans la liste serait publique côté middleware.
 * Ce test parcourt app/ et échoue si une page n'est ni publique ni couverte.
 */
const PUBLIC_TOP_SEGMENTS = new Set(['', 'sign-in', 'sign-up', ORG_SELECTION_PREFIX.slice(1)]);

function pageRoutes(dir: string, root: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'api' && dir === root) continue;
      found.push(...pageRoutes(full, root));
    } else if (entry === 'page.tsx') {
      const segments = relative(root, dir)
        .split(sep)
        .filter((segment) => segment && !/^\(.*\)$/.test(segment));
      found.push(`/${segments.join('/')}`);
    }
  }
  return found;
}

describe('APP_ROUTE_PREFIXES', () => {
  const appDir = join(process.cwd(), 'app');
  const routes = pageRoutes(appDir, appDir);

  it('trouve des pages dans app/', () => {
    expect(routes.length).toBeGreaterThan(5);
  });

  it.each(routes)('la page %s est publique ou protégée par le middleware', (route) => {
    const top = route.split('/')[1] ?? '';
    const covered = APP_ROUTE_PREFIXES.some((prefix) => route === prefix || route.startsWith(`${prefix}/`));
    expect(covered || PUBLIC_TOP_SEGMENTS.has(top)).toBe(true);
  });

  it('ne traite pas un préfixe voisin comme une page de l’app', () => {
    expect(isAppPath('/dashboardx')).toBe(false);
    expect(isAppPath('/dashboard/abc')).toBe(true);
  });
});
