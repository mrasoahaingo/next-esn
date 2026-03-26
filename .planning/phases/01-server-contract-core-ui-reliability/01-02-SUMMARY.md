---
phase: 01-server-contract-core-ui-reliability
plan: 02
subsystem: ui
tags: [react-query, sonner, workflow, positioning]

requires:
  - phase: 01-01
    provides: NDJSON error frames + Supabase error status writes
provides:
  - Server-derived workflow busy state + French success/error toasts
  - List/detail/dashboard cache invalidation on workflow completion
  - Positioning store reset on navigation between positionings
affects: [positioning-review, mission-position-cards, job-analysis]

tech-stack:
  added: [shadcn Spinner]
  patterns: [toast on stream error via useEffect; busy = server status OR stream isLoading]

key-files:
  created:
    - components/ui/spinner.tsx
  modified:
    - app/review/[id]/page.tsx
    - app/positions/[id]/page.tsx
    - app/review/[id]/positioning/[positioningId]/page.tsx
    - app/review/[id]/positioning/[positioningId]/components/JobInput.tsx
    - app/review/[id]/positioning/[positioningId]/components/EmailsGenerationStep.tsx
    - app/review/[id]/positioning/[positioningId]/components/CvGenerationStep.tsx
    - components/mission-job-analysis.tsx

key-decisions:
  - "Busy state for positioning: isServer* from Supabase status OR useWorkflowStream isLoading (no Zustand isAnalyzing/isGenerating on this page)."
  - "Regen labels: JobInput and step RegenButtons use positioningStatus === error for full French retry CTAs."

patterns-established:
  - "onFinish invalidates positionings.detail + list + candidates.detail + dashboard.all for positioning workflows."
  - "reset() on positioningId route param change before hydration (CCH-02)."

requirements-completed: [BTN-01, BTN-02, BTN-03, BTN-04, ERR-02, CCH-01, CCH-02, WFS-03]

duration: —
completed: 2026-03-26
---

# Phase 01 Plan 02 Summary

**UI wiring for workflow reliability:** extraction and positioning surfaces now mirror Supabase + stream state with Sonner feedback, broader React Query invalidation, and positioning store reset on ID change.

## Performance

- **Tasks:** 2 automated + 1 human verification checkpoint (pending)
- **Files modified:** 7 application files + Spinner component

## Accomplishments

- Installed shadcn `Spinner`; review page and mission flows show success/error toasts and invalidate list + dashboard on extraction/job analysis completion.
- Positioning wizard uses `analysisBusy` / `genBusy` from server status + `useWorkflowStream` loading; removed volatile `setIsAnalyzing` / `setIsGenerating` usage from the page; added `reset()` when `positioningId` changes.
- JobInput, EmailsGenerationStep, and CvGenerationStep support error-state retry labels via `positioningStatus`.

## Task 3 — Human verification

**Status:** Pending (blocking checkpoint in PLAN). Run `pnpm dev` and follow the flows in `01-02-PLAN.md` Task 3 (extraction, analysis, generation, error, navigation). Reply `approved` in a follow-up session or note issues.

## Self-Check: PASSED

- `pnpm exec tsc --noEmit` passes
