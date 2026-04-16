import { spawn, type ChildProcess } from 'child_process';
import { RawSignalSchema, type ApiCall, type RawSignal } from '@/lib/radar/schemas';

// ─── Config ───────────────────────────────────────────────────────────────────

const SEARCH_URL =
  'https://www.linkedin.com/search/results/people/?keywords=freelance+d%C3%A9veloppeur+paris&origin=GLOBAL_SEARCH_HEADER';
const MAX_PROFILES_DEFAULT = 20;
const AGENT_BROWSER_TIMEOUT_MS = 300_000; // 5 min

// ─── Spawn helper ─────────────────────────────────────────────────────────────

type SpawnResult = {
  stdout: string;
  durationMs: number;
  ok: boolean;
  errorMsg?: string;
};

async function runAgentBrowser(
  args: string[],
  opts: { linkedinContextId?: string | null } = {},
): Promise<SpawnResult> {
  const start = Date.now();
  return new Promise((resolve) => {
    // Filter out npm_config_* keys inherited from the Node process env — they cause npm warnings
    // on stderr (Unknown env config) that fill the errorMsg buffer and hide the real error.
    const filteredEnv = Object.fromEntries(
      Object.entries(process.env).filter(([k]) => !k.startsWith('npm_config_')),
    ) as NodeJS.ProcessEnv;

    const env: NodeJS.ProcessEnv = {
      ...filteredEnv,
      AGENT_BROWSER_DEFAULT_TIMEOUT: '60000',
      AGENT_BROWSER_CONTENT_BOUNDARIES: '0',
      AGENT_BROWSER_MAX_OUTPUT: '100000',
      ...(opts.linkedinContextId ? { BROWSERBASE_CONTEXT_ID: opts.linkedinContextId } : {}),
    };

    const proc: ChildProcess = spawn(
      'npx',
      ['--yes', 'agent-browser@latest', '-p', 'browserbase', ...args],
      { env, timeout: AGENT_BROWSER_TIMEOUT_MS },
    );

    const out: Buffer[] = [];
    const err: Buffer[] = [];
    proc.stdout?.on('data', (d: Buffer) => out.push(d));
    proc.stderr?.on('data', (d: Buffer) => err.push(d));

    proc.on('close', (code: number | null) => {
      const fullStderr = Buffer.concat(err).toString('utf8');
      if (code !== 0 && fullStderr) {
        console.error('[agent-browser] stderr complet:', fullStderr);
      }
      resolve({
        stdout: Buffer.concat(out).toString('utf8'),
        durationMs: Date.now() - start,
        ok: code === 0,
        // Increased from 500 to 2000 — the previous limit was filled by npm warnings,
        // leaving no room for the actual agent-browser error message.
        errorMsg: code !== 0 ? fullStderr.slice(0, 2000) : undefined,
      });
    });

    proc.on('error', (e: Error) => {
      resolve({
        stdout: '',
        durationMs: Date.now() - start,
        ok: false,
        errorMsg: String(e).slice(0, 500),
      });
    });
  });
}

// ─── Accessibility tree parsing ───────────────────────────────────────────────

interface SnapshotNode {
  role?: string;
  name?: string;
  url?: string;
  value?: string;
  children?: SnapshotNode[];
  [key: string]: unknown;
}

function extractLinksFromSnapshot(
  node: SnapshotNode,
  filter: (url: string) => boolean,
): Array<{ name: string; url: string }> {
  const results: Array<{ name: string; url: string }> = [];

  function walk(n: SnapshotNode) {
    if ((n.role === 'link' || n.role === 'a') && n.url && filter(n.url)) {
      results.push({ name: n.name ?? '', url: n.url });
    }
    for (const child of (n.children as SnapshotNode[] | undefined) ?? []) {
      walk(child);
    }
  }
  walk(node);
  return results;
}

function extractLinksFromText(
  text: string,
  pattern: RegExp,
): Array<{ name: string; url: string }> {
  const seen = new Set<string>();
  const results: Array<{ name: string; url: string }> = [];
  for (const match of text.matchAll(pattern)) {
    const url = match[0].split('?')[0];
    if (!seen.has(url)) {
      seen.add(url);
      results.push({ name: '', url });
    }
  }
  return results;
}

function parseSnapshotForLinks(
  stdout: string,
  filter: (url: string) => boolean,
): Array<{ name: string; url: string }> {
  try {
    const tree = JSON.parse(stdout) as SnapshotNode;
    return extractLinksFromSnapshot(tree, filter);
  } catch {
    // Fallback: regex on raw text
    return extractLinksFromText(stdout, /https?:\/\/www\.linkedin\.com\/in\/[^"'\s>?/]+/g).filter(
      ({ url }) => filter(url),
    );
  }
}

// ─── Employee count extraction ────────────────────────────────────────────────

function extractCountFromText(text: string): number {
  // Match "1,234 members", "456 résultats", "1.2K members", "12 résultats"
  const match = text.match(
    /(\d[\d\s,]*(?:\.\d+)?\s*[KMkm]?)\s*(?:members?|r[eé]sultats?|employ[eé]s?|personnes?|connections?)/i,
  );
  if (!match) return 0;
  const numStr = match[1].replace(/[\s,]/g, '').toLowerCase();
  if (numStr.endsWith('k')) return Math.round(parseFloat(numStr) * 1_000);
  if (numStr.endsWith('m')) return Math.round(parseFloat(numStr) * 1_000_000);
  return parseInt(numStr, 10) || 0;
}

// ─── Weight mapping ───────────────────────────────────────────────────────────

function weightFromFreelanceRatio(ratio: number): number {
  if (ratio >= 30) return 25;
  if (ratio >= 20) return 20;
  if (ratio >= 10) return 15;
  if (ratio >= 5) return 10;
  return 5;
}

function companySlugToName(url: string): string {
  const match = /linkedin\.com\/company\/([^/?#]+)/i.exec(url);
  return match ? match[1].replace(/-/g, ' ') : url;
}

// ─── Collector ────────────────────────────────────────────────────────────────

export async function collectFreelanceParisAgentBrowser(args: {
  orgId: string;
  linkedinContextId?: string | null;
  maxProfiles?: number;
}): Promise<{ signals: RawSignal[]; calls: ApiCall[] }> {
  if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
    console.warn(
      '[agent-browser][linkedin] BROWSERBASE_API_KEY ou BROWSERBASE_PROJECT_ID manquants',
    );
    return { signals: [], calls: [] };
  }

  const { linkedinContextId, maxProfiles = MAX_PROFILES_DEFAULT } = args;
  const opts = { linkedinContextId };
  const signals: RawSignal[] = [];
  const calls: ApiCall[] = [];

  try {
    // ── Étape 1 : récupérer les profils depuis la page de recherche ───────────

    console.info('[agent-browser][linkedin] ouverture page recherche…');
    const searchResult = await runAgentBrowser(
      ['batch', `open "${SEARCH_URL}"`, 'snapshot --json'],
      opts,
    );

    calls.push({
      endpoint: 'agent-browser:search',
      status: searchResult.ok ? 200 : 0,
      ok: searchResult.ok,
      responseData: {
        url: SEARCH_URL,
        durationMs: searchResult.durationMs,
        error: searchResult.errorMsg,
      },
    });

    if (!searchResult.ok) {
      console.error('[agent-browser][linkedin] page recherche échouée:', searchResult.errorMsg);
      return { signals, calls };
    }

    const profileLinks = parseSnapshotForLinks(
      searchResult.stdout,
      (url) => /linkedin\.com\/in\//i.test(url),
    ).slice(0, maxProfiles);

    console.info('[agent-browser][linkedin] profils trouvés:', profileLinks.length);

    // ── Étapes 2 + 3 : Pour chaque profil → entreprise → ratio freelance ─────

    // Dédoublonnage par URL entreprise
    const companyMap = new Map<
      string,
      {
        companyName: string;
        profileName: string;
        companyUrl: string;
        freelanceCount: number;
        totalEmployees: number;
      }
    >();

    for (const { name: defaultName, url: profileUrl } of profileLinks) {
      // Étape 2 : profil → URL et nom entreprise
      const profileResult = await runAgentBrowser(
        ['batch', `open "${profileUrl}"`, 'snapshot --json'],
        opts,
      );

      calls.push({
        endpoint: 'agent-browser:profile',
        status: profileResult.ok ? 200 : 0,
        ok: profileResult.ok,
        responseData: { url: profileUrl, durationMs: profileResult.durationMs },
      });

      if (!profileResult.ok) continue;

      let currentCompanyUrl = '';
      let currentCompanyName = '';
      const profileName = defaultName;

      try {
        const tree = JSON.parse(profileResult.stdout) as SnapshotNode;
        const companyLinks = extractLinksFromSnapshot(tree, (url) =>
          /linkedin\.com\/company\//i.test(url),
        );
        if (companyLinks.length > 0) {
          currentCompanyUrl = companyLinks[0].url.split('?')[0];
          currentCompanyName = companyLinks[0].name || companySlugToName(currentCompanyUrl);
        }
      } catch {
        const m = profileResult.stdout.match(/linkedin\.com\/company\/([^"'\s>?/]+)/i);
        if (m) {
          currentCompanyUrl = `https://www.linkedin.com/company/${m[1]}`;
          currentCompanyName = companySlugToName(currentCompanyUrl);
        }
      }

      if (!currentCompanyUrl || companyMap.has(currentCompanyUrl)) continue;

      // Étape 3 : /people → total ; /people?keywords=freelance → freelances
      const companyBase = currentCompanyUrl.replace(/\/$/, '');

      const totalResult = await runAgentBrowser(
        ['batch', `open "${companyBase}/people"`, 'snapshot'],
        opts,
      );
      const freelanceResult = await runAgentBrowser(
        ['batch', `open "${companyBase}/people?keywords=freelance"`, 'snapshot'],
        opts,
      );

      calls.push(
        {
          endpoint: 'agent-browser:company-people',
          status: totalResult.ok ? 200 : 0,
          ok: totalResult.ok,
          responseData: { url: `${companyBase}/people`, durationMs: totalResult.durationMs },
        },
        {
          endpoint: 'agent-browser:company-freelance',
          status: freelanceResult.ok ? 200 : 0,
          ok: freelanceResult.ok,
          responseData: {
            url: `${companyBase}/people?keywords=freelance`,
            durationMs: freelanceResult.durationMs,
          },
        },
      );

      const totalEmployees = extractCountFromText(totalResult.stdout);
      const freelanceCount = extractCountFromText(freelanceResult.stdout);

      companyMap.set(currentCompanyUrl, {
        companyName: currentCompanyName,
        profileName,
        companyUrl: currentCompanyUrl,
        freelanceCount,
        totalEmployees,
      });

      console.info('[agent-browser][linkedin] entreprise analysée:', {
        companyName: currentCompanyName,
        totalEmployees,
        freelanceCount,
      });
    }

    // ── Mapper les entreprises → RawSignal ────────────────────────────────────

    for (const entry of companyMap.values()) {
      const freelanceRatio =
        entry.totalEmployees > 0
          ? Math.round((entry.freelanceCount / entry.totalEmployees) * 100)
          : 0;

      const signal = RawSignalSchema.safeParse({
        source: 'linkedin',
        title: `Freelance detection — ${entry.freelanceCount} freelances détectés`,
        weight: weightFromFreelanceRatio(freelanceRatio),
        metadata: {
          signalType: 'agent_browser_freelance_discovery',
          profileName: entry.profileName,
          companyUrl: entry.companyUrl,
          freelanceCount: entry.freelanceCount,
          totalEmployees: entry.totalEmployees,
          freelanceRatio,
          collectedAt: new Date().toISOString(),
        },
        companyName: entry.companyName,
        detectedAt: new Date().toISOString(),
      } satisfies RawSignal);

      if (signal.success) {
        signals.push(signal.data);
      }
    }
  } catch (error) {
    console.error('[agent-browser][linkedin] collectFreelanceParisAgentBrowser:', error);
  }

  return { signals, calls };
}
