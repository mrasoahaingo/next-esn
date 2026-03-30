---
phase: quick
plan: 260330-hbc
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/radar/schemas.ts
  - lib/radar/collectors/jobs.ts
  - lib/radar/collectors/boamp.ts
  - lib/radar/collectors/press.ts
  - lib/radar/collectors/linkedin.ts
  - lib/radar/collectors/linkedin-enrichment.ts
  - app/api/radar/workflows/collect-jobs.workflow.ts
  - app/api/radar/workflows/collect-boamp.workflow.ts
  - app/api/radar/workflows/collect-press.workflow.ts
  - app/api/radar/workflows/collect-linkedin.workflow.ts
  - app/api/radar/workflows/enrich-linkedin.workflow.ts
  - app/(dashboard)/radar/components/run-log-table.tsx
  - app/(dashboard)/radar/settings/page.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Each collector returns { signals, calls } — signals unchanged, calls contains one ApiCall per HTTP request made"
    - "Each workflow step passes calls into insertRunLog via result.calls"
    - "radar_run_logs.result.calls is a JSON array of ApiCall objects with lean responseData (no full HTML/markdown)"
    - "Settings page run log table has expandable rows — clicking a row reveals result.calls as formatted JSON"
  artifacts:
    - path: "lib/radar/schemas.ts"
      provides: "ApiCall type export"
      contains: "export type ApiCall"
    - path: "app/(dashboard)/radar/components/run-log-table.tsx"
      provides: "RunLogTable client component with expandable rows"
      exports: ["RunLogTable"]
  key_links:
    - from: "lib/radar/collectors/*.ts"
      to: "lib/radar/schemas.ts"
      via: "import { type ApiCall }"
    - from: "app/api/radar/workflows/*.workflow.ts"
      to: "lib/radar/queries.ts"
      via: "insertRunLog(..., { ..., calls })"
    - from: "app/(dashboard)/radar/settings/page.tsx"
      to: "app/(dashboard)/radar/components/run-log-table.tsx"
      via: "RunLogTable component replacing static Table"
---

<objective>
Store the raw API call metadata + lean response data in radar_run_logs.result.calls so admins can inspect what each collector actually did — which endpoints were hit, HTTP status, and a summary of what came back.

Purpose: Debugging radar runs without needing server logs. Each run log row in the settings page expands to show the API call trace.
Output: ApiCall type, refactored collectors, updated workflows, RunLogTable component with expandable rows.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.planning/STATE.md

<interfaces>
<!-- Key existing contracts -->

From lib/radar/schemas.ts (current exports — add ApiCall here):
```typescript
export type RawSignal = z.infer<typeof RawSignalSchema>;
// No ApiCall type yet — must be added
```

From lib/radar/queries.ts:
```typescript
export async function insertRunLog(
  orgId: string,
  source: 'jobs' | 'boamp' | 'press' | 'linkedin' | 'scoring' | 'enrichment',
  result: Record<string, unknown>,  // <-- calls array goes in here as result.calls
): Promise<void>

export async function listRunLogs(orgId: string, limit = 100): Promise<Array<{
  id: string;
  source: string;
  result: Record<string, unknown>;  // contains { collected, persisted, calls: ApiCall[] }
  logged_at: string;
}>>
```

Current collector return types:
```typescript
collectJobOffers(queries: string[]): Promise<RawSignal[]>
collectPublicMarkets(): Promise<RawSignal[]>
collectPressSignals(rssUrls: string[]): Promise<RawSignal[]>
collectLinkedInSignals(companyUrls: string[]): Promise<RawSignal[]>

// enrichment functions — no return type change needed, calls collected internally
enrichCompany(company): Promise<{ linkedinUrl: string | null; contacts: Contact[] }>
```

Current workflow pattern (collect-jobs.workflow.ts as example):
```typescript
async function fetchJobSignals(orgId: string) {
  'use step';
  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.jobs) return [];
  return collectJobOffers(settings.jobSearchQueries);
  // Must change to: return collectJobOffers(settings.jobSearchQueries)
  //   and destructure { signals, calls } in the workflow function
}
async function logJobRun(orgId: string, result: { collected: number; persisted: number }) {
  'use step';
  await insertRunLog(orgId, 'jobs', result);
  // Must change result type to include calls: ApiCall[]
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add ApiCall type and refactor all collectors to return { signals, calls }</name>
  <files>
    lib/radar/schemas.ts
    lib/radar/collectors/jobs.ts
    lib/radar/collectors/boamp.ts
    lib/radar/collectors/press.ts
    lib/radar/collectors/linkedin.ts
    lib/radar/collectors/linkedin-enrichment.ts
  </files>
  <action>
**1. lib/radar/schemas.ts** — append at end of file:
```typescript
export type ApiCall = {
  endpoint: string;       // URL called (no auth tokens, clean URL)
  status: number;         // HTTP status code
  ok: boolean;
  responseData: unknown;  // Lean summary — see rules below
};
```

**ResponseData leanness rules (apply in every collector):**
- For JSON extraction responses: `{ resultCount: number, sample?: string }` where sample is first entry title/company truncated to 200 chars. No full arrays.
- For scrape responses: `{ itemCount: number }`.
- For LLM extraction calls: `{ signalCount: number, model: string }`.
- For Proxycurl person search: `{ resultCount: number, firstTitle?: string }` (first result's headline, max 200 chars).
- For failed calls (non-ok): `{ errorSnippet: string }` — first 200 chars of response text.
- Never store markdown, HTML, or rawContent in responseData.

**2. lib/radar/collectors/jobs.ts** — change `collectJobOffers` return type from `Promise<RawSignal[]>` to `Promise<{ signals: RawSignal[]; calls: ApiCall[] }>`:
- Add `const calls: ApiCall[] = []` at top of function body.
- After each `fetch` resolves, push to calls:
  - On non-ok response: `calls.push({ endpoint: CF_BASE + '/json', status: response.status, ok: false, responseData: { errorSnippet: (await response.text()).slice(0, 200) } })` then continue.
  - On ok response after parsing: `calls.push({ endpoint: CF_BASE + '/json', status: response.status, ok: true, responseData: { resultCount: json.result?.length ?? 0, sample: json.result?.[0]?.title?.slice(0, 200) ?? null } })`.
- Change final `return signals` to `return { signals, calls }`.

**3. lib/radar/collectors/boamp.ts** — change `collectPublicMarkets` to return `Promise<{ signals: RawSignal[]; calls: ApiCall[] }>`:
- Add `const calls: ApiCall[] = []` at top of function body.
- After the single `fetch` to CF_BASE + '/scrape':
  - Non-ok: push error call then `return { signals: [], calls }`.
  - Ok: push `{ endpoint: CF_BASE + '/scrape', status: response.status, ok: true, responseData: { itemCount: results.length } }`.
- Change `return signals` → `return { signals, calls }` and `return []` → `return { signals: [], calls }`.

**4. lib/radar/collectors/press.ts** — change `collectPressSignals` to return `Promise<{ signals: RawSignal[]; calls: ApiCall[] }>`:
- Add `const calls: ApiCall[] = []` at function body start.
- After each Firecrawl `fetch`:
  - Non-ok: push error call, continue.
  - Ok: push `{ endpoint: 'https://api.firecrawl.dev/v2/scrape', status: scrapeResponse.status, ok: true, responseData: { markdownLength: markdown.length } }`.
- After each `generateObject` LLM call completes (inside the try), push:
  `calls.push({ endpoint: 'llm/gemini-2.5-flash', status: 200, ok: true, responseData: { signalCount: parsed.data.signals.length, model: 'google/gemini-2.5-flash' } })`.
- Change `return signals` → `return { signals, calls }`.

**5. lib/radar/collectors/linkedin.ts** — change `collectLinkedInSignals` to return `Promise<{ signals: RawSignal[]; calls: ApiCall[] }>`:
- Add `const calls: ApiCall[] = []` at function body start.
- After each of the 3 Proxycurl fetches (employees, company, job_listings), push the call using the full URL (without the auth Bearer token, just the endpoint path + query). Use `new URL(response.url).pathname` or build from the constructed URL string. Status and ok from response.
  - employees ok: `responseData: { employeeCount: employeesJson.employees?.length ?? 0 }`.
  - company ok: `responseData: { name: companyJson.name ?? null }`.
  - job_listings ok: `responseData: { jobCount: jobsJson.job?.length ?? 0 }`.
  - Any non-ok: `responseData: { errorSnippet: String(response.status) }`.
- Change `return signals` → `return { signals, calls }`.

**6. lib/radar/collectors/linkedin-enrichment.ts** — `enrichCompany` does NOT need a return type change (the workflow calls it separately). Instead, add internal calls accumulation to `resolveCompanyLinkedInUrl` and `findDecisionMakers` and have them each return `{ result, calls }` tuples — BUT this would cascade changes broadly. **Simpler approach:** add calls accumulation only inside `enrichCompany` itself, building calls from calls made in `resolveCompanyLinkedInUrl` and `findDecisionMakers`. Add a second overload/wrapper `enrichCompanyWithCalls` that returns `{ linkedinUrl, contacts, calls: ApiCall[] }`. Then update `lib/radar/queries.ts`'s `enrichProspectLinkedIn` to call `enrichCompanyWithCalls` and pass calls through to a run log (NOT needed — enrichment workflow already calls `insertRunLog` separately, so just log calls there).

Actually, simpler: Do NOT refactor `enrichCompany` internals. Instead, add `calls` tracking **directly in the enrichment workflow step** by wrapping the Proxycurl fetches at the `queries.ts` level is too complex. **Decision: Skip ApiCall tracking for enrichment** — the enrichment workflow (enrich-linkedin.workflow.ts) only calls `enrichHotProspects` which calls `enrichCompany` per company. Changing the call chain is too deep. The `enrichment` run log will have `{ enriched: N }` with no calls — which is acceptable for this task. No changes needed to linkedin-enrichment.ts or queries.ts for enrichment.
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>All 5 collectors compile with new return type { signals: RawSignal[]; calls: ApiCall[] }. ApiCall type exported from lib/radar/schemas.ts. No TypeScript errors in changed files.</done>
</task>

<task type="auto">
  <name>Task 2: Update workflows to destructure calls and pass them into run logs</name>
  <files>
    app/api/radar/workflows/collect-jobs.workflow.ts
    app/api/radar/workflows/collect-boamp.workflow.ts
    app/api/radar/workflows/collect-press.workflow.ts
    app/api/radar/workflows/collect-linkedin.workflow.ts
  </files>
  <action>
For each of the 4 collect workflows, the pattern is identical:

**collect-jobs.workflow.ts:**
```typescript
// fetchJobSignals step: return full { signals, calls } object
async function fetchJobSignals(orgId: string) {
  'use step';
  const settings = await getRadarSettings(orgId);
  if (!settings.enabledSources.jobs) return { signals: [], calls: [] };
  return collectJobOffers(settings.jobSearchQueries);  // now returns { signals, calls }
}

// persistJobSignals step: accept signals only
async function persistJobSignals(orgId: string, signals: RawSignal[]) {
  'use step';
  return upsertSignals(orgId, signals);
}

// logJobRun step: accept calls in result
async function logJobRun(orgId: string, result: { collected: number; persisted: number; calls: ApiCall[] }) {
  'use step';
  await insertRunLog(orgId, 'jobs', result);
}

// workflow: destructure { signals, calls }
export async function collectJobsWorkflow(orgId: string) {
  'use workflow';
  const { signals, calls } = await fetchJobSignals(orgId);
  const persisted = await persistJobSignals(orgId, signals);
  const result = { collected: signals.length, persisted, calls };
  await logJobRun(orgId, result);
  return { collected: signals.length, persisted };
}
```

Apply the same pattern to `collect-boamp.workflow.ts`, `collect-press.workflow.ts`, and `collect-linkedin.workflow.ts`.

For `collect-linkedin.workflow.ts`, the existing `fetchLinkedInSignals(urls)` step calls `collectLinkedInSignals(urls)` — update it to return `{ signals, calls }`. The workflow destructures and passes calls to `logLinkedInRun`.

Add `import type { ApiCall } from '@/lib/radar/schemas'` import to each workflow file.
Add `import type { RawSignal } from '@/lib/radar/schemas'` if not already imported (for persistStep parameter type).

**score-prospects.workflow.ts and enrich-linkedin.workflow.ts:** No changes — they don't call collectors with the new return type.
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>All 4 collect workflows compile. TypeScript infers calls array from collector return types. insertRunLog called with result.calls included.</done>
</task>

<task type="auto">
  <name>Task 3: Create RunLogTable component and wire into settings page</name>
  <files>
    app/(dashboard)/radar/components/run-log-table.tsx
    app/(dashboard)/radar/settings/page.tsx
  </files>
  <action>
**1. Create app/(dashboard)/radar/components/run-log-table.tsx** as a `'use client'` component:

```typescript
'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ApiCall } from '@/lib/radar/schemas';

type RunLog = {
  id: string;
  source: string;
  result: Record<string, unknown>;
  logged_at: string;
};

export function RunLogTable({ logs }: { logs: RunLog[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (logs.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">Aucun run enregistré.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Source</TableHead>
          <TableHead>Résultats</TableHead>
          <TableHead className="text-right">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => {
          const calls = Array.isArray(log.result.calls) ? (log.result.calls as ApiCall[]) : [];
          const summaryFields = Object.entries(log.result)
            .filter(([k]) => k !== 'calls')
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(' · ');
          const isOpen = expanded.has(log.id);

          return (
            <>
              <TableRow
                key={log.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => calls.length > 0 && toggle(log.id)}
              >
                <TableCell className="text-muted-foreground">
                  {calls.length > 0 ? (
                    isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
                  ) : null}
                </TableCell>
                <TableCell className="font-medium">{log.source}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{summaryFields}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {new Date(log.logged_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </TableCell>
              </TableRow>
              {isOpen && (
                <TableRow key={`${log.id}-detail`}>
                  <TableCell colSpan={4} className="bg-muted/30 px-4 py-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{calls.length} appels API</p>
                      <div className="space-y-1.5">
                        {calls.map((call, i) => (
                          <div key={i} className="rounded border border-border/60 bg-background p-2 text-xs font-mono">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={call.ok ? 'default' : 'destructive'} className="text-[10px] h-4 px-1">
                                {call.status}
                              </Badge>
                              <span className="truncate text-muted-foreground">{call.endpoint}</span>
                            </div>
                            <pre className="text-[11px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                              {JSON.stringify(call.responseData, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          );
        })}
      </TableBody>
    </Table>
  );
}
```

**2. Update app/(dashboard)/radar/settings/page.tsx:**
- Add import: `import { RunLogTable } from '@/app/(dashboard)/radar/components/run-log-table'`
- Remove imports for `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` (only if unused elsewhere in the file — check first; they are only used in the run log section, so remove them)
- Replace the entire run log CardContent JSX (the `{runLogs.length === 0 ? ... : <Table>...</Table>}` block) with:
  ```tsx
  <RunLogTable logs={runLogs} />
  ```
- The CardHeader with `<CardTitle>Historique des runs</CardTitle>` stays unchanged.
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit 2>&1 | head -40</automated>
  </verify>
  <done>
    - RunLogTable component exists with 'use client' directive
    - Settings page imports and renders RunLogTable instead of inline Table
    - No TypeScript errors across all modified files
    - Run log rows with calls array show chevron icon and expand on click to reveal formatted ApiCall JSON
  </done>
</task>

</tasks>

<verification>
After all tasks:
```bash
cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit
```
Zero TypeScript errors in all modified files.

Spot-check the call chain:
- `grep -n "return { signals, calls }" lib/radar/collectors/*.ts` — should match all 4 collectors (jobs, boamp, press, linkedin)
- `grep -n "result.calls\|calls }" app/api/radar/workflows/*.workflow.ts` — should match 4 workflows
- `grep -n "RunLogTable" app/(dashboard)/radar/settings/page.tsx` — should match
</verification>

<success_criteria>
1. All 4 collectors (jobs, boamp, press, linkedin) return `{ signals: RawSignal[]; calls: ApiCall[] }` — no breaking change to signals.
2. All 4 collect workflows pass `calls` through to `insertRunLog` in `result.calls`.
3. `radar_run_logs.result` now contains `{ collected, persisted, calls: [...] }` for new runs.
4. Settings page renders `RunLogTable` — rows without calls are non-expandable, rows with calls expand to show per-call status badge, endpoint URL, and lean responseData JSON.
5. `enrichment` and `scoring` run logs are unaffected (no calls field, no regression).
6. `responseData` never contains raw markdown, HTML, or full offer arrays — only counts, names, and truncated snippets ≤ 200 chars.
</success_criteria>

<output>
After completion, create `.planning/quick/260330-hbc-log-appel-et-r-ponse-api-dans-radar-run-/260330-hbc-SUMMARY.md` with what was done, files changed, and any decisions made.
</output>
