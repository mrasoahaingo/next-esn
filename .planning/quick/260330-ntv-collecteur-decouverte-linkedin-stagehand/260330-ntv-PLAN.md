---
phase: quick-260330-ntv
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/radar/queries.ts
  - lib/radar/collectors/linkedin-discovery.ts
  - app/api/radar/workflows/collect-linkedin-discovery.workflow.ts
  - app/api/radar/cron/collect-signals/route.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "Le cron collect-signals lance un run linkedin-discovery par org"
    - "Le collecteur navigue sur LinkedIn company search avec les critères linkedinDiscovery"
    - "Les entreprises trouvées sont upsertées dans radar_companies avec linkedin_url, sector, headcount"
    - "Le résultat est loggé dans radar_run_logs avec source 'linkedin-discovery'"
    - "maxCompaniesPerRun est respecté — pas de dépassement"
  artifacts:
    - path: "lib/radar/collectors/linkedin-discovery.ts"
      provides: "Collecteur Stagehand pour LinkedIn company search"
      exports: ["collectLinkedInDiscovery"]
    - path: "app/api/radar/workflows/collect-linkedin-discovery.workflow.ts"
      provides: "Workflow orchestrant la découverte"
      exports: ["collectLinkedInDiscoveryWorkflow"]
    - path: "lib/radar/queries.ts"
      provides: "upsertDiscoveredCompany"
      exports: ["upsertDiscoveredCompany"]
  key_links:
    - from: "app/api/radar/cron/collect-signals/route.ts"
      to: "collect-linkedin-discovery.workflow.ts"
      via: "start(collectLinkedInDiscoveryWorkflow, [orgId])"
    - from: "collect-linkedin-discovery.workflow.ts"
      to: "lib/radar/collectors/linkedin-discovery.ts"
      via: "collectLinkedInDiscovery(settings.linkedinDiscovery)"
    - from: "lib/radar/collectors/linkedin-discovery.ts"
      to: "lib/radar/queries.ts"
      via: "upsertDiscoveredCompany appelé sur chaque entreprise trouvée"
---

<objective>
Créer un collecteur de découverte LinkedIn qui utilise Stagehand/Browserbase pour naviguer sur LinkedIn company search, extraire les entreprises correspondant aux critères `linkedinDiscovery`, et les upserteur dans `radar_companies`.

Purpose: Alimenter automatiquement le vivier de prospects avec des entreprises découvertes via LinkedIn, sans URL manuelle.
Output: nouveau fichier collector + workflow + modification queries.ts + cron mis à jour.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

@lib/radar/settings.ts
@lib/radar/collectors/linkedin-browser.ts
@lib/radar/queries.ts
@app/api/radar/workflows/collect-linkedin.workflow.ts
@app/api/radar/cron/collect-signals/route.ts

<interfaces>
<!-- Patterns à réutiliser exactement -->

De lib/radar/collectors/linkedin-browser.ts :
```typescript
// Factory Stagehand — copier tel quel
function createStagehand() {
  return new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    // @ts-expect-error — modelName exists at runtime (Stagehand V3 types incomplete)
    modelName: 'gpt-4o-mini',
    modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
    verbose: 0,
  });
}

// Pattern try/finally obligatoire
await stagehand.init();
try { /* navigation + extract */ } finally { await stagehand.close(); }

// Pattern extract
// @ts-expect-error — Stagehand V3 types incomplete, page exists at runtime
await stagehand.page.goto(url, { waitUntil: 'domcontentloaded' });
// @ts-expect-error — Stagehand V3 types incomplete, extract() exists at runtime
const raw = await stagehand.extract({ instruction: '...', schema: ZodSchema });
```

De lib/radar/queries.ts :
```typescript
// insertRunLog — source type union strict
export async function insertRunLog(
  orgId: string,
  source: 'jobs' | 'boamp' | 'press' | 'linkedin' | 'scoring' | 'enrichment',
  result: Record<string, unknown>,
): Promise<void>

// Pattern upsert radar_companies (voir enrichProspectLinkedIn pour la forme update)
await supabase
  .from('radar_companies')
  .update({ linkedin_url, sector, headcount, updated_at })
  .eq('id', id);
```

De lib/radar/settings.ts :
```typescript
export type LinkedInDiscovery = {
  enabled: boolean;
  sectors: string[];
  regions: string[];
  keywords: string[];
  minHeadcount: number;
  maxHeadcount: number;
  maxCompaniesPerRun: number;
  minExternalRatio: number;
}
```

De app/api/radar/workflows/collect-linkedin.workflow.ts :
```typescript
// Pattern workflow avec 'use workflow' / 'use step'
export async function collectLinkedInWorkflow(orgId: string) {
  'use workflow';
  const step1Result = await stepFn(args);
  // ...
}
async function stepFn(args) { 'use step'; /* ... */ }
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Ajouter upsertDiscoveredCompany dans queries.ts</name>
  <files>lib/radar/queries.ts</files>
  <action>
Ajouter la fonction exportée `upsertDiscoveredCompany` à la fin de `lib/radar/queries.ts`, avant la dernière export.

```typescript
export async function upsertDiscoveredCompany(
  orgId: string,
  company: { name: string; linkedinUrl: string; sector?: string; headcount?: number; city?: string },
): Promise<string> {
  const supabase = getSupabase();

  // Recherche par linkedin_url (clé de déduplication pour la découverte)
  const { data: existing } = await supabase
    .from('radar_companies')
    .select('id')
    .eq('org_id', orgId)
    .eq('linkedin_url', company.linkedinUrl)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from('radar_companies')
      .update({
        name: company.name.trim(),
        sector: company.sector ?? null,
        headcount: company.headcount ?? null,
        city: company.city ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    return existing.id;
  }

  // Fallback : recherche par nom normalisé (évite les doublons si déjà présente sans URL)
  const normalizedName = normalizeCompanyName(company.name);
  const { data: allByOrg } = await supabase
    .from('radar_companies')
    .select('id, name')
    .eq('org_id', orgId);

  const byName = (allByOrg ?? []).find((row) => normalizeCompanyName(row.name) === normalizedName);
  if (byName?.id) {
    await supabase
      .from('radar_companies')
      .update({
        linkedin_url: company.linkedinUrl,
        sector: company.sector ?? null,
        headcount: company.headcount ?? null,
        city: company.city ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', byName.id);
    return byName.id;
  }

  // Création
  const { data: inserted, error } = await supabase
    .from('radar_companies')
    .insert({
      org_id: orgId,
      name: company.name.trim(),
      linkedin_url: company.linkedinUrl,
      sector: company.sector ?? null,
      headcount: company.headcount ?? null,
      city: company.city ?? null,
      enrichment_data: {},
    })
    .select('id')
    .single();

  if (error || !inserted) throw error ?? new Error('Unable to upsert discovered company');
  return inserted.id;
}
```

Aussi étendre le type union de `insertRunLog` pour ajouter `'linkedin-discovery'` :
```typescript
source: 'jobs' | 'boamp' | 'press' | 'linkedin' | 'linkedin-discovery' | 'scoring' | 'enrichment',
```
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit 2>&1 | grep -E "queries\.ts" | head -20</automated>
  </verify>
  <done>
    - `upsertDiscoveredCompany` est exportée et compile sans erreur TypeScript
    - `insertRunLog` accepte `'linkedin-discovery'` comme source
  </done>
</task>

<task type="auto">
  <name>Task 2: Créer le collecteur linkedin-discovery.ts</name>
  <files>lib/radar/collectors/linkedin-discovery.ts</files>
  <action>
Créer `lib/radar/collectors/linkedin-discovery.ts`. Ce collecteur utilise Stagehand pour naviguer sur LinkedIn company search et extraire les entreprises.

Structure :

```typescript
import { z } from 'zod';
import { Stagehand } from '@browserbasehq/stagehand';
import type { LinkedInDiscovery } from '@/lib/radar/settings';
import type { ApiCall } from '@/lib/radar/schemas';

// ─── Schémas locaux ───────────────────────────────────────────────────────────

const DiscoveredCompanySchema = z.object({
  name: z.string(),
  linkedinUrl: z.string().optional(),
  sector: z.string().optional(),
  headcount: z.number().optional(),
  city: z.string().optional(),
});

const CompanySearchResultSchema = z.object({
  companies: z.array(DiscoveredCompanySchema).default([]),
});

export type DiscoveredCompany = z.infer<typeof DiscoveredCompanySchema>;
```

Copier `createStagehand()` exactement depuis `linkedin-browser.ts` (même config Browserbase/gpt-4o-mini).

Fonction principale :

```typescript
export async function collectLinkedInDiscovery(
  config: LinkedInDiscovery,
): Promise<{ companies: DiscoveredCompany[]; calls: ApiCall[] }>
```

Logique interne :
1. Guard: si `!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID` → return vide
2. Construire une liste de termes de recherche : `[...config.keywords, ...config.sectors]` dédupliquée, limitée à 5 termes pour ne pas consommer trop de crédits Browserbase
3. `createStagehand()` → `stagehand.init()` → try/finally `stagehand.close()`
4. Pour chaque terme, construire l'URL :
   ```
   https://www.linkedin.com/search/results/companies/?keywords=ENCODED_KEYWORD&origin=SWITCH_SEARCH_VERTICAL
   ```
5. `stagehand.page.goto(url, { waitUntil: 'domcontentloaded' })` — attendre 2 secondes avec `await new Promise(r => setTimeout(r, 2000))` pour le rendu JS
6. `stagehand.extract()` avec instruction :
   ```
   "Extrais la liste des entreprises visibles dans les résultats de recherche LinkedIn.
    Pour chaque entreprise : nom exact, URL LinkedIn (/company/...), secteur d'activité, nombre d'employés (headcount comme nombre entier), ville principale."
   ```
   schema: `CompanySearchResultSchema`
7. Filtrer les entreprises extraites :
   - `headcount` doit être entre `config.minHeadcount` et `config.maxHeadcount` (si headcount disponible)
   - `linkedinUrl` doit être présente et contenir `/company/`
8. Accumuler dans `allCompanies`, dédupliquer par `linkedinUrl`
9. Respecter `config.maxCompaniesPerRun` — tronquer après collecte totale
10. Logger avec `console.info('[radar][linkedin-discovery]', event, payload)` à chaque étape
11. Pousser un `ApiCall` par terme recherché (status 200 ou 0 en cas d'erreur)

Chaque terme est wrappé dans son propre try/catch pour ne pas interrompre les suivants.
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit 2>&1 | grep -E "linkedin-discovery" | head -20</automated>
  </verify>
  <done>
    - Fichier compilé sans erreur TypeScript
    - `collectLinkedInDiscovery` est exportée
    - Le guard Browserbase est en place
    - `maxCompaniesPerRun` est respecté
  </done>
</task>

<task type="auto">
  <name>Task 3: Créer le workflow + brancher le cron</name>
  <files>
    app/api/radar/workflows/collect-linkedin-discovery.workflow.ts
    app/api/radar/cron/collect-signals/route.ts
  </files>
  <action>
**Fichier 1 — `collect-linkedin-discovery.workflow.ts`**

Modèle exact sur `collect-linkedin.workflow.ts` :

```typescript
import { collectLinkedInDiscovery } from '@/lib/radar/collectors/linkedin-discovery';
import { upsertDiscoveredCompany, insertRunLog } from '@/lib/radar/queries';
import { getRadarSettings } from '@/lib/radar/settings';
import type { ApiCall } from '@/lib/radar/schemas';

async function fetchDiscoveryConfig(orgId: string) {
  'use step';
  const settings = await getRadarSettings(orgId);
  if (!settings.linkedinDiscovery.enabled) return null;
  return settings.linkedinDiscovery;
}

async function runDiscoveryCollector(config: NonNullable<Awaited<ReturnType<typeof fetchDiscoveryConfig>>>) {
  'use step';
  return collectLinkedInDiscovery(config);
}

async function persistDiscoveredCompanies(
  orgId: string,
  companies: Awaited<ReturnType<typeof collectLinkedInDiscovery>>['companies'],
) {
  'use step';
  let upserted = 0;
  for (const company of companies) {
    if (!company.linkedinUrl) continue;
    try {
      await upsertDiscoveredCompany(orgId, {
        name: company.name,
        linkedinUrl: company.linkedinUrl,
        sector: company.sector,
        headcount: company.headcount,
        city: company.city,
      });
      upserted += 1;
    } catch (error) {
      console.error('persistDiscoveredCompanies:', company.name, error);
    }
  }
  return upserted;
}

async function logDiscoveryRun(
  orgId: string,
  result: { collected: number; upserted: number; calls: ApiCall[] },
) {
  'use step';
  await insertRunLog(orgId, 'linkedin-discovery', result);
}

export async function collectLinkedInDiscoveryWorkflow(orgId: string) {
  'use workflow';

  const config = await fetchDiscoveryConfig(orgId);
  if (!config) {
    await logDiscoveryRun(orgId, { collected: 0, upserted: 0, calls: [] });
    return { collected: 0, upserted: 0 };
  }

  const { companies, calls } = await runDiscoveryCollector(config);
  const upserted = await persistDiscoveredCompanies(orgId, companies);
  await logDiscoveryRun(orgId, { collected: companies.length, upserted, calls });
  return { collected: companies.length, upserted };
}
```

**Fichier 2 — `collect-signals/route.ts`**

Modifier `startCollectRuns` pour ajouter le troisième workflow :

```typescript
import { collectLinkedInDiscoveryWorkflow } from '@/app/api/radar/workflows/collect-linkedin-discovery.workflow';

async function startCollectRuns(orgId: string) {
  return Promise.all([
    start(collectPressWorkflow, [orgId]).then((run) => ({ kind: 'press', runId: run.runId })),
    start(collectLinkedInWorkflow, [orgId]).then((run) => ({ kind: 'linkedin', runId: run.runId })),
    start(collectLinkedInDiscoveryWorkflow, [orgId]).then((run) => ({ kind: 'linkedin-discovery', runId: run.runId })),
  ]);
}
```
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit 2>&1 | grep -E "(collect-linkedin-discovery|collect-signals)" | head -20</automated>
  </verify>
  <done>
    - `collect-linkedin-discovery.workflow.ts` compile sans erreur
    - `collect-signals/route.ts` lance bien 3 workflows par org (press, linkedin, linkedin-discovery)
    - `insertRunLog` appelé avec source `'linkedin-discovery'`
    - Le workflow court-circuite proprement si `linkedinDiscovery.enabled === false`
  </done>
</task>

</tasks>

<verification>
Après les 3 tâches, vérifier la compilation globale :
```bash
cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit 2>&1 | tail -20
```
Aucune erreur TypeScript attendue sur les fichiers modifiés.
</verification>

<success_criteria>
- `lib/radar/collectors/linkedin-discovery.ts` existe et exporte `collectLinkedInDiscovery`
- `lib/radar/queries.ts` exporte `upsertDiscoveredCompany` + `insertRunLog` accepte `'linkedin-discovery'`
- `app/api/radar/workflows/collect-linkedin-discovery.workflow.ts` existe et suit le pattern `'use workflow'` / `'use step'`
- `app/api/radar/cron/collect-signals/route.ts` lance 3 workflows (press + linkedin + linkedin-discovery)
- `npx tsc --noEmit` passe sans erreur sur les fichiers modifiés
</success_criteria>

<output>
Après complétion, créer `.planning/quick/260330-ntv-collecteur-decouverte-linkedin-stagehand/260330-ntv-SUMMARY.md`
</output>
