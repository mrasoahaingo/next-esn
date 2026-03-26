# Project Research Summary

**Project:** Next-ESN — AI Workflow UI Reliability Milestone
**Domain:** Async AI workflow state synchronization for brownfield Next.js SaaS
**Researched:** 2026-03-26
**Confidence:** HIGH

## Executive Summary

Next-ESN is an existing SaaS app for ESN consultant matching with three AI workflows (CV extraction, mission analysis, CV positioning) powered by Vercel `@workflow/next` 4.0.1-beta. The core architecture is already correct in its broad shape: NDJSON streaming for real-time updates, Supabase as the persistent status ground truth, React Query as the client-side projection layer, and Zustand for transient UI state. The reliability milestone is not about adding new patterns — it is about closing execution gaps in the existing patterns. No new dependencies are needed; all required libraries are already installed.

The recommended approach is to work in dependency order: fix the server-side contract first (error status writes to Supabase), then fix client-side state derivation (button disabled logic from server truth, not Zustand flags), then optimize latency (Supabase Realtime for terminal state). The most dangerous gap is that workflow errors do not write `status: 'error'` to Supabase — records get stuck in `'extracting'` or `'analyzing'` forever, causing infinite polling loops and preventing users from retrying. All UI error display work is blocked until this server gap is closed.

The key risk is the `@workflow/next` beta package. Its step callback API and error handling behavior are partially undocumented, and the connection between streaming sub-step labels and the Vercel AI SDK `DataStreamWriter` requires verification in the actual codebase. Beta breaking changes between deploys are a real threat — the lockfile must be committed and package versions must be pinned without range specifiers. The second major risk is Zustand flags (`isAnalyzing`, `isGenerating`) being used as the source of truth for button disabling, which silently allows duplicate submissions on page reload.

---

## Key Findings

### Recommended Stack

All required libraries are already in `package.json`. No new packages are needed for this milestone. The work is architecture patterns and code corrections, not new dependencies.

**Core technologies:**
- **TanStack Query v5 `refetchInterval`** (already at 5.90.21): Conditional polling while workflow runs; must be disabled when the NDJSON stream is active to avoid redundant requests. The `refetchInterval` callback should return `false` when `useWorkflowStream.isLoading` is `true`.
- **Supabase Realtime `postgres_changes`** (already at 2.99.1): Used only as an accelerator for React Query invalidation after terminal state writes. Pair with polling as a fallback — do not replace polling, which self-heals on reconnect.
- **Zustand slices pattern** (already at 5.0.11): Zustand must hold only transient UI state (CV editor edits, PDF blob URL). Workflow status (`pending/running/done/error`) must never live in Zustand — it belongs in React Query as a projection of Supabase.
- **`sonner` `toast.promise()`** (already at 2.0.7): Wraps workflow mutation with automatic loading/success/error toast states. Use for all three workflow triggers.
- **Next.js `error.tsx` boundary files**: Replace any use of `react-error-boundary` (which conflicts with Next.js `notFound()` and `redirect()` throws). Add to `app/review/[id]/error.tsx` and `app/review/[id]/positioning/[positioningId]/error.tsx`.
- **Next.js `loading.tsx` files**: Add to the positioning route to prevent blank screens during RSC fetches. Use shadcn skeleton components to match layout height.

**What NOT to add:** XState (overkill for linear state), SSE (NDJSON stream is equivalent), raw WebSockets, `react-error-boundary`, `useOptimistic` for AI workflows.

### Expected Features

The milestone goal is reliability, not new features. All items are evaluated through that lens.

**Must have (table stakes) — this milestone:**
- Button disabled during active workflow — prevents duplicate submissions; the root reliability bug
- Visible loading indicator on trigger button/area — confirms the action registered
- Distinct status states in UI: `idle`, `pending`, `success`, `error` — minimum user orientation
- Error surfaced with actionable copy — silent failures destroy trust; "Something went wrong. Try again or contact support." not raw error strings
- Success feedback — user must know when a workflow completes

**Should have (differentiators) — this milestone if stable base is solid:**
- Sub-step progress display ("Step 2/4: Analyzing skills") — reduces anxiety during 5-30 second AI runs; builds on streaming infrastructure already partially implemented
- Step-level status badges — natural fit for the 3-workflow structure

**Defer to later milestone:**
- "Last generated" timestamp — low effort but lower priority than correctness fixes
- Specific error attribution per step — requires API route audit scope
- Partial success handling — complex state management; defer unless specific user pain
- Retry single failed step — requires `@workflow/next` architecture change
- Estimated time remaining — high variance AI workflows make this unreliable and trust-eroding

**Anti-features to explicitly avoid:**
- Fake progress bars (fabricated percentages stall and erode trust; use honest step-based progress)
- Optimistic UI for AI output (unpredictable results require constant rollback)
- Streaming output preview (partial AI text raises quality concerns)
- Cancel in-flight workflow (`@workflow/next` beta does not document reliable cancellation)

### Architecture Approach

The app already uses the correct pattern: NDJSON stream is the real-time view during an active run; Supabase `status` column is the persistent ground truth; React Query is the client-side projection updated by stream `onFinish` callbacks and Supabase Realtime events; Zustand holds only transient in-session UI state. The problem is execution gaps, not pattern gaps. The architecture research confirmed five specific code-level defects through direct codebase inspection.

**Source of truth hierarchy:**
```
Supabase (status column)         ← ground truth, persistent
  NDJSON stream (run.readable)   ← real-time view during active run
    React Query cache            ← client projection, invalidated by stream + Realtime
      Zustand stores             ← transient UI only (NO workflow_run_id, NO status)
```

**Major components and their contracts:**
1. **Workflow Runtime (Server)** — `workflows/*.ts`: Execute steps, write to Supabase, emit NDJSON stream. Contract: MUST write terminal status (`done` or `error`) + clear `workflow_run_id` on both success and failure paths.
2. **API Routes (Server)** — `app/api/*/route.ts`: Guard against duplicate runs, start runs, return stream. Contract: return 409 when a run is already active; return `x-workflow-run-id` header on all streaming responses.
3. **`useWorkflowStream` Hook (Client)** — `lib/hooks/useWorkflowStream.ts`: Consume NDJSON stream, expose incremental data + loading state, handle reconnect. Contract: `isLoading: false` does NOT mean the workflow is done — it means the stream closed. Always check Supabase status via React Query for definitive state.
4. **React Query (Client)** — `lib/queries/*.ts`: Cache Supabase-derived state, drive refetches. Contract: `status` field from query data is the authoritative state for button disabling, progress rendering, and error display.
5. **Zustand Stores (Client)** — `lib/stores/*.ts`: Local session UI state only. Contract: must NOT hold `workflow_run_id` or `status`.
6. **UI Components** — `app/*/page.tsx`: Render status, disable buttons, show progress. Contract: `disabled = isLoading || activeStatuses.includes(reactQueryStatus)` — never `isLoading` alone.

### Critical Pitfalls

1. **Error status not written to Supabase on workflow failure** — When a workflow step throws, the database record stays in `'extracting'/'analyzing'` forever. Add a top-level try/catch in each workflow function that writes `status: 'error'` and clears `workflow_run_id` before rethrowing. This is the highest-priority fix because all UI error display work is blocked until it is in place.

2. **Zustand flags used as sole source of truth for button disabling** — `isAnalyzing`/`isGenerating` reset to `false` on page reload while the workflow is still running server-side. Derive button disabled state from `positioningData.status` (server truth) — use Zustand flags only as an optimistic overlay during the current session. Pattern: `disabled = positioningData?.status === 'analyzing' || isAnalyzing`.

3. **Silent error swallowing in `consumeNdjsonStream`** — Malformed NDJSON lines are silently skipped, but this catch block also swallows structured error payloads like `{ "error": "Gemini quota exceeded" }`. The UI shows a completed-looking state with empty data. Check `chunk.error` before dispatching to `onChunk`; surface it via `setError()` not silent skip.

4. **React Query cache invalidation on wrong key scope** — Invalidating only `detail` after workflow completion leaves `list` queries stale. Status badges on list pages persist after completion. Invalidate both `detail` and `list` (or use `all`) for the affected entity, and cross-invalidate related entities (positioning workflow touches both `positionings` and `candidates`).

5. **Dual stream readers on the same NDJSON run** — The reconnection `useLayoutEffect` can fire before the `pendingRunId === runId` guard resolves, opening a second stream reader. Chunks are split across two consumers causing visible UI glitches and incorrect Zustand state. Never weaken the `pendingRunId === runId` guard in `useWorkflowStream.ts`. Test: reload page mid-stream and verify only one fetch is open in DevTools Network tab.

---

## Implications for Roadmap

Based on research, the work naturally falls into three phases with hard dependencies between them.

### Phase 1: Server-Side Contract Repair and Core UI Reliability

**Rationale:** All UI error display, retry flows, and status accuracy depend on the server writing correct terminal states to Supabase. This is the unblocking phase. No client UI work involving error states is reliable until the server gap is closed.

**Delivers:** No more ghost states (records stuck in `'extracting'` forever), button disabled logic based on server truth, consistent error surfacing to users, duplicate-run prevention.

**Addresses:** All 5 table stakes features from FEATURES.md: button disabled, loading indicator, status states, error surfaced with actionable copy, success feedback.

**Implements:** Workflow Runtime contract (Gap 1), API Route duplicate-run guard (Gap 5), `useWorkflowStream` error surface (Pitfall 3), button disabled logic fix (Pitfall 2 + Gap 4), React Query invalidation scope fix (Pitfall 4), Zustand store reset on navigation (Pitfall 5), PDF blob URL null on restart (Pitfall 9), error state cleared on retry (Pitfall 8).

**Avoids:** Pitfall 1 (dual stream readers), Pitfall 2 (Zustand flags as sole truth), Pitfall 3 (silent NDJSON error swallow), Pitfall 4 (wrong invalidation scope).

---

### Phase 2: Client State Accuracy and UX Refinement

**Rationale:** With a reliable server contract in place, client-side state management can be tightened without the risk of "fixing the display layer on a broken data layer." This phase focuses on eliminating the remaining synchronization edge cases and improving perceived quality.

**Delivers:** Polling disabled during active stream (eliminates unnecessary requests), `useLayoutEffect` replaced with `useEffect` for store initialization (eliminates hydration warnings), `staleTime` on workflow queries to prevent mid-stream refetches, `Partial<>` types validated at stream completion, structured error logging.

**Addresses:** Sub-step progress display (differentiator feature from FEATURES.md), step-level status badges, "Last generated" timestamp.

**Implements:** `isStreamActive` flag for polling suppression (Architecture Gap 2), `staleTime: 5000` on status queries (Pitfall 7), Zod validation of completed stream objects (Pitfall 10), `useLayoutEffect` → `useEffect` migration (Pitfall 6).

**Uses:** Vercel AI SDK `DataStreamWriter` for sub-step labels — requires verification of `@workflow/next` step callback API before implementation.

---

### Phase 3: Latency Optimization (Optional)

**Rationale:** At current scale (single-tenant, small user base), polling at 3s is fully functional. This phase reduces perceived latency from terminal state changes to near-instant without replacing the polling safety net. It is additive and low-risk because Phase 1 and Phase 2 already guarantee correctness.

**Delivers:** Supabase Realtime subscriptions for React Query invalidation on `candidates` and `positionings` tables, eliminating 0-3s polling lag on workflow completion.

**Implements:** Supabase Realtime `postgres_changes` subscription pattern (Architecture Gap 3).

**Requires:** Phase 1 complete (accurate status writes to Supabase are needed for Realtime events to carry useful data).

---

### Phase Ordering Rationale

- **Server before client:** Five of the thirteen pitfalls identified are caused by the server not writing terminal states. Fixing client display before fixing server truth creates a double refactor.
- **Error path before happy path refinement:** Sub-step progress (a differentiator) builds on the same streaming infrastructure as error propagation. If the error path is unreliable, sub-step displays will have the same silent-failure issues.
- **Realtime last:** Supabase Realtime is an optimization, not a correctness fix. Adding it before Phase 1 would accelerate propagating incorrect states.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 1 (Sub-step streaming bridge):** The connection between `@workflow/next` step callbacks and Vercel AI SDK `DataStreamWriter` in the same HTTP response is architecturally possible but unverified against the actual beta runtime. Requires a spike against `workflows/*.ts` before committing to the streaming sub-step approach. If the step callback API is not exposed, fall back to polling a `steps` table in Supabase.
- **Phase 1 (Error path in `@workflow/next` beta):** Whether the runtime's top-level try/catch correctly intercepts all step throws, or whether some errors are swallowed internally, needs verification. Check `@workflow/next` GitHub issues before writing the error handler.

Phases with standard patterns (skip research-phase):

- **Phase 1 (Button disabled + toast):** Standard `useMutation.isPending` + `sonner toast.promise()` pattern. Well-documented in TanStack Query v5 and sonner docs.
- **Phase 2 (React Query polling suppression):** Standard conditional `refetchInterval` callback. Well-documented.
- **Phase 3 (Supabase Realtime + React Query invalidation):** Standard pattern. Multiple production examples available.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are already installed; guidance is on pattern usage, not package selection. Official docs confirmed all patterns. |
| Features | HIGH | Table stakes are established UX conventions with broad documentation. Anti-features grounded in explicit `@workflow/next` beta constraints. |
| Architecture | HIGH | Based on direct codebase inspection of `useWorkflowStream.ts`, `workflows/*.ts`, `lib/queries/*.ts`, and `lib/stores/*.ts`. Gaps are code-level defects, not theory. |
| Pitfalls | HIGH (most) / MEDIUM (beta-specific) | Critical pitfalls 1-5 confirmed through direct codebase analysis. Beta `@workflow/next` behavior (step callbacks, error propagation internals) is MEDIUM — single npm package with limited public documentation. |

**Overall confidence:** HIGH

### Gaps to Address

- **`@workflow/next` step callback API:** Whether steps expose a callback that can write to a `DataStreamWriter` in the same HTTP response is unverified. Spike this in Phase 1 planning before scheduling sub-step streaming work. If not available, use a `workflow_steps` Supabase table as the alternative.
- **`@workflow/next` error propagation internals:** Whether the runtime silently retries failed steps or propagates them to a top-level catch is unclear from the beta docs. The error status write fix assumes a top-level try/catch will intercept step failures. Verify in a feature branch test.
- **Supabase Realtime table enablement:** Realtime must be manually enabled per table in the Supabase dashboard. Verify current state before scheduling Phase 3 work.
- **Polling strategy when `@workflow/next` does not write status automatically:** The polling strategy assumes workflow steps write `status` to Supabase. If the beta runtime handles this differently, the API route wrapper must explicitly write status on start and on completion. Verify against existing `app/api/extract/route.ts` implementation.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `lib/hooks/useWorkflowStream.ts`, `workflows/extract-cv.ts`, `workflows/positioning-generate.ts`, `app/api/extract/route.ts`, `app/api/positioning/generate/route.ts`, `app/api/workflow/[runId]/stream/route.ts`, `lib/queries/candidates.ts`, `lib/queries/positionings.ts`, `lib/stores/positioning.store.ts`, `lib/queries/keys.ts`
- [TanStack Query v5 Mutations](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [TanStack Query v5 Optimistic Updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Zustand Slices Pattern](https://github.com/pmndrs/zustand/blob/main/docs/learn/guides/slices-pattern.md)
- [Window Focus Refetching — TanStack Query](https://tanstack.com/query/v4/docs/framework/react/guides/window-focus-refetching)
- [react-error-boundary conflict with Next.js (issue #143)](https://github.com/bvaughn/react-error-boundary/issues/143)
- [Pitfalls of React Query — nickb.dev](https://nickb.dev/blog/pitfalls-of-react-query/)
- [Concurrent Optimistic Updates — tkdodo.eu](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)

### Secondary (MEDIUM confidence)
- [Vercel AI SDK — Streaming Custom Data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)
- [Supabase Realtime — Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Vercel — Introducing Workflow DevKit](https://vercel.com/blog/introducing-workflow)
- [Supabase + React Query — makerkit.dev](https://makerkit.dev/blog/saas/supabase-react-query)
- [Federated State with Zustand + TanStack Query — nextsteps.dev](https://www.nextsteps.dev/en/posts/federated-state-done-righ)
- [@workflow/next on npm](https://www.npmjs.com/package/@workflow/next)

### Tertiary (LOW confidence)
- [Known beta instability: workflows stuck in "pending" on Vercel — GitHub issue #451](https://github.com/vercel/workflow/issues/451) — single issue, may be fixed; flag as risk for beta dependency

---
*Research completed: 2026-03-26*
*Ready for roadmap: yes*
