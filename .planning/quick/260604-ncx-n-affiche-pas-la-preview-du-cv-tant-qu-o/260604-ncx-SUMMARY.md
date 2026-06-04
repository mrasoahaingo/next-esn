---
phase: quick-260604-ncx
plan: "01"
subsystem: cv-preview
tags: [pdf-preview, language-detection, ux, fix]
dependency_graph:
  requires: []
  provides: [identity-gated-pdf-preview]
  affects: [app/review/components/PdfPreviewSync.tsx]
tech_stack:
  added: []
  patterns: [null-gate before hook invocation]
key_files:
  modified:
    - app/review/components/PdfPreviewSync.tsx
decisions:
  - Gate fires in consumer component (PdfPreviewSync), not inside usePdfPreview, to avoid impacting the template editor which uses the same hook
metrics:
  duration: "~5 minutes"
  completed: "2026-06-04"
  tasks_completed: 1
  files_modified: 1
---

# Phase quick-260604-ncx Plan 01: CV Preview Language Gate Summary

**One-liner:** Gate PDF preview trigger on identity step completion so first render uses real detected language, eliminating the fr→en blink.

## What Was Done

During CV extraction streaming, `language` starts as `'fr'` (Zod schema default) before the LLM's `identity` step runs. `usePdfPreview` would immediately fire a PDF request with `language: 'fr'`, then re-fire with `language: 'en'` when real data arrived — causing a visible blink.

The fix: `PdfPreviewSync` now computes `identityResolved` before invoking `usePdfPreview`. Until `personalInfo.firstName`, `personalInfo.lastName`, or `summary` is present (any one of these signals the identity step completed), the hook receives `null` instead of `data`. The hook's existing `null` contract cancels/prevents any in-flight request and calls `onResetPreview`.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- File exists: `app/review/components/PdfPreviewSync.tsx` — FOUND
- Commit exists: `ece88a0` — FOUND
- TypeScript: no errors
