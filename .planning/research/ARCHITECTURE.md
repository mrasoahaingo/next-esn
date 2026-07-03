# Architecture Patterns: v1.3 Prospection

**Domain:** B2B prospecting pipeline integrated into existing ESN SaaS
**Researched:** 2026-07-03
**Milestone:** v1.3 Prospection (new feature domain, from scratch under `/prospection`)

---

## How the Prospection Feature Sits in the Existing Architecture

The prospection feature is a **new domain** added alongside the existing candidate/mission/positioning domains. It does not modify any existing table, API route, or workflow. It reuses all infrastructure (Supabase, Clerk, @workflow/next, React Query, the `useWorkflowStream` hook, the `WorkflowStepList` component pattern) without changing it.

The existing `lib/radar/` code is reference material only. The new feature lives under:
- `lib/prospection/` — schemas, queries, services, scoring
- `app/api/prospection/` — API routes
- `app/api/prospection/workflows/` — @workflow/next workflow files
- `app/prospection/` — UI pages

---

## Recommended Architecture

### System Overview

```
[Cron / Manual trigger]
        │
        ▼
POST /api/prospection/automations/[id]/run
  → start(collectSignalsWorkflow, [automationId, orgId])
        │
        ├── step: fetchAutomationConfig(automationId) → criteria, enabled sources
        │
        ├── step: runCollectors(criteria) → RawSignal[] per source
        │   ├── France Travail API (job offers)
        │   ├── SIRENE/Pappers (company lookup + SIREN resolution)
        │   ├── Proxycurl (LinkedIn headcount, job changes) — existing pattern
        │   └── (future) BOAMP, Crunchbase, Browserbase/Stagehand
        │
        ├── step: reconcileAndPersistSignals(orgId, signals) → upsert by SIREN
        │   └── findOrCreateProspectCompany (SIREN-first, name-fallback)
        │
        ├── step: scoreCompanies(orgId) → heat scores per company
        │   ├── deterministic rules (weight × decay per signal type)
        │   └── LLM synthesis: score justification + pitch d'appel
        │
        ├── step: enrichHotContacts(orgId, threshold) → contacts for hot companies
        │   └── gated: only companies above heat threshold (default: score ≥ 60)
        │
        └── step: logRunResult(automationId, orgId, result)
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `prospection_automations` (DB table) | Stores criteria configs per org | API routes, cron |
| `prospection_companies` (DB table) | One row per SIREN per org, reconciliation anchor | Signals, scores, contacts |
| `prospection_signals` (DB table) | Raw signals per company (TTL 90d) | Scoring step, UI |
| `prospection_scores` (DB table) | Computed heat score per company | UI list, enrichment gate |
| `prospection_contacts` (DB table) | Enriched contacts above threshold | UI detail panel |
| `prospection_run_logs` (DB table) | Per-automation run history | UI audit trail |
| `prospection_actions` (DB table) | à appeler / appelé / écarté per company | UI actionable list |
| `lib/prospection/collectors/` | One file per external signal source | Workflow steps |
| `lib/prospection/scoring.ts` | Deterministic score computation | Scoring step |
| `lib/prospection/scoring-llm.ts` | LLM synthesis (justification + pitch) | Scoring step |
| `lib/prospection/queries.ts` | Supabase reads/writes | API routes, workflow steps |
| `app/api/prospection/` | REST API handlers | React Query hooks |
| `app/api/prospection/workflows/` | @workflow/next workflow definitions | Cron + manual trigger routes |
| `app/api/prospection/cron/` | GET (Vercel cron) + POST (manual) routes | vercel.json cron config |
| `lib/queries/prospection.ts` | React Query hooks | `/prospection` page |
| `app/prospection/page.tsx` | Company list + heat sort | React Query |
| `app/prospection/[companyId]/page.tsx` | Company detail + signals + contacts + actions | React Query |

---

## Data Flow

### Full Pipeline Run

```
1. Trigger (cron GET or manual POST) calls start(collectSignalsWorkflow, [automationId, orgId])
2. Workflow emits NDJSON status frames via getWritable() → useWorkflowStream hook on client
3. fetchAutomationConfig step reads prospection_automations for criteria + source toggles
4. runCollectors step fans out to enabled API collectors in parallel (Promise.all)
5. Each collector returns RawProspectionSignal[] (normalized schema, SIREN if available)
6. reconcileAndPersistSignals step:
   a. For each signal: findOrCreateProspectCompany (SIREN-first lookup, then name fallback)
   b. Upsert signal into prospection_signals (dedup by company_id + source + title + TTL)
7. scoreCompanies step:
   a. computeScore() deterministic: weight × decay × convergence bonus per company
   b. LLM call: generateText with company signals → { score_justification, call_pitch }
   c. Upsert into prospection_scores
8. enrichHotContacts step:
   a. SELECT prospection_scores WHERE score >= threshold AND (no contacts OR last_enriched > 7d ago)
   b. Limit 20 per run to control Proxycurl credit burn
   c. Upsert contacts into prospection_contacts
9. logRunResult step writes to prospection_run_logs
10. React Query invalidates ['prospection', orgId] on workflow completion
```

### UI Data Flow

```
app/prospection/page.tsx
  └── useProspections() → GET /api/prospection/companies?automationId=&heat=&sector=
        └── listProspectCompanies(orgId, filters) from lib/prospection/queries.ts
              └── JOIN prospection_companies + prospection_scores + prospection_signals (latest)
                    → sorted by score DESC

app/prospection/[companyId]/page.tsx
  ├── useProspectDetail(companyId) → GET /api/prospection/companies/[id]
  │     → getProspectDetail(orgId, companyId): company + score + signals + contacts + actions
  └── useRunAutomation(automationId) → POST /api/prospection/automations/[id]/run
        → start(collectSignalsWorkflow, [automationId, orgId]) → returns { runId }
        → useWorkflowStream(runId) pipes NDJSON to WorkflowStepList (existing component)

Workflow status persisted to prospection_run_logs + prospection_scores
React Query invalidation: mutation onSuccess calls queryClient.invalidateQueries(['prospection', orgId])
```

### State Management

- **Server state:** React Query (companies list, scores, signals, contacts, actions, run logs)
- **Local state:** None required for this domain — no draft/edit workflow like CV builder
- **UI state:** React component state for filters (heat, sector, automation selector), action modal open/close

---

## Database Schema

### New Tables (all org-scoped with RLS)

```sql
-- Automation criteria configs
CREATE TABLE prospection_automations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      text NOT NULL,
  name        text NOT NULL,
  criteria    jsonb NOT NULL DEFAULT '{}', -- { sectors, sizes, geos, profiles }
  sources     jsonb NOT NULL DEFAULT '{}', -- { france_travail: true, proxycurl: true, ... }
  cron_enabled boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Company registry (reconciled by SIREN)
CREATE TABLE prospection_companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          text NOT NULL,
  name            text NOT NULL,
  siren           text,                   -- INSEE SIRENE reconciliation key
  sector          text,
  city            text,
  headcount       int,
  website         text,
  linkedin_url    text,
  enrichment_data jsonb DEFAULT '{}',
  last_enriched_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, siren)                  -- SIREN uniqueness within org
);

-- Raw signals with TTL
CREATE TABLE prospection_signals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES prospection_companies(id) ON DELETE CASCADE,
  source      text NOT NULL,              -- 'france_travail' | 'proxycurl' | 'pappers' | ...
  title       text NOT NULL,
  raw_content text,
  weight      int NOT NULL DEFAULT 10,
  metadata    jsonb DEFAULT '{}',
  detected_at timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL        -- now() + 90 days
);

-- Computed heat scores
CREATE TABLE prospection_scores (
  company_id    uuid PRIMARY KEY REFERENCES prospection_companies(id) ON DELETE CASCADE,
  org_id        text NOT NULL,
  score         int NOT NULL DEFAULT 0,   -- 0–100
  heat          text NOT NULL DEFAULT 'cold', -- cold|warm|hot|burning
  signal_count  int NOT NULL DEFAULT 0,
  breakdown     jsonb DEFAULT '{}',       -- { source: weight }
  justification text,                     -- LLM-generated explanation
  call_pitch    text,                     -- LLM-generated call pitch
  computed_at   timestamptz NOT NULL DEFAULT now()
);

-- Enriched contacts (gated by score threshold)
CREATE TABLE prospection_contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES prospection_companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  title       text,
  linkedin_url text,
  email       text,
  phone       text,
  enriched_at timestamptz NOT NULL DEFAULT now(),
  source      text NOT NULL DEFAULT 'proxycurl'
);

-- Run audit logs
CREATE TABLE prospection_run_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          text NOT NULL,
  automation_id   uuid REFERENCES prospection_automations(id),
  workflow_run_id text,
  source          text,
  result          jsonb DEFAULT '{}',
  logged_at       timestamptz NOT NULL DEFAULT now()
);

-- Actionable status per company
CREATE TABLE prospection_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      text NOT NULL,
  company_id  uuid NOT NULL REFERENCES prospection_companies(id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  status      text NOT NULL DEFAULT 'to_call', -- to_call | called | dismissed
  notes       text,
  performed_at timestamptz NOT NULL DEFAULT now()
);
```

### RLS Policies

All tables use the same pattern as existing tables:
```sql
ALTER TABLE prospection_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_isolation" ON prospection_automations
  USING (org_id = (SELECT auth.jwt() ->> 'org_id'));
```

Service role key bypasses RLS for workflow steps (existing pattern: `getSupabase()` with service role).

### Indexes

```sql
CREATE INDEX ON prospection_companies (org_id, siren);
CREATE INDEX ON prospection_signals (company_id, expires_at);
CREATE INDEX ON prospection_scores (org_id, score DESC);
CREATE INDEX ON prospection_actions (org_id, company_id);
```

---

## Workflow Patterns

### Pattern: Multi-Step Collector Workflow

Follows exactly the radar workflow pattern (`collect-linkedin.workflow.ts`):

```typescript
// app/api/prospection/workflows/collect-signals.workflow.ts

async function fetchAutomationConfig(automationId: string) {
  'use step';
  // read from prospection_automations
}

async function runCollectors(criteria: AutomationCriteria, sources: SourceToggles) {
  'use step';
  // Promise.all on enabled collectors — same pattern as fetchAllLinkedInSignals
  const results = await Promise.all([
    sources.france_travail ? collectFranceTravailSignals(criteria) : Promise.resolve({ signals: [], calls: [] }),
    sources.proxycurl      ? collectProxycurlSignals(criteria)     : Promise.resolve({ signals: [], calls: [] }),
    // ...
  ]);
  return { signals: results.flatMap(r => r.signals), calls: results.flatMap(r => r.calls) };
}

async function reconcileSignals(orgId: string, signals: RawProspectionSignal[]) {
  'use step';
  // findOrCreateProspectCompany + upsertSignals
}

async function scoreAndEnrich(orgId: string, automationId: string) {
  'use step';
  // computeScore() deterministic pass
  // LLM call for justification + pitch (via resolveLlmTask pattern)
  // enrichHotContacts() gated by threshold
}

async function logRun(orgId: string, automationId: string, result: RunResult) {
  'use step';
  // insertRunLog into prospection_run_logs
}

export async function collectSignalsWorkflow(automationId: string, orgId: string) {
  'use workflow';
  const config = await fetchAutomationConfig(automationId);
  const { signals, calls } = await runCollectors(config.criteria, config.sources);
  const persisted = await reconcileSignals(orgId, signals);
  await scoreAndEnrich(orgId, automationId);
  await logRun(orgId, automationId, { persisted, calls });
}
```

### Pattern: Dual-Trigger (Cron + Manual)

Follows exactly `app/api/radar/cron/collect-signals/route.ts`:

```typescript
// app/api/prospection/cron/collect/route.ts

// GET → Vercel cron (no auth, secret header check)
export async function GET() {
  const orgIds = await listProspectionOrgIds();
  const automationIds = await listActiveAutomations(orgIds);
  // start one workflow per automation
  const runs = await Promise.all(automationIds.map(a => start(collectSignalsWorkflow, [a.id, a.orgId])));
  return NextResponse.json({ started: runs.length });
}

// POST → manual trigger from UI
export async function POST(request: NextRequest) {
  const { orgId } = await requireOrgAdmin();
  const { automationId } = await request.json();
  const run = await start(collectSignalsWorkflow, [automationId, orgId]);
  return NextResponse.json({ runId: run.runId, mode: 'manual' });
}
```

### @workflow/next Beta Constraints

These constraints were observed in the existing codebase and must be respected:

1. **No reliable cancel.** The `/api/workflow/[runId]/cancel` route exists but is unreliable. Do not build UI that depends on cancel being honored. Show "running" state and let it complete.

2. **Error handling is per-step.** Each `'use step'` function wraps its own try-catch. If a collector step fails, log the error and return empty results rather than throwing — this prevents the whole workflow from aborting when one signal source is unavailable.

3. **`getWritable()` scope.** The writable is scoped to the current workflow run. If streaming status to UI is needed for the prospection pipeline, use `getWritable()` inside workflow steps — but for the prospection domain, streaming is optional. The simpler pattern is polling run status via `GET /api/prospection/runs?runId=` (mirrors `app/api/radar/runs/route.ts`) plus React Query poll on the `/api/prospection/companies` endpoint.

4. **Step return values are serialized.** All step return values must be JSON-serializable. No class instances, no functions, no undefined values in returned objects.

5. **Parallel collectors with Promise.all inside one step.** The `runCollectors` step runs all collectors in a single `'use step'` block using `Promise.all`. This is the existing radar pattern (see `fetchAllLinkedInSignals`). This limits granular per-collector error attribution but avoids the complexity of N separate steps.

### LLM Step: Score Justification + Call Pitch

The scoring LLM call uses `generateText` (not `streamText`) because the output is short (2 fields) and does not need streaming to the UI. Wrap it in the existing `resolveLlmTask` pattern with a dedicated task key:

```typescript
// lib/llm/task-keys.ts — add:
PROSPECTION_SCORE_SYNTHESIS: 'prospection_score_synthesis'

// lib/prospection/scoring-llm.ts
export async function generateScoreSynthesis(
  company: { name: string; sector?: string },
  signals: ScoringSignal[],
): Promise<{ justification: string; callPitch: string }> {
  const task = await resolveLlmTask(TASK_KEY.PROSPECTION_SCORE_SYNTHESIS, { company, signals });
  const { text } = await generateText({ model: task.model, system: task.system, prompt: task.prompt });
  // parse structured JSON from text
}
```

The prompt for this task lives in the `llm_tasks` DB table (same admin-editable pattern as all other tasks).

---

## SIREN Reconciliation

### Strategy (from radar reference pattern)

The SIREN is the primary reconciliation key across runs. The lookup order is:

1. **SIREN exact match** on `(org_id, siren)` — guaranteed unique by DB constraint
2. **Fallback: normalized name match** — strip legal suffixes (SAS, SARL, SA...), accents, punctuation; case-insensitive compare across all org companies
3. **Create** if neither matches

This is identical to `findOrCreateCompany` in `lib/radar/queries.ts`. The new code copies this logic under `lib/prospection/queries.ts`.

### Cross-Run Dedup for Signals

A signal is deduplicated within a run by `(company_id, source, title)` where `expires_at >= now()`. If an identical active signal exists, update its metadata/weight. If expired or absent, insert new. This prevents score inflation from repeated cron runs.

---

## Contact Enrichment Gating

Contact enrichment is the most expensive operation (Proxycurl charges per profile lookup). The gate:

1. Only companies with `prospection_scores.score >= threshold` (default 60, configurable per automation)
2. Only companies where `prospection_contacts` is empty OR `last_enriched_at < 7 days ago`
3. Hard limit: 20 companies per run (prevent runaway credit burn)

This mirrors `enrichHotProspects` in `lib/radar/queries.ts`. In the prospection domain it becomes `enrichHotProspectContacts` in `lib/prospection/queries.ts`.

The enrichment source is Proxycurl (already wired in `lib/radar/collectors/proxycurl.ts` and `lib/radar/collectors/linkedin-enrichment.ts`). The new prospection enrichment collector calls the same Proxycurl REST endpoints but writes to `prospection_contacts` instead of `radar_companies.enrichment_data`.

---

## New vs Modified Components

### New (all under prospection domain)

| Component | What it is |
|-----------|-----------|
| `supabase/migrations/[ts]_prospection_tables.sql` | 7 new tables with RLS, indexes |
| `lib/prospection/schemas.ts` | Zod schemas for AutomationCriteria, RawProspectionSignal, ProspectScore, Contact, ProspectListItem, ProspectDetail, ProspectAction |
| `lib/prospection/queries.ts` | findOrCreateProspectCompany, upsertSignals, listProspectCompanies, getProspectDetail, enrichHotProspectContacts, recordProspectAction, insertRunLog |
| `lib/prospection/scoring.ts` | computeProspectScore() deterministic (port of radar scoring.ts with prospection signal sources) |
| `lib/prospection/scoring-llm.ts` | generateScoreSynthesis() — LLM call for justification + pitch |
| `lib/prospection/collectors/france-travail.ts` | France Travail Offres d'emploi REST API (free, OAuth2 client credentials) |
| `lib/prospection/collectors/sirene.ts` | SIRENE/INSEE API for company lookup + SIREN resolution |
| `lib/prospection/collectors/proxycurl.ts` | Thin wrapper re-exporting from lib/radar/collectors/proxycurl.ts OR a new file specific to prospection signal shape |
| `app/api/prospection/automations/route.ts` | GET (list), POST (create) automation configs |
| `app/api/prospection/automations/[id]/route.ts` | GET, PATCH, DELETE |
| `app/api/prospection/automations/[id]/run/route.ts` | POST — manual trigger, returns { runId } |
| `app/api/prospection/companies/route.ts` | GET — list with filters, sorted by score |
| `app/api/prospection/companies/[id]/route.ts` | GET — company detail |
| `app/api/prospection/companies/[id]/actions/route.ts` | POST — record to_call / called / dismissed |
| `app/api/prospection/cron/collect/route.ts` | GET (Vercel cron) + POST (manual) |
| `app/api/prospection/runs/route.ts` | GET ?runId= — poll workflow run status (mirrors radar runs route) |
| `app/api/prospection/workflows/collect-signals.workflow.ts` | Main orchestration workflow |
| `lib/queries/prospection.ts` | React Query hooks: useProspections, useProspectDetail, useRunAutomation, useAutomations, useProspectionRunStatus |
| `app/prospection/page.tsx` | Company list sorted by heat score, filters, manual trigger button |
| `app/prospection/[companyId]/page.tsx` | Company detail: signals timeline, contacts, call pitch, action buttons |
| `app/prospection/settings/page.tsx` | Automation configs CRUD (criteria, source toggles) |
| `lib/llm/task-keys.ts` | Add PROSPECTION_SCORE_SYNTHESIS key |
| DB `llm_tasks` row | New row for prospection_score_synthesis prompt |

### Modified (minimal surface)

| Component | What changes |
|-----------|-------------|
| `components/authenticated-shell.tsx` | Add `/prospection` nav item in sidebar |
| `middleware.ts` | Add `/prospection` to protected routes pattern (already catches all non-public routes) — likely no change needed |
| `vercel.json` | Add prospection cron entry: `{ "path": "/api/prospection/cron/collect", "schedule": "0 8 * * *" }` |
| `lib/llm/task-keys.ts` | Add `PROSPECTION_SCORE_SYNTHESIS` constant |

**Zero changes to:** existing candidate/mission/positioning API routes, existing workflow files, existing DB tables, Clerk/Supabase client setup.

---

## Patterns to Follow

### Pattern: Step-per-stage, error isolation per step

Each workflow step wraps collector calls with try-catch and returns partial results rather than throwing:

```typescript
async function runFranceTravailCollector(criteria: AutomationCriteria) {
  'use step';
  try {
    return await collectFranceTravailSignals(criteria);
  } catch (error) {
    console.error('[prospection][france-travail]', error);
    return { signals: [], calls: [], error: String(error) };
  }
}
```

This mirrors the try-catch-per-signal pattern in `upsertSignals`. If France Travail is down, the run continues with signals from other sources.

### Pattern: Dual-trigger route (existing radar pattern)

```
GET /api/prospection/cron/collect  → Vercel cron (secret header check)
POST /api/prospection/cron/collect → Manual trigger (requireOrgAdmin)
```

Both call `start(collectSignalsWorkflow, ...)`. The POST returns `{ runId }` so the UI can poll.

### Pattern: React Query + run polling for workflow status

Since prospection workflows do not stream NDJSON (optional), the UI uses polling:

```typescript
// lib/queries/prospection.ts
export function useProspectionRunStatus(runId: string | null) {
  return useQuery({
    queryKey: ['prospection-run', runId],
    queryFn: () => fetch(`/api/prospection/runs?runId=${runId}`).then(r => r.json()),
    enabled: !!runId,
    refetchInterval: (query) => {
      const status = query.state.data?.runs?.[0]?.status;
      return status === 'running' ? 2000 : false; // poll every 2s while running
    },
  });
}
```

On completion, invalidate `['prospection', orgId]` to refresh the company list.

### Pattern: SIREN-first reconciliation (existing radar pattern, ported verbatim)

`findOrCreateProspectCompany` in `lib/prospection/queries.ts` is a direct port of `findOrCreateCompany` in `lib/radar/queries.ts` with the table name changed from `radar_companies` to `prospection_companies`.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing contacts in company.enrichment_data JSONB

The radar code stores contacts in `radar_companies.enrichment_data` as a JSONB blob. This makes contacts unqueryable, unmaintainable, and hard to expire individually.

**Prospection must use a dedicated `prospection_contacts` table** — contacts are first-class, filterable, and enrichment status is per-contact.

### Anti-Pattern 2: Scoring inside the collector step

Collector and scoring are separate concerns. Mixing them (collect + score in one step) makes the scoring unreproducible on demand and prevents re-scoring existing signals without re-collecting.

**Keep them as separate steps.** The score step reads from `prospection_signals`, not from collector output.

### Anti-Pattern 3: Parallel workflows per source

The radar cron starts multiple separate workflows per org (`collect-linkedin`, `collect-linkedin-discovery`). This creates management overhead (multiple runIds to poll, risk of race conditions on score computation).

**For prospection, use a single workflow per automation run** — one `collectSignalsWorkflow` that fans out to collectors internally via `Promise.all` inside a single `'use step'`. One runId per run to track.

### Anti-Pattern 4: Enriching all companies above threshold every run

If threshold is score >= 60 and there are 50 hot companies, enriching all 50 per daily cron = 50 Proxycurl calls/day = expensive. The 7-day cache check (already in `enrichHotProspects`) is mandatory.

**Always check `last_enriched_at` before calling Proxycurl.** Re-enrich only if > 7 days since last enrichment.

### Anti-Pattern 5: Collecting all orgs in a single workflow

The radar cron loops all org IDs and starts one workflow per org sequentially. This creates long cron runtime on Vercel (serverless function timeout risk).

**For prospection cron:** iterate org automations and start each as a separate `start()` call (fire-and-forget). The cron route returns after starting all workflows; execution happens async in @workflow/next's durable runtime, not in the cron function itself.

---

## Scalability Considerations

| Concern | At 1 org | At 10 orgs | At 100 orgs |
|---------|----------|------------|-------------|
| Cron execution | Single workflow, ~30s | 10 parallel workflows (start and forget) | Needs cron batching or separate cron per org |
| Proxycurl credits | 20 enrichments/run = controllable | 200/run = watch quota | Needs org-level enrichment budget |
| Signal table growth | ~100 signals/run, expires in 90d | ~1K/run | Needs partition by org_id + automated cleanup |
| Score computation | In-memory, trivial | Still in-memory | Still in-memory until >10K companies |
| France Travail rate limit | ~5 req/s free tier | Risk of 429 with parallel runs | Needs per-collector rate limiter |

---

## Suggested Build Order

The order respects data dependencies: you cannot score without signals, cannot enrich without scores, cannot show UI without data.

**Phase 1 — DB + Schema Foundation**
- Migration: 7 new tables with RLS and indexes
- `lib/prospection/schemas.ts` — Zod types for all entities
- `lib/prospection/queries.ts` — SIREN reconciliation, upsertSignals, basic CRUD
- No workflow, no UI. Testable via Supabase Studio.

**Phase 2 — First Collector + Scoring (no LLM)**
- `lib/prospection/collectors/france-travail.ts` — France Travail Offres API (free, no auth complexity)
- `lib/prospection/scoring.ts` — deterministic computeProspectScore() (port of radar scoring.ts)
- `app/api/prospection/workflows/collect-signals.workflow.ts` — first version with France Travail only
- `app/api/prospection/cron/collect/route.ts` — dual-trigger route
- Vercel cron entry in `vercel.json`
- Testable end-to-end: trigger → signals → scores in DB

**Phase 3 — Additional Collectors + SIREN Resolution**
- `lib/prospection/collectors/sirene.ts` — SIRENE/INSEE API for SIREN lookup
- `lib/prospection/collectors/proxycurl.ts` — LinkedIn headcount/job changes (existing Proxycurl key)
- Add collectors to `runCollectors` step in workflow
- SIREN reconciliation exercised with multi-source signals

**Phase 4 — LLM Scoring Synthesis**
- `lib/prospection/scoring-llm.ts` — generateScoreSynthesis()
- Add `PROSPECTION_SCORE_SYNTHESIS` task key + DB prompt row
- `scoreAndEnrich` step: deterministic score first, then LLM for justification + call_pitch
- LLM output written to `prospection_scores.justification` + `prospection_scores.call_pitch`

**Phase 5 — Contact Enrichment**
- `enrichHotProspectContacts()` in `lib/prospection/queries.ts`
- `prospection_contacts` table wired
- Threshold gate enforced (score >= 60, 7-day cache, limit 20/run)
- Contacts visible in company detail

**Phase 6 — Automation Config UI + Actions**
- `app/prospection/settings/page.tsx` — CRUD for automations (criteria, source toggles)
- `app/prospection/page.tsx` — company list sorted by heat
- `app/prospection/[companyId]/page.tsx` — detail panel: signals, contacts, call pitch, action buttons
- `prospection_actions` table + API route for to_call / called / dismissed
- Manual trigger button → POST /api/prospection/automations/[id]/run → polling via `useProspectionRunStatus`
- Sidebar nav entry added

---

## Integration Points with Existing Architecture

| Existing piece | How prospection uses it |
|---------------|------------------------|
| `lib/utils/auth.ts` — `requireOrgId()`, `requireOrgAdmin()`, `requireOrgContext()` | Used in all prospection API routes — identical pattern |
| `lib/utils/supabase.ts` — `getSupabase()` | Used in all prospection queries and workflow steps |
| `lib/ai.ts` — `createGatewayLanguageModel()` | Used in `scoring-llm.ts` for generateText call |
| `lib/llm/resolve-task.ts` — `resolveLlmTask()` | Used in `scoring-llm.ts` to resolve prompt from DB |
| `lib/llm/task-keys.ts` — `TASK_KEY` | Extended with `PROSPECTION_SCORE_SYNTHESIS` |
| `workflow/api` — `start()`, `getRun()` | Used in cron/manual trigger routes and run status route |
| `lib/services/ai-usage.service.ts` — `logAiUsage()` | Used in `scoring-llm.ts` to track LLM cost |
| `components/ui/` (shadcn) | Used in all prospection UI pages |
| Proxycurl collectors (`lib/radar/collectors/proxycurl.ts`) | Referenced or thin-wrapped for contact enrichment |
| `useWorkflowStream` hook (optional) | Can be used if NDJSON streaming is added to the workflow; not required for MVP |

---

## Sources

- Existing `lib/radar/queries.ts` — SIREN reconciliation, enrichment gating pattern (HIGH confidence)
- Existing `lib/radar/collectors/` + `app/api/radar/workflows/` — collector + workflow step pattern (HIGH confidence)
- Existing `app/api/radar/cron/` — dual-trigger cron pattern (HIGH confidence)
- Existing `workflows/extract-cv.ts` — @workflow/next step structure and getWritable pattern (HIGH confidence)
- `.planning/PROJECT.md` — v1.3 feature scope, signal sources, constraints (HIGH confidence)
- `.planning/codebase/ARCHITECTURE.md` — layer structure, entry points (HIGH confidence)
