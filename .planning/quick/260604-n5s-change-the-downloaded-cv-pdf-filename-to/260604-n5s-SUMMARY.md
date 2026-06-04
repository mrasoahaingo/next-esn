---
phase: quick-260604-n5s
plan: 01
subsystem: cv-download
tags: [pdf, filename, utility, tdd]
dependency_graph:
  requires: []
  provides: [buildCvPdfFilename utility]
  affects: [PdfPreview.tsx, positioning page download]
tech_stack:
  added: []
  patterns: [TDD red-green, NFD accent normalization]
key_files:
  created:
    - lib/utils/cv-pdf-filename.ts
    - lib/utils/cv-pdf-filename.test.ts
  modified:
    - app/review/components/PdfPreview.tsx
    - app/review/[id]/positioning/[positioningId]/page.tsx
decisions:
  - Slug uses NFD normalization + combining char strip (U+0300–U+036F range) for reliable cross-platform accent stripping
  - Filename format: cv-himeo-{slug}.pdf with cv-himeo.pdf fallback when no name available
  - candidateDisplayName already computed via useMemo in positioning page — reused directly
metrics:
  duration: ~6 min
  completed: "2026-06-04"
  tasks_completed: 2
  files_changed: 4
---

# Phase quick-260604-n5s Plan 01: CV PDF Filename Summary

**One-liner:** CV download filename changed from hardcoded ESNEO_CV.pdf to candidate-specific cv-himeo-{slug}.pdf using NFD-normalized slug.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create buildCvPdfFilename utility (TDD) | ccf5cf3 | lib/utils/cv-pdf-filename.ts, lib/utils/cv-pdf-filename.test.ts |
| 2 | Wire filename into all PDF download points | 2fda7e7 | app/review/components/PdfPreview.tsx, app/review/[id]/positioning/[positioningId]/page.tsx |

## What Was Built

A `buildCvPdfFilename(name?: string | null): string` utility in `lib/utils/cv-pdf-filename.ts` that:
- Accepts an optional candidate name string
- Normalizes accents via NFD decomposition + combining char stripping
- Lowercases, replaces spaces with hyphens, collapses multiple hyphens
- Returns `cv-himeo-{slug}.pdf` or `cv-himeo.pdf` as fallback

Wired into:
- `PdfPreview.tsx`: reads `cvData.personalInfo.firstName + lastName` from Zustand store
- `positioning/[positioningId]/page.tsx`: uses existing `candidateDisplayName` computed value at 3 download points

## Verification

- `grep -r "ESNEO_CV" app/review/...` → 0 results
- `npx vitest run lib/utils/cv-pdf-filename.test.ts` → 8/8 pass
- `npx tsc --noEmit` → no errors

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- lib/utils/cv-pdf-filename.ts: FOUND
- lib/utils/cv-pdf-filename.test.ts: FOUND
- Commits ccf5cf3 and 2fda7e7: FOUND
