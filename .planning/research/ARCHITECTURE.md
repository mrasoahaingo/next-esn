# Architecture Patterns: Workflow State Propagation

**Domain:** Async AI workflow state synchronization — server to React UI
**Researched:** 2026-03-26
**Overall confidence:** HIGH (codebase directly inspected + patterns verified)

---

## Context: What the Codebase Actually Does

Before recommending patterns, here is what already exists. Understanding this prevents unnecessary rewrites.

### Current Mechanism

The app uses `@workflow/next` (4.0.1-beta) which wraps Vercel Workflow DevKit. The workflow runtime exposes a `ReadableStream` of NDJSON chunks when a run starts. The current flow is:

```
User action
  → POST /api/extract (or /api/positioning/generate, /api/positioning/analyze)
  → workflow runtime: start(workflowFn, args) → returns { runId, readable }
  → API stores runId + status in Supabase (candidates.workflow_run_id, status: 'extracting')
  → API returns the ReadableStream directly as the HTTP response body
  → Client useWorkflowStream hook: reads NDJSON from the open POST response
  → NDJSON chunks: { index, data: Partial<T>, meta: { phase, activeBranches } }
  → On stream end: onFinish() → React Query invalidation → refetch from Supabase
```

Reconnection path (page reload while workflow running):
```
runId in Supabase → React Query feeds runId + status into useWorkflowStream
  → useWorkflowStream sees runId + active status → GET /api/workflow/[runId]/stream
  → workflow runtime: getRun(runId).getReadable({ startIndex }) → resumes stream
```

Cancel path:
```
User click → POST /api/workflow/[runId]/cancel
  → world.events.create(runId, { eventType: 'run_cancelled' })
  → Supabase: status reset + workflow_run_id: null
```

Status polling (fallback, non-streaming):
```
React Query refetchInterval: 3000ms when status in ['extracting', 'analyzing', 'generating']
  → falls back to 60_000ms when idle
```

**Key insight:** The architecture is already correct in its broad shape. The problem is not the pattern — it is gaps in the execution of the pattern. The Supabase `status` column is the ground truth. The stream is a live view that races to completion ahead of the database settling.

---

## The Four Patterns — Evaluated Against This Stack

### Pattern 1: Polling (Current partial implementation)

React Query `refetchInterval` on the detail query. Already present for candidates and positionings.

**Current implementation:**
```typescript
// lib/queries/candidates.ts
refetchInterval: (query) => {
  const data = query.state.data as { status: string } | undefined;
  if (data?.status && ACTIVE_CV_STATUSES.includes(data.status)) return 3000;
  return false;
},
```

**Strengths:** Simple, resilient to reconnects, works with Vercel serverless, no connection management.

**Weaknesses in current form:**
- 3-second polling fires regardless of whether the stream is active. On a 30-second workflow, this generates ~10 unnecessary round-trips per user.
- Polling continues after stream ends with no explicit stop condition tied to stream completion.
- List queries (`useCandidates`, `usePositionings`) also poll at 3s when any item is active — this scales badly as list size grows.
- No polling for the `missions` workflow (analyze-job), which has no `status` column.

**Verdict:** Keep polling as the safety net / fallback, but make it conditional on stream not being active. The `refetchInterval` should be `false` when `useWorkflowStream.isLoading` is true, activating only after stream completes or on reconnect.

---

### Pattern 2: NDJSON Streaming (Primary mechanism — already implemented)

The `@workflow/next` runtime provides `run.readable` (a `ReadableStream<Uint8Array>`) which is consumed by `useWorkflowStream`. This is the real-time UI update path.

**What works well:**
- Sub-second latency for incremental data (partial JSON objects from `streamText`)
- Reconnect path via `GET /api/workflow/[runId]/stream` with `startIndex` replays from any offset
- `x-workflow-run-id` header propagation enables deduplication
- Abort controller cleanly cancels in-flight streams

**Gaps in current implementation (HIGH confidence, from code inspection):**

1. **Status field not written until `saveResult`/`saveGeneration` step.** The workflow sets `status: 'reviewing'` (extract) or `status: 'generated'` (generate) only in the final `'use step'` block. If the stream closes before that step commits, Supabase still shows `'extracting'` and React Query polling restarts. There is no intermediate status update written to Supabase during streaming.

2. **`onFinish` invalidation is the only trigger for React Query post-stream.** If the stream disconnects abnormally (network drop, Vercel edge timeout), `onFinish` is never called, and React Query polling must recover. But polling is disabled (`refetchInterval: false`) when status is not in the active list — and the status may still be 'extracting' in Supabase because the workflow is still running. This means the UI can show a stuck state.

3. **No terminal-state broadcast.** When the workflow completes and the final step sets `workflow_run_id: null` in Supabase, the React Query cache still holds the old status until next poll fires (up to 3 seconds lag).

4. **`pendingRunId` vs `runId` race.** The `useWorkflowStream` hook uses a `pendingRunId` from the POST response header to avoid double-reading the stream, but the React Query cache may clear `workflow_run_id` to `null` before the stream fully drains. This creates a brief window where `activeRunId` goes null mid-stream, potentially re-enabling action buttons prematurely.

5. **No error status persisted to Supabase.** If a workflow step throws, the NDJSON stream closes with an error frame, but the workflow runtime does not write `status: 'error'` to the candidates/positionings table. The client sees `isLoading: false, error: Error` but a subsequent page reload will show the record still in `status: 'extracting'` (ghost state).

---

### Pattern 3: Server-Sent Events (Not used, not recommended for this stack)

SSE (`EventSource`) opens a long-lived HTTP GET connection where the server pushes `text/event-stream` formatted messages.

**Why not applicable here:**
- Vercel serverless functions have a 60-second max duration (Fluid Compute extends this, but SSE requires a persistent server-side loop).
- The `@workflow/next` runtime already provides a superior version of this via `run.getReadable()` — there is no need to build a separate SSE layer.
- SSE requires a persistent HTTP connection per workflow run per client. With multiple concurrent workflows across users, connection limits become a concern.
- The existing NDJSON stream already provides incremental updates. SSE would be a parallel mechanism solving the same problem with more infrastructure complexity.

**Verdict:** Do not add SSE. The NDJSON stream is SSE-equivalent for this use case.

---

### Pattern 4: WebSockets (Not used, not recommended for this stack)

WebSockets are bidirectional. Workflow status updates are unidirectional (server → client). The added complexity of socket lifecycle management, reconnection, and Vercel compatibility issues make this a poor fit.

**Verdict:** Do not add WebSockets.

---

### Pattern 5: Supabase Realtime Subscriptions (Viable enhancement)

Supabase Realtime provides Postgres change notifications via WebSocket under the hood, exposed as `supabase.channel().on('postgres_changes', ...)`. The pattern is:

```
Workflow writes to Supabase → Supabase Realtime fires INSERT/UPDATE event
  → Client subscription receives { new: { status, workflow_run_id } }
  → queryClient.invalidateQueries({ queryKey: keys.candidates.detail(id) })
```

**Strengths:**
- Zero polling overhead — event-driven instead of time-driven
- React Query invalidation is immediate when database row changes
- Handles the "ghost state" problem — when the workflow writes final status, UI updates within ~1 second
- Already using Supabase so no new infrastructure

**Weaknesses:**
- Requires enabling Realtime on specific tables in Supabase dashboard
- Supabase free tier has limits on concurrent Realtime connections (200 per project)
- Subscriptions can miss events on reconnect — need to handle the reconnect case with a manual refetch
- Adds connection lifecycle to manage in React (subscribe on mount, unsubscribe on unmount)

**Verdict:** Use Supabase Realtime as a complement to the existing stream, specifically to drive React Query invalidation after workflow completion. This eliminates the 3-second polling lag on terminal state changes without replacing the stream for incremental updates.

---

## Recommended Architecture

### Single Source of Truth Hierarchy

```
Supabase (status column)       ← ground truth, persistent
  ↑ written by workflow steps

NDJSON stream (run.readable)   ← real-time view during active run
  ↑ emitted by workflow steps concurrently with Supabase writes

React Query cache              ← client-side projection
  ↑ populated by REST /api/* fetch
  ↑ invalidated by stream onFinish + Supabase Realtime events

Zustand stores                 ← transient UI state only
  ↑ CV builder edits, positioning draft, PDF blob
  ↑ NEVER holds workflow status — that lives in React Query
```

**Critical rule:** Workflow status (`pending/running/done/error`) must only be read from the React Query cache (which reflects Supabase). It must never be derived from `isLoading` state of `useWorkflowStream` alone, because the stream can be absent (page reload, reconnect) while a workflow is active.

---

## Component Boundaries

### Layer 1: Workflow Runtime (Server)
**Location:** `workflows/*.ts` + `app/api/*/route.ts`
**Responsibility:** Execute steps, write to Supabase, emit NDJSON stream
**Communicates with:** Supabase (writes), NDJSON stream consumer (writes), `workflow/api` (getRun, start)
**Contract:** Every workflow MUST write a terminal status to Supabase on success AND failure before closing the stream.

### Layer 2: API Routes (Server)
**Location:** `app/api/extract/route.ts`, `app/api/positioning/generate/route.ts`, `app/api/positioning/analyze/route.ts`
**Responsibility:** Guard against duplicate runs (check `workflow_run_id` + `run.status`), start runs, return stream
**Communicates with:** Workflow runtime (start/getRun), Supabase (read status, write runId), client (Response stream)
**Contract:** Return `x-workflow-run-id` header on all streaming responses. Return 409 when a run is already active.

### Layer 3: useWorkflowStream Hook (Client)
**Location:** `lib/hooks/useWorkflowStream.ts`
**Responsibility:** Consume NDJSON stream, expose incremental data + meta + loading state, handle reconnect
**Communicates with:** API routes (fetch), React Query (onFinish triggers invalidation)
**Contract:** `isLoading` means stream is open. `isLoading: false` does NOT mean workflow is done — it means the stream closed (which may happen before the database commits). Always check Supabase status via React Query for definitive state.

### Layer 4: React Query (Client)
**Location:** `lib/queries/*.ts`
**Responsibility:** Cache Supabase-derived state, trigger refetches, expose status to UI
**Communicates with:** API routes (REST fetch), Supabase Realtime (event-driven invalidation)
**Contract:** `status` field from query data is the authoritative workflow state for button disabling, progress rendering, and error display.

### Layer 5: Zustand Stores (Client)
**Location:** `lib/stores/*.ts`
**Responsibility:** Local UI state — CV builder edits, positioning draft, PDF blob URL
**Communicates with:** React Query (reads for initial values), Components (reads/writes)
**Contract:** Stores must not hold `workflow_run_id` or `status`. These belong in React Query.

### Layer 6: UI Components
**Location:** `app/*/page.tsx`, `components/*.tsx`
**Responsibility:** Render status, disable buttons, show progress, display errors
**Communicates with:** `useWorkflowStream` (stream data), React Query (status), Zustand (local state)
**Contract:** Button disabled state = `isLoading || activeStatuses.includes(reactQueryStatus)`. Never use `isLoading` alone.

---

## Data Flow: Correct vs Current

### Correct Flow (Target)

```
User clicks "Extract"
  → UI sets optimistic isLoading (useWorkflowStream.submit)
  → POST /api/extract → Supabase status: 'extracting' + runId stored
  → API returns NDJSON stream
  → useWorkflowStream reads chunks → updates local object/meta state
  → Button disabled: isLoading=true (stream active)

  [concurrent]
  → Supabase Realtime event fires on status update
  → React Query invalidation → refetch candidate → status: 'extracting' confirmed
  → Button disabled: status in activeStatuses (belt + suspenders)

  [stream ends]
  → saveResult step: Supabase status: 'reviewing', workflow_run_id: null
  → Supabase Realtime event → React Query invalidation → status: 'reviewing'
  → useWorkflowStream.onFinish() → React Query invalidation (redundant but safe)
  → isLoading: false, status: 'reviewing' → button re-enabled, results shown

  [error path]
  → workflow step throws → stream closes with error frame
  → saveResult MUST write status: 'error' + workflow_run_id: null to Supabase
  → useWorkflowStream catches error → setError
  → Supabase Realtime → React Query → status: 'error'
  → UI shows error toast, button re-enabled
```

### Current Flow (Actual — with gaps marked)

```
User clicks "Extract"
  → POST /api/extract → Supabase status: 'extracting' + runId stored
  → API returns NDJSON stream
  → useWorkflowStream reads chunks → updates local state
  → Button disabled: isLoading=true ✓

  [stream ends normally]
  → saveResult: Supabase status: 'reviewing', workflow_run_id: null ✓
  → useWorkflowStream.onFinish() → React Query invalidation ✓
  → BUT: if stream disconnects before saveResult, isLoading goes false
    and React Query polling eventually catches status: 'reviewing'
    BUT polling is false when status not in ACTIVE_CV_STATUSES
    AND status may still be 'extracting' — polling will fire at 3s ✓ (recovers slowly)

  [error path]
  → workflow step throws → stream closes ✗ NO status: 'error' written to Supabase
  → useWorkflowStream sets error ✓
  → BUT: page reload shows candidate stuck in status: 'extracting' (ghost state) ✗
  → React Query polling resumes at 3s, fetches 'extracting' status, loops forever ✗
  → No visual error after reload ✗

  [page reload mid-workflow]
  → React Query loads candidate with status: 'extracting' + runId ✓
  → useWorkflowStream reconnect: GET /api/workflow/[runId]/stream ✓
  → BUT: if workflow already completed and runId was cleared,
    GET returns 404 or JSON {status: 'completed'}
    → reconnect path handles this gracefully (returns early) ✓

  [button double-click guard]
  → POST /api/positioning/generate checks run.status ✓ (good)
  → BUT /api/extract does NOT check existing run — blindly starts new one ✗ PARTIAL GAP
```

---

## Gaps to Close (Priority Order)

### Gap 1: Error status not written to Supabase (CRITICAL)
**Problem:** When a workflow step throws, the database record stays in `status: 'extracting'/'generating'` forever. The `saveResult`/`saveGeneration` steps never run on failure path.
**Fix:** Add a top-level try/catch in each workflow function that writes `status: 'error'` and clears `workflow_run_id` before rethrowing.
**Build order:** Fix workflows first, before UI error display work — otherwise UI fixes show errors that database doesn't reflect.

### Gap 2: Polling continues when stream is active (MODERATE)
**Problem:** React Query polls at 3s even when `useWorkflowStream.isLoading` is true, generating redundant requests.
**Fix:** Extend `useWorkflowStream` to return an `isStreamActive` flag. Pass it to `refetchInterval` callback: `if (isStreamActive) return false`.
**Build order:** After Gap 1 (status writes), so polling has accurate data to read when it does fire.

### Gap 3: No Supabase Realtime for terminal state (MODERATE)
**Problem:** After stream closes, React Query only learns about the final status via the next poll cycle (up to 3 seconds) or via `onFinish` invalidation.
**Fix:** Subscribe to Supabase Realtime on `candidates` and `positionings` tables for row updates matching the current record's id. On UPDATE event, call `queryClient.invalidateQueries`.
**Build order:** After Gap 1 (needs accurate status writes to be useful). Optional if polling lag is acceptable.

### Gap 4: activeRunId can go null mid-stream (LOW)
**Problem:** `pendingRunId` clears when POST stream ends, but `runId` from React Query (which is `workflow_run_id` from DB) is set to `null` by the final workflow step. Between stream close and React Query refetch, `activeRunId` may briefly be null, potentially re-enabling buttons.
**Fix:** Derive disabled state from `isLoading || reactQueryStatus in activeStatuses` instead of `activeRunId !== null`. The stream `isLoading` covers the streaming window; React Query status covers the pre/post state.
**Build order:** Can be fixed independently, UI layer only.

### Gap 5: Missing duplicate-run guard in /api/extract (LOW)
**Problem:** `/api/positioning/generate` checks `run.status` before starting a duplicate, but `/api/extract` does not.
**Fix:** Mirror the guard from generate route into extract route.
**Build order:** After Gap 1 (error states may be the more common cause of zombie runIds).

---

## Build Order (Dependency Sequence)

```
Phase 1: Server-side contract repair
  1a. Error status writes in workflow files (Gap 1)
      → Unblocks all UI error display work
  1b. Duplicate-run guard in /api/extract (Gap 5)
      → Prevents new ghost states while fixing old ones

Phase 2: Client-side state accuracy
  2a. Button disabled logic: isLoading || status in activeStatuses (Gap 4)
      → Independent, zero server changes required
  2b. Disable polling during active stream: isStreamActive flag (Gap 2)
      → Requires Phase 1 complete so polling reads accurate data

Phase 3: Latency optimization (optional)
  3a. Supabase Realtime subscriptions for terminal state (Gap 3)
      → Requires Phase 1 (accurate status writes)
      → Nice-to-have, polling already recovers in <3s
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Deriving workflow state from `isLoading` alone
**What goes wrong:** Stream closes before database commits. `isLoading: false` but database still says `'extracting'`. Buttons re-enable mid-workflow.
**Instead:** `disabled = isLoading || activeStatuses.includes(data?.status)`

### Anti-Pattern 2: Using Zustand to hold `workflow_run_id` or `status`
**What goes wrong:** Zustand is not synced with database. On page reload, Zustand is empty. Status tracking breaks.
**Instead:** These fields always come from React Query (from Supabase).

### Anti-Pattern 3: Calling `invalidateQueries` without specific keys
**What goes wrong:** Invalidates unrelated queries, triggers unnecessary refetches across the entire page.
**Instead:** Always use specific keys from `queryKeys.*` factory.

### Anti-Pattern 4: Starting a new workflow run without checking existing run
**What goes wrong:** Two parallel runs for the same record. Supabase `workflow_run_id` is overwritten, the first run's stream becomes unreachable, first run writes data silently.
**Instead:** Check `run.status` via `getRun(workflow_run_id).status` before starting. Return 409 + existing stream if active.

### Anti-Pattern 5: Adding SSE or WebSockets as a parallel mechanism
**What goes wrong:** The `@workflow/next` runtime already provides `run.getReadable()` for streaming. Adding SSE duplicates the transport layer with more infrastructure.
**Instead:** Use the existing NDJSON stream for real-time updates. Use Supabase Realtime for post-completion invalidation only.

### Anti-Pattern 6: Swallowing errors in workflow steps
**What goes wrong:** `.catch(() => {})` means errors are invisible. Database stays in active status. UI polls forever.
**Instead:** Explicit error handling in all workflow steps + top-level catch that writes `status: 'error'` to Supabase.

---

## Scalability Considerations

| Concern | At 10 users | At 1K concurrent workflows |
|---------|-------------|---------------------------|
| NDJSON streaming | Fine — HTTP/2 multiplexing handles parallel streams | Vercel Fluid Compute limits apply; monitor concurrent connections |
| Polling at 3s | Fine — ~10 RPM per active user | 1K * 20 RPM = 20K RPM to /api/candidates — may need Supabase Realtime to replace polling |
| Supabase Realtime | 200 concurrent connections (free tier) | Upgrade tier or selective subscriptions only during active workflows |
| Zustand store size | Fine | Positioning store with 25+ fields — no scaling concern, per-tab memory |

---

## Sources

- Direct codebase inspection: `lib/hooks/useWorkflowStream.ts`, `workflows/extract-cv.ts`, `workflows/positioning-generate.ts`, `app/api/extract/route.ts`, `app/api/positioning/generate/route.ts`, `app/api/workflow/[runId]/stream/route.ts`, `app/api/workflow/[runId]/cancel/route.ts`, `lib/queries/candidates.ts`, `lib/queries/positionings.ts` — HIGH confidence
- Vercel Workflow DevKit docs: https://useworkflow.dev/docs/getting-started/next — MEDIUM confidence (no client-side status API documented; confirmed only CLI/Web UI observability)
- Vercel Workflow blog post: https://vercel.com/blog/introducing-workflow — MEDIUM confidence
- TanStack Query invalidation docs: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation — HIGH confidence
- Supabase + React Query combination: https://makerkit.dev/blog/saas/supabase-react-query — MEDIUM confidence
- SSE + React Query cache pattern: https://fragmentedthought.com/blog/2025/react-query-caching-with-server-side-events — MEDIUM confidence (pattern valid but not needed given existing NDJSON stream)
- Known beta instability: https://github.com/vercel/workflow/issues/451 (workflows stuck in "pending" on Vercel) — LOW confidence (single issue, may be fixed)

---

*Analysis: 2026-03-26*
