# Technology Stack: Async Workflow State Synchronization

**Project:** Next-ESN — AI workflow UI reliability milestone
**Researched:** 2026-03-26
**Scope:** Async workflow state management and UI feedback patterns only. Core stack (Next.js 16, Supabase, Clerk, Vercel AI SDK, Gemini) is already fixed and not reconsidered here.

---

## Problem Statement

The app has three AI workflows (CV extraction, job analysis, positioning) each with sub-steps. The current state is: buttons don't get disabled during runs (allows duplicates), errors fail silently, sub-step progress is invisible, and the React Query + Zustand layer is desynchronized from actual workflow state. The milestone goal is reliability, not new features.

---

## Recommended Stack Additions

### Workflow State Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TanStack Query v5 `refetchInterval` | Already at 5.90.21 | Poll workflow status from Supabase while running | Already installed. Conditional polling (stop when `status === 'done' or 'error'`) is the safest bridge between the beta `@workflow/next` runtime and the React UI. Supabase realtime is an option but adds subscription complexity; polling at 2-3s intervals is sufficient for AI workflows that take 5-30 seconds. |
| Supabase Realtime `postgres_changes` | Already at 2.99.1 | Push-based status updates for sub-steps | Already installed. Use only for the workflow status row that the `@workflow/next` runtime writes to. Subscribe to `UPDATE` events on a `workflow_runs` table filtered by `id`. Pair with React Query invalidation in the subscription callback. Do NOT use for the primary status loop — keep polling as fallback due to WebSocket reconnection fragility noted in Supabase docs. |
| Zustand slices pattern | Already at 5.0.11 | Split monolithic positioning store into focused slices | Already installed. The current 25-field store is fragile. Slice into four focused stores: `workflowStatusSlice` (pending/running/done/error per workflow), `jobDescriptionSlice`, `analysisSlice`, `cvEditorSlice`. This eliminates the "any field change re-renders everything" problem. |

**Confidence:** HIGH — all three are in the codebase; this is architecture pattern guidance, not new dependencies.

---

### Optimistic Updates

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| TanStack Query `useMutation` variable-based optimistic updates | Already at 5.90.21 | Disable trigger buttons immediately when a workflow starts | Use the **variable-based approach** (not cache manipulation via `onMutate`). When `mutation.isPending === true`, disable the trigger button and show spinner. This is simpler than cache manipulation, avoids rollback complexity, and is sufficient for the use case: AI workflow triggers are not CRUD operations where you need to show a fake result — you just need to block re-triggering. |
| React 19 `useTransition` / `isPending` | Already at 19.2.4 | Gate button interactions during transitions | Use `isPending` from `useTransition` for navigation-adjacent interactions. For workflow triggers specifically, `useMutation.isPending` from TanStack Query is more appropriate because it has built-in persistence and cross-component access via `queryClient.isMutating()`. |

**Do NOT use:** React 19 `useOptimistic` for workflow states. The hook is designed for immediate visual updates that predict server outcomes (e.g., optimistically marking a todo as complete). AI workflow results are unpredictable and non-reversible — "optimistic" is semantically wrong here. The goal is blocking re-triggers, not faking results.

**Confidence:** HIGH — official TanStack Query v5 docs confirm variable-based approach for this pattern.

---

### Streaming State (Sub-step Progress)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel AI SDK `createUIMessageStream` + `DataStreamWriter` | Already at ai 6.0.116 / @ai-sdk/react 3.0.118 | Stream sub-step progress labels from `@workflow/next` steps to UI | The SDK supports `writer.write({ type: 'data-step', data: { label, status }, transient: true })` from the server, consumed via `onData` callback in `useChat`. Transient parts are not stored in message history, which is correct for ephemeral "Step 2/4: Extracting skills..." indicators. Use persistent parts (with `id`) for final workflow results. |

**Critical constraint:** The `@workflow/next` step execution and the AI SDK streaming need to be bridged inside the same API route. `@workflow/next` step callbacks should write to a `DataStreamWriter`. This is architecturally possible since both use HTTP streaming, but it requires careful route design. Flag this for deeper investigation in the implementation phase.

**Confidence:** MEDIUM — AI SDK 6 docs confirm the `DataStreamWriter` pattern. Whether `@workflow/next` beta exposes step callbacks that can write to a `DataStreamWriter` in the same HTTP response requires verification against the actual runtime internals. GitHub issue #6539 in vercel/ai confirms annotations stream before step completion, which is the desired behavior.

---

### Error Propagation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js `error.tsx` boundary files | Built-in | Catch render errors from failed server components | Already the Next.js App Router mechanism. Add `error.tsx` to each major route segment (`app/review/[id]/error.tsx`, `app/review/[id]/positioning/[positioningId]/error.tsx`). These replace `react-error-boundary` for RSC errors. |
| `react-error-boundary` v5 | NOT RECOMMENDED | — | Do not add. Has a known conflict with Next.js: it catches `notFound()`, `redirect()`, and `unauthorized()` throws which are Next.js control flow, not real errors. Use `error.tsx` files instead. |
| Standardized API error response shape | 0 new packages | Consistent JSON errors from all API routes | Create `lib/errors/api-error.ts` with a `{ ok: false, code: string, message: string }` shape. Use across all API routes to replace the current mix of thrown `NextResponse`, silent catches, and inconsistent formats. No new package needed — this is a code pattern. |
| `sonner` `toast.promise()` | Already at 2.0.7 | Surface workflow errors to user as toasts | Already installed. `toast.promise(triggerWorkflow(), { loading: 'Analysing...', success: 'Done', error: (err) => err.message })` wraps a mutation and automatically handles all three states. Use for all three workflow triggers. Do NOT use for sub-step progress (use streaming instead). |

**Confidence:** HIGH for error.tsx and sonner patterns. HIGH for avoiding react-error-boundary (confirmed by vercel/next.js issue #58754 and bvaughn/react-error-boundary issue #143).

---

### Loading States

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand `workflowStatusSlice` | Pattern, no new dep | Single source of truth for `pending/running/done/error` per workflow ID | Each workflow trigger (CV extract, job analyze, positioning generate) should have a canonical status stored in a dedicated Zustand slice. This is the source that disables buttons (`status === 'running'`), shows progress steps, and gates navigation. React Query `isPending` alone does not survive page navigations. |
| TanStack Query `isFetching` / `isLoading` | Already at 5.90.21 | Skeleton states for data-driven UI sections | Use `isLoading` (no data yet, first fetch) for skeleton placeholders, `isFetching` (background refetch) for subtle spinners. Never block interaction during background refetches. |
| Next.js `loading.tsx` files | Built-in | Route-level Suspense fallback | Add `loading.tsx` to `app/review/[id]/positioning/[positioningId]/` to prevent blank screens during RSC fetches. Use `shadcn` skeleton components to match actual layout height and prevent CLS (layout shift). |

**Confidence:** HIGH — all standard patterns documented in Next.js and TanStack Query official docs.

---

## What NOT to Add

| Library | Why Not |
|---------|---------|
| XState v5 | Appropriate for complex multi-parallel state machines. The workflow state here is linear (pending → running → done/error). A Zustand slice with a `WorkflowStatus` union type is 80% less code and zero learning curve for the team. Add XState only if sub-steps gain branching/parallel semantics. |
| SWR | Duplicate of TanStack Query. The project already uses TanStack Query v5 heavily. |
| React Query Persist + IndexedDB | Out of scope for this milestone. Useful for resuming state after page refresh, but adds complexity not needed now. |
| WebSocket (raw) | Supabase Realtime handles WebSocket management. No reason to manage raw WebSockets alongside the existing Supabase client. |
| tRPC | Would require significant route restructuring. Not compatible with the brownfield constraint. |
| Inngest / Trigger.dev | Full workflow orchestration replacements for `@workflow/next`. Out of scope per project constraints: "work with beta limitations, don't replace." |

---

## Architecture Decision: Polling vs. Realtime for Workflow Status

**Recommended: Polling as primary, Supabase Realtime as accelerator**

The `@workflow/next` beta runtime is the critical unknown. Its behavior when steps fail, when the HTTP connection drops, or when a step is retried is not fully documented. Polling at `refetchInterval: 2000` (conditional: only while `status === 'running'`) is resilient because:

1. It self-heals on reconnect — no subscription re-registration needed.
2. It works regardless of whether `@workflow/next` writes to Supabase or another store.
3. Status comes from Supabase rows the app controls, not from the workflow runtime's internal state.

Supabase Realtime `postgres_changes` can be added as an optimization layer: subscribe to `UPDATE` on the `workflow_runs` table and call `queryClient.invalidateQueries()` on change. This reduces perceived latency from 2s to near-instant without replacing the polling safety net.

**Database requirement:** The workflow status must be written to a Supabase table that the client can query. If `@workflow/next` does not write status automatically, the API route wrapper must write `{ id, status: 'running' }` on start and `{ status: 'done' | 'error', error_message }` on completion/failure. This is mandatory for the polling strategy to work.

**Confidence:** MEDIUM — polling strategy is well-established. Whether `@workflow/next` beta writes status to Supabase needs verification against the actual codebase (`lib/` workflow wrappers).

---

## Installation

No new packages are needed for this milestone. All required libraries are already in `package.json`. The work is:

1. Schema/table additions in Supabase (workflow status rows)
2. Zustand store refactor (slice pattern for positioning store)
3. API route standardization (error shape, status writes)
4. React Query query key discipline (stop broad invalidations)
5. Streaming bridge between `@workflow/next` steps and `DataStreamWriter`

---

## Sources

- [TanStack Query v5 — Mutations](https://tanstack.com/query/v5/docs/framework/react/guides/mutations)
- [TanStack Query v5 — Optimistic Updates](https://tanstack.com/query/v5/docs/framework/react/guides/optimistic-updates)
- [TanStack Query — Concurrent Optimistic Updates (tkdodo.eu)](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- [Supabase Realtime — Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Vercel AI SDK — Streaming Custom Data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)
- [AI SDK 6 Release Notes](https://vercel.com/blog/ai-sdk-6)
- [React 19 — useOptimistic](https://react.dev/reference/react/useOptimistic)
- [React 19 — useTransition](https://react.dev/reference/react/useTransition)
- [Next.js — Error Handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [react-error-boundary conflict with Next.js (issue #143)](https://github.com/bvaughn/react-error-boundary/issues/143)
- [Next.js non-RSC error boundary issue #58754](https://github.com/vercel/next.js/issues/58754)
- [Zustand Slices Pattern](https://github.com/pmndrs/zustand/blob/main/docs/learn/guides/slices-pattern.md)
- [@workflow/next on npm](https://www.npmjs.com/package/@workflow/next)
- [Vercel — Introducing Workflow Development Kit](https://vercel.com/blog/introducing-workflow)
