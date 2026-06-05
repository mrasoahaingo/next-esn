---
phase: quick-260605-eo0
plan: "01"
subsystem: cv-template
tags: [i18n, cv-pdf, labels, present, dateText]
dependency_graph:
  requires: []
  provides: [CV_LABELS.present, language-aware dateText in experiences]
  affects: [templates/cv-dossier-layout.ts, PDF experience date rendering]
tech_stack:
  added: []
  patterns: [CV_LABELS locale map extended with present key]
key_files:
  created: []
  modified:
    - templates/cv-dossier-layout.ts
decisions:
  - "Use exp.isCurrent flag to force L.present when job is ongoing, fall back to exp.endDate ?? L.present otherwise"
metrics:
  duration: ~3min
  completed: "2026-06-05"
  tasks: 1
  files: 1
---

# Phase quick-260605-eo0 Plan 01: Audit Static Labels — Present Key Fix Summary

**One-liner:** Added language-aware `present` key to `CV_LABELS` (fr: 'Présent', en: 'Present') and replaced hardcoded `'Present'` in `addExperiencesBlock` dateText with `L.present`.

## What Was Done

Single task executed: two targeted edits to `templates/cv-dossier-layout.ts`.

1. Added `present: string` to the `CV_LABELS` type shape.
2. Added `present: 'Présent'` to the `fr` locale and `present: 'Present'` to the `en` locale (after `methodologies` in each).
3. Replaced `exp.endDate ?? 'Present'` with a language-aware two-liner:
   - `const endLabel = exp.isCurrent ? L.present : (exp.endDate ?? L.present);`
   - `const dateText = \`${exp.startDate ?? ''} - ${endLabel}\`;`

## Verification

- `grep` on `Present|Présent` shows only the two CV_LABELS entries — no bare string remains in dateText.
- `npx tsc --noEmit` exits clean.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1    | 563c519 | feat(quick-260605-eo0): add present label to CV_LABELS and fix language-aware dateText |

## Self-Check: PASSED

- File modified: `templates/cv-dossier-layout.ts` — confirmed by git commit output
- Commit 563c519 — confirmed by `git commit` output
- No bare `'Present'` string remains outside CV_LABELS
