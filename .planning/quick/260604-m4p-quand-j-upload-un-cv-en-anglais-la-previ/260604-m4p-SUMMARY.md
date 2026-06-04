---
phase: quick-260604-m4p
plan: "01"
subsystem: extraction
tags: [language-detection, pdf-preview, merge, streaming, bug-fix]
dependency_graph:
  requires: []
  provides: [language-propagation-through-stream-merge]
  affects: [pdf-preview, cv-labels]
tech_stack:
  added: []
  patterns: [TDD red-green]
key_files:
  created:
    - lib/services/extraction-merge.test.ts
  modified:
    - lib/services/extraction-merge.ts
decisions:
  - language field is a primitive (fr|en), direct assignment is correct — no deep merge needed
  - sectionSpacing added alongside language for completeness (same pattern, same omission)
metrics:
  duration: ~5min
  completed: "2026-06-04T14:00:52Z"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 2
---

# Phase quick-260604-m4p Plan 01: Add language field to mergeExtractedPartial Summary

**One-liner:** Fixed silent language field drop in stream merge so PDF preview uses English labels when English CV is uploaded.

## What Was Done

`mergeExtractedPartial` in `lib/services/extraction-merge.ts` handled all `ExtractedCV` fields except `language` and `sectionSpacing`. During streaming, the identity branch emits the `language` field first, but it was silently discarded by the merge function, causing the accumulated stream object to always have `language: undefined`. The PDF template then fell back to `'fr'` via `data.language ?? 'fr'`.

The fix adds two lines after line 74 (the `strengths` handler):

```typescript
if (patch.language !== undefined) acc.language = patch.language;
if (patch.sectionSpacing !== undefined) acc.sectionSpacing = patch.sectionSpacing;
```

TDD was followed: tests written first (RED — 2 failures), then implementation added (GREEN — all 4 pass).

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add language field to mergeExtractedPartial | d121307 | lib/services/extraction-merge.ts, lib/services/extraction-merge.test.ts |

## Deviations from Plan

None — plan executed exactly as written. `sectionSpacing` addition was explicitly called for in the plan's action section.

## Known Stubs

None.

## Self-Check: PASSED

- lib/services/extraction-merge.ts — exists with fix applied
- lib/services/extraction-merge.test.ts — exists with 4 passing tests
- Commit d121307 — verified in git log
