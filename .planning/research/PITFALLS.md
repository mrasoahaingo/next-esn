# Domain Pitfalls: Async Workflow-UI Synchronization

**Domain:** AI workflow feedback in brownfield Next.js 16 SaaS (ESN)
**Researched:** 2026-03-26
**Stack context:** Next.js 16 + React 19 + Vercel AI SDK + `@workflow/next` 4.0.1-beta + Zustand + React Query (TanStack)

---

## Critical Pitfalls

Mistakes that cause rewrites, silent failures, or data corruption.

---

### Pitfall 1: Two Concurrent Stream Readers on the Same NDJSON Run

**What goes wrong:** When both `submit()` (via POST response body) and the `useLayoutEffect` reconnection path (via GET `/api/workflow/:runId/stream`) attach a reader to the same workflow run simultaneously, chunks are split across two consumers. The UI receives partial objects in alternating bursts — fields appear then disappear, text duplicates, JSON objects arrive incomplete.

**Why it happens:** The reconnection `useLayoutEffect` fires on `runId` change. After `submit()` POSTs and receives the `x-workflow-run-id` header, `setPendingRunId` triggers a re-render. If `runId` from React Query cache updates at the same moment (e.g., fast Supabase write), the effect fires before `pendingRunId === runId` guard resolves.

**Consequences:** Visible UI glitches (content flickering, partial JSON displayed as strings), incorrect final state written into Zustand.

**Warning signs:**
- Text/arrays in streamed object appearing twice
- `setObject` calls with incomplete fragments after the stream completes
- `reconnectedRunIdRef.current` mismatches in the effect guard

**Prevention:**
- The current `pendingRunId === runId` guard in `useWorkflowStream.ts:197-200` is the correct mechanism — never weaken it
- When fixing the reconnection logic, preserve that guard or replace it with a ref-based `isSubmitActiveRef` that blocks the effect for the full duration of the POST consumption
- Test: navigate away and back mid-stream; reload the page mid-stream; verify only one fetch is open at a time via DevTools Network tab

**Phase:** Any phase touching `useWorkflowStream.ts` reconnection or submit flow.

---

### Pitfall 2: `isAnalyzing` / `isGenerating` Flags Desynchronized from Actual Workflow State

**What goes wrong:** The Zustand store has `isAnalyzing` and `isGenerating` as boolean flags set manually via `setIsAnalyzing(true/false)`. These are separate from `isLoading` in `useWorkflowStream`. If the page reloads mid-workflow, both flags reset to `false` (Zustand initial state) while the workflow is still running server-side. The "Analyser" button re-enables, users can launch a duplicate run.

**Why it happens:** Zustand state is in-memory only — no persistence, no hydration from server. The actual source of truth is `positioningData.status` from React Query (Supabase). The two truths diverge on reload, navigation, or error.

**Consequences:** Duplicate workflow submissions. The first run still writes to the same `positioning.id` record; the second run overwrites its output mid-stream. Users see corrupted results.

**Warning signs:**
- Button enabled immediately after page reload when `positioningData.status === 'analyzing'`
- `isAnalyzing` is `false` but `isLoading` from `useWorkflowStream` is `true`
- `setIsAnalyzing(false)` called in `onFinish` but `onFinish` never fires because the stream reconnection path doesn't call `setIsAnalyzing`

**Prevention:**
- Derive the disabled state of trigger buttons from `positioningData.status` (server truth), NOT from Zustand flags
- Use Zustand flags only for optimistic UI during the current session (time between submit and first server confirmation)
- Pattern: `const isWorkflowActive = positioningData?.status === 'analyzing' || isAnalyzing;` — never `isAnalyzing` alone
- In the reconnect `useLayoutEffect` path (the page reload scenario), ensure `setIsAnalyzing(true)` is called so Zustand stays consistent

**Phase:** Phase 1 — this is the root cause of duplicate submissions.

---

### Pitfall 3: Silent Error Swallowing in `consumeNdjsonStream`

**What goes wrong:** Malformed NDJSON lines are silently `catch`-ed and skipped (line 67-69 in `useWorkflowStream.ts`). If the beta workflow runtime emits an error line (e.g., `{ "error": "Gemini quota exceeded" }`), the UI never shows it. `isLoading` drops to `false`, `onFinish` fires, and the user sees an empty result with no indication of failure.

**Why it happens:** The catch block is intentionally broad to handle partial JSON. But it doesn't distinguish between truly malformed lines and structured error payloads.

**Consequences:** Silent failures are the most dangerous UX bug. The user sees a completed-looking UI state with no data. They may retry (creating duplicates) or assume success and proceed to the next step with empty data.

**Warning signs:**
- Stream ends with no data in `object` state
- No error displayed to user despite workflow failing
- `{ "error": ... }` format in NDJSON chunks (check Network tab response body)

**Prevention:**
- In `consumeNdjsonStream`, after parsing, check for `chunk.error` before dispatching to `onChunk`
- If an error chunk is detected, surface it via `setError()` not silent skip
- Also check `response.status` on the GET reconnect — a `500` from the stream endpoint should set `error` state, not just `return`
- Add an `onError` callback to `useWorkflowStream` options so callers can display toast notifications

**Phase:** Phase 1 (error surfacing), with further hardening in Phase 2.

---

### Pitfall 4: React Query Cache Invalidation on Wrong Query Key Scope

**What goes wrong:** After a workflow completes, `queryClient.invalidateQueries({ queryKey: queryKeys.positionings.detail(id) })` invalidates only the detail query. But the list query (`queryKeys.positionings.list()`) still holds stale status values. Components that derive "is any workflow running?" from the list (e.g., the candidates list showing a spinner) remain stale until refetch.

**Why it happens:** Invalidating `detail` does not automatically invalidate `list`. React Query treats them as separate cache entries. The `queryKeys.positionings.list()` key pattern `['positionings', 'list']` does not include detail children.

**Consequences:** Status badges on list pages (e.g., "En cours d'extraction") persist after completion. The dashboard stat counts can be wrong.

**Warning signs:**
- Status badge still shows "analyzing" on the candidates list after navigating away from the positioning page
- `dashboard.all` invalidated but specific domain keys not invalidated, or vice versa

**Prevention:**
- When invalidating after workflow completion, always invalidate both `detail` AND `list` for the affected entity (already done in `useCancelWorkflow` — apply same pattern in `onFinish` callbacks)
- For cross-entity invalidation (positioning workflow touches both `positionings` and `candidates` tables), invalidate all affected keys
- Consider using a parent key invalidation: `queryClient.invalidateQueries({ queryKey: queryKeys.positionings.all })` to catch both list and detail in one call
- Document the invalidation contract per workflow in a comment

**Phase:** Phase 1.

---

### Pitfall 5: Zustand Store Accumulating Stale Server Data

**What goes wrong:** `analysis`, `tailoredCv`, `email`, and similar fields in the Zustand positioning store are populated from stream data and kept in memory. When the user navigates to a different positioning and back, the `reset()` must be called — but if it is not called before the new data loads, the old data briefly flashes in the UI.

**Why it happens:** The store is global and not scoped to a route. React Query's cache is keyed by `positioningId`, but Zustand has no key. The `useLayoutEffect` for initialization (lines around 219+ in `page.tsx`) depends on `positioningData` loading after the component mounts. There is a window between mount and data load where the previous store state is visible.

**Consequences:** Stale analysis or CV data from a previous positioning shown briefly (or permanently if `reset()` is missed) for a different record. Users may not notice and submit with wrong data.

**Warning signs:**
- Navigating between two positioning pages shows content from the first on the second for 100-500ms
- `positioningId` in the store mismatches the `positioningIdParam` from URL params

**Prevention:**
- Call `reset()` synchronously on mount before any data load, keyed to `positioningIdParam`
- Better: scope the store initialization to `positioningId` — if `positioningId` in store differs from URL param, call `reset()` before rendering
- Pattern: `useEffect(() => { if (store.positioningId !== positioningIdParam) { reset(); } }, [positioningIdParam])`

**Phase:** Phase 1.

---

## Moderate Pitfalls

---

### Pitfall 6: `useLayoutEffect` for Data-Fetching Side Effects in Next.js App Router

**What goes wrong:** `page.tsx` uses `useLayoutEffect` to initialize the Zustand store from `positioningData`. `useLayoutEffect` fires synchronously after the DOM is painted — but in Next.js App Router with React 19, it can fire before hydration is complete. In SSR context, `useLayoutEffect` is a no-op on the server and produces a React warning.

**Why it happens:** `useLayoutEffect` is used to avoid a flash of uninitialized state. But it causes hydration mismatches when the initial server-rendered HTML differs from the client-initialized state.

**Prevention:**
- Replace `useLayoutEffect` with `useEffect` for store initialization unless there is a measurable visual flash
- If a flash exists, use a CSS `opacity: 0` guard until `isLoaded` is true instead of `useLayoutEffect`
- Verify: run with `suppressHydrationWarning` disabled and check console for warnings

**Phase:** Phase 2 (refinement).

---

### Pitfall 7: `refetchOnWindowFocus` Triggering Refetch Mid-Stream

**What goes wrong:** React Query's default `refetchOnWindowFocus: true` causes queries to refetch when the developer alt-tabs to check a doc and returns to the app. If a workflow is streaming, this triggers a `positionings.detail` refetch. If the refetch returns `status: 'analyzing'` before the stream finishes, it may cause a re-trigger of the reconnect effect if `runStatus` changes between the two renders.

**Why it happens:** The reconnect `useLayoutEffect` depends on `[runId, runStatus, pendingRunId, reconnectNonce]`. If `runStatus` briefly flips (e.g., stale cached `null` -> `'analyzing'`), the guard `reconnectedRunIdRef.current === runId` prevents a second stream open — but only if `runId` hasn't changed.

**Prevention:**
- Set `staleTime: 5000` (5 seconds) on workflow-status queries to prevent immediate refetch on focus during active streaming
- Or disable `refetchOnWindowFocus` only on queries used to drive stream reconnection
- Do not set global `refetchOnWindowFocus: false` — only scope it to the affected queries

**Phase:** Phase 2.

---

### Pitfall 8: Error State Not Cleared on Retry

**What goes wrong:** `useWorkflowStream.submit()` correctly clears `error` on a new submission (`setError(null)` at line 138). But if the user triggers the same workflow twice in quick succession (before the first `setError(null)` call renders), the error banner from the first run persists alongside the new in-progress spinner.

**Why it happens:** React batches state updates in event handlers but the error clear is tied to the async `submit()` call path, not the synchronous button click handler.

**Prevention:**
- Clear error state synchronously in the button's `onClick` handler before calling `submit()`
- Or add an explicit `resetError()` action to the return value of `useWorkflowStream`

**Phase:** Phase 1.

---

### Pitfall 9: PDF Blob URL Leaking on Workflow Restart

**What goes wrong:** When a "Relancer" (re-analyze) triggers a new positioning generation, the PDF blob URL from the previous run may remain valid but point to an outdated PDF. If `setPdfBlobUrl(null)` is not called at the start of the new generation, the old PDF is shown while the new one is being generated.

**Why it happens:** `setPdfBlobUrl` in the store correctly revokes old URLs on replacement. But if generation starts before the PDF preview component fetches a new blob, the component re-renders with the previous URL (not yet null).

**Consequences:** User sees old CV while new one generates. If they export during this window, they download the wrong version.

**Prevention:**
- Call `setPdfBlobUrl(null)` and `setIsPdfLoading(true)` at the start of any generation workflow, not after completion
- Add a visual lock on the export button while `isGenerating` is true OR `isPdfLoading` is true

**Phase:** Phase 1.

---

### Pitfall 10: `Partial<>` Types Masking Missing Required Fields

**What goes wrong:** `analysis: Partial<PositioningAnalysis> | null` and `tailoredCv: Partial<ExtractedCV> | null` mean any field access requires a null check. Components downstream that access `analysis.score` or `tailoredCv.experiences` without null guards will crash silently (TypeScript is satisfied because `Partial` allows `undefined`).

**Why it happens:** `Partial<>` is used to accept streaming data that arrives incrementally. But once the stream completes and `onFinish` fires, the data should be validated against the full schema before being stored.

**Consequences:** `undefined` accessed as array, `.map()` called on `undefined`, rendering crashes that appear as blank screens rather than error boundaries.

**Prevention:**
- After stream completion in `onFinish`, validate the `object` from the stream against the Zod schema before writing to the store
- If validation fails, surface it as an error rather than storing a `Partial`
- Use type narrowing utilities: `isCompleteAnalysis(analysis: Partial<PositioningAnalysis>): analysis is PositioningAnalysis`

**Phase:** Phase 2.

---

## Minor Pitfalls

---

### Pitfall 11: `queryKeys.dashboard.all` Is Not a Function

**What goes wrong:** `queryKeys.dashboard.all` is defined as `['dashboard'] as const` (a value, not a function). When invalidating, `invalidateQueries({ queryKey: queryKeys.dashboard.all })` works but is inconsistent with the pattern used for `candidates.all`, `missions.all` which follow the same structure. Future developers adding `dashboard.detail(id)` would shadow `all` if the pattern is not followed.

**Prevention:**
- Minor consistency issue — acceptable as-is, but if `queryKeys` is extended, follow the `all -> list() -> detail(id)` factory pattern for all entities

**Phase:** Low priority, address only if `queryKeys` is extended.

---

### Pitfall 12: `console.error` in Production for Workflow Stream Errors

**What goes wrong:** Stream errors are logged via `console.error` in the API routes. In production, this adds noise but also risks logging sensitive data from error messages (e.g., Gemini API error messages may include the prompt content).

**Prevention:**
- Replace production `console.error` with structured logging that strips request bodies
- At minimum, ensure error messages passed to the client are generic: `"Workflow failed"` not the raw upstream error

**Phase:** Phase 2 (hardening), not blocking Phase 1.

---

### Pitfall 13: Beta Workflow Package Breaking Changes Between Deploys

**What goes wrong:** `@workflow/next 4.0.1-beta.70` and `@workflow/ai 4.0.1-beta.56` are different minor beta versions. If `pnpm install` is run on a new machine or in CI without a locked lockfile, a newer beta may install with breaking API changes. The `getRun`, `start`, and `run.getReadable` APIs are the most likely to change.

**Prevention:**
- Never run `pnpm update` on workflow packages without a tested migration
- Lock the exact version in `package.json` (no `^` or `~` prefix) — verify `pnpm-lock.yaml` is committed
- If the workflow package releases a new beta with breaking changes, test in a feature branch before merging

**Phase:** Risk applies to all phases.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Disable duplicate submit buttons | Pitfall 2 (flags not from server truth) | Drive disabled state from `positioningData.status`, not Zustand `isAnalyzing` |
| Surface workflow errors | Pitfall 3 (silent NDJSON error swallow) | Check `chunk.error` in stream consumer before dispatching to `onChunk` |
| Post-workflow cache refresh | Pitfall 4 (missing list invalidation) | Invalidate both `detail` and `list` (or `all`) after each workflow `onFinish` |
| Page navigation between positionings | Pitfall 5 (stale Zustand data) | Call `reset()` on `positioningId` mismatch before rendering |
| Reconnect on page reload | Pitfall 1 (dual stream readers) | Preserve the `pendingRunId === runId` guard; test reload mid-stream |
| Sub-workflow step indicators | Pitfall 3 (meta not surfaced on error) | `streamMeta` must be set to a terminal error state, not silently abandoned |
| PDF export during generation | Pitfall 9 (stale blob URL) | Null out `pdfBlobUrl` at generation start; lock export button while `isGenerating` |
| Schema validation after streaming | Pitfall 10 (Partial types crash) | Zod-validate completed stream objects before writing to store |

---

## Sources

- [Pitfalls of React Query — nickb.dev](https://nickb.dev/blog/pitfalls-of-react-query/) (HIGH confidence — direct analysis)
- [Federated State Done Right: Zustand + TanStack Query — nextsteps.dev](https://www.nextsteps.dev/en/posts/federated-state-done-righ) (MEDIUM confidence — verified patterns)
- [Why React Error Boundaries Can't Catch Async Errors — Medium](https://medium.com/@bloodturtle/why-react-error-boundaries-cant-catch-asynchronous-errors-28b9cab07658) (HIGH confidence — React docs behavior)
- [Concurrent Optimistic Updates in React Query — tkdodo.eu](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query) (HIGH confidence — tkdodo is a React Query maintainer)
- [Window Focus Refetching — TanStack Query docs](https://tanstack.com/query/v4/docs/framework/react/guides/window-focus-refetching) (HIGH confidence — official docs)
- Direct codebase analysis: `lib/hooks/useWorkflowStream.ts`, `lib/stores/positioning.store.ts`, `lib/queries/keys.ts`, `app/api/workflow/[runId]/stream/route.ts` (HIGH confidence — first-party source)
