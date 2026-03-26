# Phase 1: Server Contract & Core UI Reliability - Research

**Researched:** 2026-03-26
**Domain:** Workflow state management, error propagation, React Query cache invalidation, UI feedback
**Confidence:** HIGH

## Summary

Phase 1 addresses the reliability gap between the workflow runtime (`@workflow/next` beta) and the user-facing UI. The codebase already has a functional workflow system with 4 workflow files, an NDJSON streaming hook (`useWorkflowStream`), and React Query polling for state synchronization. The core problems are: (1) workflows don't write `status: 'error'` on failure, leaving records stuck in `extracting`/`analyzing`/`generating` forever, (2) NDJSON stream errors are silently caught and discarded in `consumeNdjsonStream`, (3) buttons rely on a mix of Zustand volatile flags (`isAnalyzing`, `isGenerating`) and server status, and (4) cache invalidation after workflow completion is inconsistent across list and detail views.

The fix is straightforward: add error-handling wrappers in each workflow's top-level function (try/catch around steps, write `status: 'error'` to Supabase on failure), propagate errors through the NDJSON stream as typed error frames, derive button disabled state from Supabase `status` + `workflow_run_id` instead of Zustand flags, and centralize cache invalidation in the `onFinish` callback of `useWorkflowStream`.

**Primary recommendation:** Wrap each workflow's orchestrator function in try/catch that writes `status: 'error'` to Supabase, then propagate error messages through NDJSON to the client. Derive all button states from server status. Use `sonner` toast for success/error feedback.

## Project Constraints (from CLAUDE.md)

- **Tech stack locked**: Next.js 16 + Supabase + Clerk + Vercel AI SDK -- no stack changes
- **Workflow runtime**: `@workflow/next 4.0.1-beta.66` -- work within its limitations
- **Scope**: Reliability fixes only -- no new functional features
- **No automated tests**: Explicitly out of scope per REQUIREMENTS.md
- **No refactoring**: Unless necessary to fix a specific bug
- **shadcn/ui first**: Always use shadcn components before custom HTML
- **sonner for toasts**: Use `toast()` from `sonner` for feedback
- **React Query for server state, Zustand for client-only state**

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WFS-01 | Workflows write `status: 'error'` on failure | Try/catch in workflow orchestrators + Supabase update in catch block |
| WFS-02 | Each workflow has clear Supabase status (idle, pending, running, done, error) | Status enum standardization across candidates, positionings, missions tables |
| WFS-03 | Status persists after navigation/reload -- derived from Supabase, not volatile Zustand | Replace `isAnalyzing`/`isGenerating` Zustand flags with server-derived state |
| WFS-04 | NDJSON errors not silently swallowed by catch block | Propagate error frames in NDJSON stream + handle in `useWorkflowStream` |
| BTN-01 | AI generation buttons disabled while workflow runs | Derive disabled from Supabase `status` field (`extracting`, `analyzing`, `generating`) |
| BTN-02 | Disabled state based on server status, not Zustand volatile flags | Read `status` + `workflow_run_id` from React Query data, not Zustand store |
| BTN-03 | Visible loading indicator on workflow launch | Badge/Spinner composed with Button per shadcn pattern (`Spinner` + `data-icon` + `disabled`) |
| BTN-04 | Visual success feedback when workflow completes | `toast.success()` via sonner on `onFinish` callback |
| ERR-01 | All workflow errors surface in UI with comprehensible message | Error frame in NDJSON -> `useWorkflowStream.error` -> toast.error() |
| ERR-02 | Error messages are actionable | Predefined French error messages per workflow type (extraction, analyse, generation) |
| CCH-01 | React Query invalidations cover both list and detail views after workflow end | Centralized invalidation in `onFinish` covering `candidates.list()`, `candidates.detail(id)`, `positionings.*`, `missions.*`, `dashboard.all` |
| CCH-02 | Positioning Zustand store resets correctly on positioning change | Guard in positioning detail page: reset store when `positioningId` changes |
</phase_requirements>

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @workflow/next | 4.0.1-beta.66 | Workflow runtime | Project's durable workflow engine |
| workflow | 4.2.0-beta.70 | Core workflow primitives | FatalError, getWritable, start, getRun |
| @tanstack/react-query | 5.90.21 | Server state + cache | Polling, invalidation, data freshness |
| zustand | 5.0.11 | Client-only UI state | Positioning store, CV builder store |
| sonner | 2.0.7 | Toast notifications | Already used in project for feedback |
| @supabase/supabase-js | 2.99.1 | Database client | Source of truth for workflow status |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 4.3.6 | Schema validation | Validate error payloads from NDJSON |
| lucide-react | 0.577.0 | Icons | Loading spinners, error/success icons |

**No new packages needed.** All required tools are already in the dependency tree.

## Architecture Patterns

### Current Architecture (what exists)

```
workflows/
  extract-cv.ts              # "use workflow" + "use step" functions
  positioning-analyze.ts     # Same pattern
  positioning-generate.ts    # Same pattern
  analyze-job-posting.ts     # Same pattern

app/api/
  extract/route.ts           # start() + update status to 'extracting'
  positioning/analyze/       # start() + update status to 'analyzing'
  positioning/generate/      # start() + update status to 'generating'
  workflow/[runId]/stream/   # getRun() + getReadable() for reconnection
  workflow/[runId]/cancel/   # Cancel + reset status

lib/hooks/
  useWorkflowStream.ts       # NDJSON consumer, reconnect on reload

lib/queries/
  candidates.ts              # useQuery with refetchInterval when 'extracting'
  positionings.ts            # useQuery with refetchInterval when 'analyzing'/'generating'
  missions.ts                # useQuery with refetchInterval for active workflows

lib/stores/
  positioning.store.ts       # isAnalyzing, isGenerating (volatile flags)
```

### Pattern 1: Workflow Error Handler (new pattern to add)

**What:** Wrap each workflow orchestrator in try/catch, write error status to Supabase on failure
**When to use:** Every workflow file

```typescript
// Source: Derived from workflow runtime docs + codebase analysis
export async function extractCvWorkflow(candidateId: string, jobDescription?: string) {
  'use workflow';

  try {
    const prep = await prepareCvText(candidateId);
    const ext = await parallelExtractAndStream(/* ... */);
    await saveResult(candidateId, result);
    await runMissionAnalysesAfterExtract(candidateId);
    return result.object;
  } catch (error) {
    // Write error status to Supabase so UI reflects failure
    await handleWorkflowError(candidateId, 'candidates', error);
    throw error; // Re-throw so workflow runtime records the failure
  }
}
```

**Critical note:** The `handleWorkflowError` function must be a `"use step"` function because it needs full Node.js access (Supabase client). The workflow sandbox does not allow direct database calls.

```typescript
async function handleWorkflowError(
  recordId: string,
  table: 'candidates' | 'positionings' | 'missions',
  error: unknown,
) {
  'use step';

  const supabase = getSupabase();
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  if (table === 'missions') {
    await supabase
      .from('missions')
      .update({ job_analysis_workflow_run_id: null })
      .eq('id', recordId);
  } else {
    await supabase
      .from(table)
      .update({
        status: 'error',
        workflow_run_id: null,
        last_error: errorMessage,
      })
      .eq('id', recordId);
  }

  // Also write error frame to NDJSON stream so connected clients get it
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  try {
    const encoder = new TextEncoder();
    await writer.write(
      encoder.encode(JSON.stringify({ error: errorMessage }) + '\n'),
    );
  } finally {
    writer.releaseLock();
    await writable.close();
  }
}
```

### Pattern 2: Server-Derived Button State

**What:** Derive button disabled/loading state from React Query data, not Zustand flags
**When to use:** Every workflow trigger button

```typescript
// Source: Codebase pattern (candidates.ts, positionings.ts)
function ExtractionButton({ candidateId }: { candidateId: string }) {
  const { data: candidate } = useCandidate(candidateId);

  const isWorkflowActive = candidate?.status === 'extracting';
  const hasError = candidate?.status === 'error';

  return (
    <Button disabled={isWorkflowActive}>
      {isWorkflowActive && <Spinner data-icon="inline-start" />}
      {hasError ? 'Relancer l\'extraction' : 'Extraire le CV'}
    </Button>
  );
}
```

### Pattern 3: Centralized Cache Invalidation on Workflow Finish

**What:** Single `onFinish` handler that invalidates all relevant query keys
**When to use:** Every `useWorkflowStream` call site

```typescript
const queryClient = useQueryClient();

const invalidateAfterWorkflow = useCallback(() => {
  queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list() });
  queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(candidateId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
}, [queryClient, candidateId]);

const { isLoading, error } = useWorkflowStream<ExtractedCV>({
  api: '/api/extract',
  runId: candidate?.workflow_run_id,
  runStatus: candidate?.status,
  activeStatuses: ['extracting'],
  onFinish: invalidateAfterWorkflow,
});
```

### Pattern 4: Error Frame in NDJSON Stream

**What:** Add typed error handling to `consumeNdjsonStream` in `useWorkflowStream`
**When to use:** The `useWorkflowStream` hook

```typescript
// In consumeNdjsonStream, handle error frames:
const chunk = JSON.parse(trimmed) as {
  index?: number;
  data?: Partial<T>;
  meta?: M;
  error?: string;  // NEW: error frame
};

if (chunk.error) {
  onError(new Error(chunk.error));  // NEW: propagate to hook state
  return;
}
```

### Anti-Patterns to Avoid

- **Zustand for workflow status:** `isAnalyzing`, `isGenerating` in positioning store are volatile. They don't survive page reload. Use Supabase status instead.
- **Silent catch in NDJSON consumer:** The current `catch {}` on line 67 of useWorkflowStream.ts silently swallows JSON parse errors including error frames. Must handle explicitly.
- **Missing error status write:** Currently none of the 4 workflow files write `status: 'error'` to Supabase on failure. After step retries exhaust and the workflow fails, the record stays in `extracting`/`analyzing`/`generating` forever.
- **Inconsistent invalidation:** Some mutation `onSuccess` handlers invalidate both list+detail, others only one. Must cover both after every workflow end.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification system | `sonner` `toast()` | Already in project, handles queue, animations, accessibility |
| Loading spinners in buttons | Custom animated div | shadcn `Spinner` + `data-icon` | Consistent sizing, no manual animation |
| Polling for workflow status | Custom setInterval | React Query `refetchInterval` | Already implemented, auto-cleanup, stale data management |
| Error boundaries | Manual try/catch in every component | React Query error state + toast | Centralized, consistent error display |

## Common Pitfalls

### Pitfall 1: Error Step Still Needs Stream Access
**What goes wrong:** The error handler step tries to write to the NDJSON stream, but the stream may already be closed by a previous step's finally block
**Why it happens:** Each step's `finally` calls `writer.releaseLock()`. If the error handler runs after that, the stream may be in an inconsistent state.
**How to avoid:** The error handler step should call `getWritable()` fresh (it's available in step context). Close the stream in the error handler, not in the failing step.
**Warning signs:** Client never receives error frame despite workflow failing

### Pitfall 2: Workflow Runtime Swallows Errors Internally
**What goes wrong:** The `@workflow/next` beta runtime may catch step errors internally for retry logic, and after max retries the workflow status becomes `failed` but no error is propagated to the NDJSON stream
**Why it happens:** Default step retry is 3 attempts. After exhausting retries, the workflow fails at the runtime level but the Supabase row still says `extracting`.
**How to avoid:** Set `maxRetries = 0` on error handler steps. Wrap the orchestrator with try/catch. The catch runs as a new step that writes error status.
**Warning signs:** Records stuck in `extracting`/`analyzing` after workflow runtime shows `failed`

### Pitfall 3: Race Between Error Write and Cancel
**What goes wrong:** User cancels a workflow while the error handler step is writing the error status. Both try to update the same row.
**Why it happens:** Cancel route and error step are not coordinated.
**How to avoid:** In the cancel route, check the current status. If already `error`, skip the update. Use `workflow_run_id` as a guard condition in the update WHERE clause.
**Warning signs:** Status flipping between `error` and the cancel reset status

### Pitfall 4: Positioning Store Not Reset on ID Change
**What goes wrong:** User navigates from positioning A to positioning B. Store still has positioning A's `analysis`, `tailoredCv`, etc.
**Why it happens:** The store `reset()` is not called when `positioningId` changes.
**How to avoid:** In the positioning detail page/component, add a `useEffect` that calls `reset()` when `positioningId` changes, then hydrates from server data.
**Warning signs:** Stale analysis data shown for a different positioning

### Pitfall 5: DB Schema May Need a `last_error` Column
**What goes wrong:** Error message is lost after writing `status: 'error'` because there's no column to store it.
**Why it happens:** Current schema only has `status` and `workflow_run_id` -- no error message storage.
**How to avoid:** Check if `last_error` column exists on `candidates` and `positionings` tables. If not, add it via Supabase migration or store error in a generic JSONB field.
**Warning signs:** User sees "error" status but no explanation

## Code Examples

### Workflow Error Handler Step
```typescript
// Source: Pattern derived from workflow docs (errors-and-retries.mdx)
import { FatalError, getWritable } from 'workflow';
import { getSupabase } from '@/lib/utils/supabase';

async function writeErrorStatus(
  recordId: string,
  table: 'candidates' | 'positionings',
  errorMessage: string,
) {
  'use step';

  const supabase = getSupabase();
  await supabase
    .from(table)
    .update({
      status: 'error',
      workflow_run_id: null,
      // last_error: errorMessage,  // if column exists
    })
    .eq('id', recordId);

  // Write error to NDJSON stream
  const writable = getWritable<Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  try {
    await writer.write(
      encoder.encode(JSON.stringify({ error: errorMessage }) + '\n'),
    );
  } finally {
    writer.releaseLock();
    await writable.close();
  }
}
writeErrorStatus.maxRetries = 0; // Never retry the error handler itself
```

### Success Toast on Workflow Completion
```typescript
// Source: sonner API + shadcn feedback pattern
import { toast } from 'sonner';

// In the component using useWorkflowStream:
const onFinish = useCallback(() => {
  queryClient.invalidateQueries({ queryKey: queryKeys.candidates.detail(candidateId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.candidates.list() });
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  toast.success('Extraction terminee avec succes');
}, [queryClient, candidateId]);
```

### Error Display in useWorkflowStream
```typescript
// Source: Existing useWorkflowStream pattern
// Add to the hook's consumer:
useEffect(() => {
  if (error) {
    toast.error(error.message || 'Une erreur est survenue');
  }
}, [error]);
```

### Actionable French Error Messages
```typescript
// Source: Project convention (French client context)
const WORKFLOW_ERROR_MESSAGES: Record<string, string> = {
  extraction: 'Extraction echouee. Reessayez ou contactez le support.',
  analysis: 'Analyse echouee. Reessayez ou contactez le support.',
  generation: 'Generation echouee. Reessayez ou contactez le support.',
  default: 'Une erreur est survenue. Reessayez ou contactez le support.',
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Zustand volatile flags for workflow state | Server-derived state from React Query | This phase | Buttons survive page reload |
| Silent error swallowing in NDJSON | Typed error frames + toast display | This phase | Users see failures |
| No error status in Supabase | `status: 'error'` written on workflow failure | This phase | No ghost states |

## Open Questions

1. **Does `candidates` table have a `last_error` column?**
   - What we know: Current schema has `status`, `workflow_run_id`, `extracted_data`, `ai_extraction_duration_ms`
   - What's unclear: Whether a text column for error messages exists or needs migration
   - Recommendation: Check schema. If missing, either add `last_error TEXT` column via Supabase migration, or store error info in a JSONB field. Alternatively, the error message can be passed only through the NDJSON stream and not persisted.

2. **Does `@workflow/next` beta propagate the error message when a workflow fails after max retries?**
   - What we know: Workflow docs show try/catch at orchestrator level works. Steps retry 3 times by default.
   - What's unclear: If the catch block in the workflow function receives the original error or a wrapped runtime error
   - Recommendation: Test with a deliberate failure. The error handler step approach sidesteps this: it catches before the runtime does.

3. **How does `missions` table handle error state for job posting analysis?**
   - What we know: Missions use `job_analysis_workflow_run_id` but have no explicit `status` column for analysis state
   - What's unclear: Whether to add a job analysis status column or infer from `job_analysis_workflow_run_id` being non-null
   - Recommendation: For now, infer: `job_analysis_workflow_run_id !== null` means "running", `null` means "idle" or "done" (check `job_analysis` presence). Error case: clear `job_analysis_workflow_run_id` + show toast. No schema change needed.

## Sources

### Primary (HIGH confidence)
- `node_modules/workflow/docs/foundations/errors-and-retries.mdx` -- FatalError, RetryableError, maxRetries, rollback pattern
- `node_modules/workflow/docs/foundations/streaming.mdx` -- getWritable(), NDJSON stream pattern
- `node_modules/workflow/docs/api-reference/workflow-api/get-run.mdx` -- getRun(), status checks
- `.agents/skills/workflow/SKILL.md` -- Workflow skill reference (verified against installed docs)
- `.agents/skills/react-query/SKILL.md` -- Query invalidation patterns
- `.agents/skills/shadcn/SKILL.md` -- Button loading pattern (Spinner + data-icon + disabled)

### Secondary (MEDIUM confidence)
- Codebase analysis: 4 workflow files, useWorkflowStream hook, query files, positioning store
- STATE.md blockers: Error propagation spike needed, DataStreamWriter access question

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used in codebase
- Architecture: HIGH - Patterns derived directly from existing codebase + official workflow docs
- Pitfalls: HIGH - Identified from actual code analysis (silent catch, missing error writes, volatile flags)

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable patterns, workflow beta may update)
