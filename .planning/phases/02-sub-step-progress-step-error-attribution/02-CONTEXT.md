# Phase 2: Sub-Step Progress & Step Error Attribution - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver **per-step progress** and **step-level error attribution** for multi-step AI workflows: users see which step is active, which steps finished, and—on failure—which step failed with a specific message. Implements **SUB-01**, **SUB-02**, and **ERR-03**; no new functional features, no stack change.

</domain>

<decisions>
## Implementation Decisions

### Transport, reconnect, and persistence

- **D-01:** **Live UI** for sub-steps is driven primarily by **NDJSON stream chunks** (`meta` + optional `data`), consumed by `useWorkflowStream`, including after reconnect via `GET /api/workflow/[runId]/stream` with `startIndex` replay.
- **D-02:** **Do not** introduce a dedicated `workflow_steps` table in Phase 2 unless a spike shows that stream replay cannot satisfy success criteria (e.g. badges after reload). If a spike fails, fall back to minimal persisted step snapshots in a follow-up plan—**not** in initial Phase 2 scope.
- **D-03:** For **reload after terminal failure**, the parent row’s persisted **workflow error fields** (status + message / structured error already written by the server on failure) must carry enough **step identity** to satisfy ERR-03 (“which step failed”). Prefer extending existing error payload/columns on `candidates` / `positionings` / `missions` as needed rather than a new table.

### Parallel branches and ordering

- **D-04:** Each workflow type defines a **fixed ordered list of logical steps** (user-facing French labels). **Branch keys** (`CvExtractionBranch`, job posting branches, positioning branches, etc.) map to that order via a **single shared map per workflow** in code.
- **D-05:** When **multiple** `activeBranches` are non-empty, show **multiple steps in `running`** at once (honest parallel work)—do not fake a single “current step” that hides parallelism. Optional: group label “Analyse en parallèle” only if it improves clarity without hiding branch names.

### UI pattern

- **D-06:** Use a **compact vertical list** of steps with **status badges** (`pending` / `running` / `done` / `error`) inside existing **Card** or panel surfaces—consistent with current app chrome, **no** full-page redesign or new navigation.
- **D-07:** Show a **single-line summary** (e.g. “Étape 2/4 — …”) **only** as a header or subtitle to the step list; the **badges on each row** are the source of truth (SUB-02).

### Coverage (which screens)

- **D-08:** Phase 2 applies to **all four** streaming workflows for **parity**: **CV extraction**, **job posting analysis**, **positioning analysis**, **positioning generation**—each surface that already uses `useWorkflowStream` (or will) gets the same step UX pattern.

### Error attribution (ERR-03) and feedback

- **D-09:** On failure: show **step-specific** error text **on the failed step row** (badge `error` + message), and **also** a **toast** (Sonner) so the user does not miss it if the step list is scrolled away—aligns with actionable ERR-02-style messaging.
- **D-10:** Copy must **name the failing step** in French (e.g. prefix or template: “[Étape] — …”) and remain **actionable**, not raw stack traces.

### Claude's Discretion

- Exact badge colors/spacing tokens; minor wording tweaks for French labels; whether to add a thin progress connector between vertical steps vs. list only—**Claude** chooses within existing Tailwind/shadcn patterns.

### Folded Todos

_None (no todos matched Phase 2.)_

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and requirements

- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, dependency on Phase 1
- `.planning/REQUIREMENTS.md` — SUB-01, SUB-02, ERR-03; v2 deferred items (partial success, per-step retry) are out of scope

### Product and architecture context

- `.planning/PROJECT.md` — Core value (clear feedback when AI runs); fiabilisation-only scope
- `.planning/research/ARCHITECTURE.md` — Workflow NDJSON, reconnect, polling patterns
- `.planning/codebase/ARCHITECTURE.md` — Layers, `useWorkflowStream`, data flow

### Streaming types and hook (implementation anchors)

- `lib/hooks/useWorkflowStream.ts` — NDJSON consumption, `streamMeta`, reconnect
- `lib/types/cv-extraction-stream.ts` — `CvExtractionStreamMeta`, `CvExtractionBranch`
- `lib/types/job-posting-analysis-stream.ts` — `JobPostingAnalysisStreamMeta`
- `lib/types/positioning-analysis-stream.ts` — `PositioningAnalysisStreamMeta`
- `lib/types/positioning-generate-stream.ts` — `PositioningGenerateStreamMeta`

### Workflows (emitters)

- `workflows/extract-cv.ts`
- `workflows/analyze-job-posting.ts`
- `workflows/positioning-analyze.ts`
- `workflows/positioning-generate.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`useWorkflowStream`**: Already tracks `streamMeta` per chunk; extend UI consumers to render step lists from `meta.phase` + `activeBranches` + typed branch maps.
- **Stream meta types**: Per-workflow `*StreamMeta` and branch unions—use as keys for French labels and ordering.
- **shadcn `Badge` / `Card`**: Fit D-06 vertical step list inside existing layouts.

### Established Patterns

- NDJSON `{ index, data, meta, error? }` — errors can surface as chunk-level `error` or terminal workflow failure; Phase 2 must map failures to **step rows** for ERR-03.
- Reconnect: `GET /api/workflow/[runId]/stream` with resume index—UI should rebuild step state from replayed metas.

### Integration Points

- **CV extraction**: Home/dashboard review flow and any component that starts or subscribes to extract stream
- **Job posting**: Mission upload / analysis entry points using job posting workflow
- **Positioning**: `app/review/[id]/positioning/[positioningId]/` and related step components (`CvGenerationStep`, `EmailsGenerationStep`, etc.)—align step UX with new shared pattern
- **API**: `app/api/workflow/[runId]/stream/route.ts`, workflow start routes

</code_context>

<specifics>
## Specific Ideas

- Roadmap examples: “Étape 2/4 : Analyse des compétences”, badges `pending` / `running` / `done` / `error`, error message example “Extraction CV échouée — fichier corrompu ?”
- **No** fake percentage progress (per PROJECT / REQUIREMENTS out-of-scope list)

</specifics>

<deferred>
## Deferred Ideas

- **Supabase Realtime** for latency (LAT-01) — v2
- **Partial success** and **retry single sub-step** (RES-01, RES-02) — v2
- **Full `workflow_steps` history table** — only if D-02 spike fails

### Reviewed Todos (not folded)

_None._

</deferred>

---

*Phase: 02-sub-step-progress-step-error-attribution*
*Context gathered: 2026-03-26*
