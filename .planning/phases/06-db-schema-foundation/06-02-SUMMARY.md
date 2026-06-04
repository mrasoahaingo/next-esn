---
phase: 06-db-schema-foundation
plan: "02"
subsystem: schema
tags: [schema, zod, multilang, cv-template, language-detection]
dependency_graph:
  requires: []
  provides:
    - "extractionSchema.language (z.enum fr|en)"
    - "extractionIdentitySchema.language"
    - "CV_LABELS bilingual map"
  affects:
    - "Phase 7: LLM workflows will consume language field from extractionIdentitySchema"
    - "Phase 8: PDF pipeline will use CV_LABELS for bilingual section headings"
tech_stack:
  added: []
  patterns:
    - "Zod enum with .default() for language auto-detection"
    - "Record<'fr'|'en', {...}> type for bilingual label maps"
key_files:
  created: []
  modified:
    - lib/schema.ts
    - templates/cv-dossier-layout.ts
decisions:
  - "language field added at root of extractionSchema (not nested in personalInfo) — language is a document-level property"
  - "CV_LABELS declared but not wired to PDF pipeline — consumed by Phase 8"
  - "language defaults to 'fr' to preserve backward compatibility with existing extractions"
metrics:
  duration: "74s"
  completed_date: "2026-06-04"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 6 Plan 2: Zod Schema + CV_LABELS Language Support Summary

Zod language field (`z.enum(['fr','en']).default('fr')`) added to `extractionSchema` and `extractionIdentitySchema.pick()`; bilingual `CV_LABELS` map declared in `cv-dossier-layout.ts` for Phase 8 PDF wiring.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add language to extractionSchema and extractionIdentitySchema | 451e555 | lib/schema.ts |
| 2 | Add CV_LABELS to templates/cv-dossier-layout.ts | 21176cb | templates/cv-dossier-layout.ts |

## What Was Built

### Task 1 — `lib/schema.ts`

Added `language` field at the root of `extractionSchema` (before `personalInfo`) with type `z.enum(['fr', 'en']).default('fr')` and a `.describe()` for LLM auto-detection guidance. Updated `extractionIdentitySchema.pick()` to include `language: true` so the identity extraction sub-schema exposes the detected language.

### Task 2 — `templates/cv-dossier-layout.ts`

Exported `CV_LABELS` as `Record<'fr' | 'en', {...}>` covering 8 section labels: `docTitle`, `summary`, `skills`, `experiences`, `education`, `strengths`, `availability`, `contact`. Block is purely additive — no existing functions (`resolveTheme`, `buildCvDossierLayout`) were modified. Phase 8 will wire this into the PDF rendering pipeline.

## Decisions Made

- `language` placed at root of `extractionSchema` (not nested in `personalInfo`) because it is a document-level property, not personal data.
- `.default('fr')` ensures all existing `ExtractedCV` records without a language field remain valid without migration.
- `CV_LABELS` declared but not consumed in this phase — Phase 8 responsibility.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — `CV_LABELS` is intentionally not wired to the PDF pipeline. This is by design; Phase 8 will resolve this.

## Self-Check: PASSED

- `lib/schema.ts` modified: language field at line 117, language: true in pick at line 190
- `templates/cv-dossier-layout.ts` modified: CV_LABELS exported at line 23
- Commits exist: 451e555 (task 1), 21176cb (task 2)
- TypeScript: no errors on modified files (`npx tsc --noEmit` clean on schema.ts and cv-dossier-layout.ts)
