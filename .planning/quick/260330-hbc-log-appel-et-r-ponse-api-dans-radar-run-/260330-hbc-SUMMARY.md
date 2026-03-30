---
phase: quick
plan: 260330-hbc
subsystem: radar
tags: [radar, observability, api-tracing, run-logs]
dependency_graph:
  requires: []
  provides: [ApiCall type, collector call tracing, expandable run log UI]
  affects: [lib/radar/collectors, app/api/radar/workflows, radar settings page]
tech_stack:
  added: []
  patterns: [collector result tuple { signals, calls }, lean responseData, expandable table rows]
key_files:
  created:
    - app/(dashboard)/radar/components/run-log-table.tsx
  modified:
    - lib/radar/schemas.ts
    - lib/radar/collectors/jobs.ts
    - lib/radar/collectors/boamp.ts
    - lib/radar/collectors/press.ts
    - lib/radar/collectors/linkedin.ts
    - app/api/radar/workflows/collect-jobs.workflow.ts
    - app/api/radar/workflows/collect-boamp.workflow.ts
    - app/api/radar/workflows/collect-press.workflow.ts
    - app/api/radar/workflows/collect-linkedin.workflow.ts
    - app/(dashboard)/radar/settings/page.tsx
decisions:
  - Skip ApiCall tracking for enrichment workflow — enrichCompany call chain too deep to refactor without cascading changes
  - responseData uses lean summaries only: counts, truncated names, no markdown or HTML
metrics:
  duration: ~15min
  completed: 2026-03-30
  tasks_completed: 3
  files_changed: 10
---

# Quick 260330-hbc: Log API calls and responses in radar run logs

**One-liner:** ApiCall type added to schemas + all 4 collectors return { signals, calls } + run logs now store per-request traces + settings page expandable rows.

## What Was Done

### Task 1: ApiCall type + collector refactor

Added `export type ApiCall` to `lib/radar/schemas.ts` with fields: `endpoint`, `status`, `ok`, `responseData`.

All 4 collectors now return `Promise<{ signals: RawSignal[]; calls: ApiCall[] }>` instead of `Promise<RawSignal[]>`:

- **jobs.ts** — tracks Cloudflare `/json` endpoint per query. On success: `{ resultCount, sample }`. On error: `{ errorSnippet }`.
- **boamp.ts** — tracks Cloudflare `/scrape` endpoint. On success: `{ itemCount }`. On error: `{ errorSnippet }`.
- **press.ts** — tracks Firecrawl `/v2/scrape` per RSS URL (with `{ markdownLength }`) + LLM call per article (with `{ signalCount, model }`).
- **linkedin.ts** — tracks 3 Proxycurl endpoints per company URL: employees (`{ employeeCount }`), company (`{ name }`), job listings (`{ jobCount }`).

### Task 2: Workflow updates

All 4 collect workflows (`collect-jobs`, `collect-boamp`, `collect-press`, `collect-linkedin`) updated to:
1. Destructure `{ signals, calls }` from the collector call
2. Pass `calls` through in the `result` object to `insertRunLog`
3. Use explicit `RawSignal[]` parameter types on persist steps (replacing `Awaited<ReturnType<...>>`)

Result: `radar_run_logs.result` now stores `{ collected, persisted, calls: [...] }` for new runs.

### Task 3: RunLogTable component + settings page

Created `app/(dashboard)/radar/components/run-log-table.tsx` as a `'use client'` component:
- Renders a Table with chevron icons on rows that have API calls
- Clicking a row with calls toggles an expanded detail row showing each ApiCall as formatted JSON
- Status badge (default = ok, destructive = error), endpoint URL truncated, lean responseData in `<pre>`
- Rows with no calls are non-expandable (no chevron)

Settings page `app/(dashboard)/radar/settings/page.tsx` updated to import and render `<RunLogTable logs={runLogs} />`, removing the old inline static Table JSX and unused Table imports.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | a72cfaa | ApiCall type + collector refactor |
| 2 | 402a3f0 | Workflow destructure + pass calls to run logs |
| 3 | 6b2857c | RunLogTable component + settings page wired |

## Deviations from Plan

### Skipped
**Enrichment collector (linkedin-enrichment.ts):** The plan explicitly decided to skip ApiCall tracking for the enrichment workflow. The `enrichCompany` call chain (queries.ts → enrichCompany → resolveCompanyLinkedInUrl + findDecisionMakers) is too deep for clean refactoring without cascading changes to function signatures across multiple files. Enrichment run logs will continue to show `{ enriched: N }` with no calls field — acceptable per plan spec.

No other deviations.

## Known Stubs

None — all wired end-to-end. The `calls` array is populated on every collector run and stored in `radar_run_logs.result.calls`.

## Self-Check: PASSED

- `lib/radar/schemas.ts` — ApiCall type exported: confirmed
- `lib/radar/collectors/jobs.ts` — returns `{ signals, calls }`: confirmed (line 128)
- `lib/radar/collectors/boamp.ts` — returns `{ signals, calls }`: confirmed (line 155)
- `lib/radar/collectors/press.ts` — returns `{ signals, calls }`: confirmed (line 130)
- `lib/radar/collectors/linkedin.ts` — returns `{ signals, calls }`: confirmed (line 239)
- `app/(dashboard)/radar/components/run-log-table.tsx` — created with `'use client'`: confirmed
- `app/(dashboard)/radar/settings/page.tsx` — imports and renders RunLogTable: confirmed (line 49)
- TypeScript: zero errors across all modified files
