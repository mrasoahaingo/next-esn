# Phase 2 — Technical Research

**Phase:** Sub-Step Progress & Step Error Attribution  
**Question:** What do we need to know to plan SUB-01, SUB-02, and ERR-03 well?

## RESEARCH COMPLETE

---

## Standard stack

- **Streaming:** NDJSON over `fetch` POST or `GET /api/workflow/[runId]/stream?startIndex=0`; `useWorkflowStream` exposes `streamMeta` (last chunk wins) and parses `{ index, data, meta, error }`.
- **UI:** React 19, Tailwind v4, shadcn base-nova, French copy — see `02-UI-SPEC.md` and Phase 1 `01-UI-SPEC.md`.
- **State:** Server truth in Supabase via React Query; workflow status + `workflow_run_id` on `candidates`, `positionings`; `missions.job_analysis_workflow_run_id`.

## Architecture patterns (anchors)

| Artifact | Role |
|----------|------|
| `lib/hooks/useWorkflowStream.ts` | Single consumer for NDJSON; must receive optional **step** on error line for live attribution |
| `lib/types/*-stream.ts` | Per-workflow `*StreamMeta` with `phase` + `activeBranches` — drives **running** / parallel rows |
| `workflows/extract-cv.ts` | Emits `CvExtractionStreamMeta` via `writeLine({ meta })` |
| `workflows/analyze-job-posting.ts` | `JobPostingAnalysisStreamMeta` |
| `workflows/positioning-analyze.ts` | `PositioningAnalysisStreamMeta` |
| `workflows/positioning-generate.ts` | `PositioningGenerateStreamMeta` |
| `workflows/*/handleWorkflowError` | Updates DB + writes `{ error: string }` NDJSON — **extension point** for `stepKey` + DB persistence (ERR-03 reload) |

## Existing UI (baseline)

- `app/review/components/ExtractionProgress.tsx` — section list + branch mapping; **not** yet SUB-01 summary template nor unified badges for all four workflows.
- `app/review/[id]/positioning/[positioningId]/components/AnalysisView.tsx` — branch hints, `streamMeta`.
- `components/mission-job-analysis.tsx` — `formatJobPostingStreamHint`.
- `app/positions/[id]/page.tsx` — dual hints for CV extract + positioning analysis.

## Decisions from CONTEXT.md (locked)

- **D-01:** Live UI from stream `meta` + reconnect replay.
- **D-02:** No `workflow_steps` table in v1; parent-row JSON is OK.
- **D-03:** Persist enough **step identity** on failure for reload — extend parent row error fields.
- **D-04–D-05:** Fixed ordered steps per workflow; multiple `running` rows when parallel.
- **D-06–D-07:** Compact vertical list in Card; badges are source of truth; summary line is header only.
- **D-08:** Parity across all four workflows.
- **D-09–D-10:** Row error + Sonner toast; French, actionable, names the step.

## Gaps to close in implementation

1. **ERR-03 persistence:** `handleWorkflowError` today sets `status: 'error'` / clears run id but does **not** store structured `{ stepKey, message }` for reload. Add nullable JSONB (e.g. `workflow_last_error`) on `candidates`, `positionings`, `missions` (or single text column with convention — JSONB preferred for step key + message).
2. **NDJSON error frame:** Extend to `{ error: string, stepKey?: string }` so live clients attribute without waiting for refetch.
3. **Success paths:** Clear `workflow_last_error` when a workflow completes successfully (same transactions as existing status updates).
4. **Shared UI:** One component + per-workflow **ordered step definitions** (labels + keys) used by all four surfaces — avoid duplicating logic in each page.

## Risk / spike

- **Workflow runtime:** Step-level try/catch must stay in `'use step'` functions; passing `stepKey` into `handleWorkflowError` from the failing step is the straightforward pattern. Top-level workflow catch may use **last known phase** from orchestrator state only if sub-steps delegate errors upward with context.

## Validation architecture

Nyquist validation disabled for this milestone (`workflow.nyquist_validation: false`) — no `VALIDATION.md` required for this phase.
