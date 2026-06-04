---
phase: quick-260604-lid
plan: 01
subsystem: cv-extraction
tags: [language-detection, llm-prompt, workflow, migration]
dependency_graph:
  requires: []
  provides: [candidates.language persisted on extraction, cv.branch.identity language field instruction]
  affects: [candidates table, extract-cv workflow, llm_tasks cv.branch.identity]
tech_stack:
  added: []
  patterns: [prompt UPDATE migration, result.object cast for language guard]
key_files:
  created:
    - supabase/migrations/20260604153054_fix_identity_prompt_language_detection.sql
  modified:
    - workflows/extract-cv.ts
decisions:
  - Used `lang === 'en' ? 'en' : 'fr'` guard to respect DB CHECK IN ('fr','en') constraint
  - Migration uses UPDATE (not INSERT) — idempotent by overwrite semantics
  - Timestamp updated to 20260604153054 (actual execution time) vs plan's 20260604152955
metrics:
  duration: ~4 minutes
  completed: "2026-06-04T13:32:04Z"
  tasks_completed: 2
  files_changed: 2
---

# Phase quick-260604-lid Plan 01: Fix Language Detection — cv.branch.identity + saveResult Summary

**One-liner:** Language detection wired end-to-end: identity prompt instructs LLM to detect fr/en from source document, saveResult persists detected language to candidates.language with a CHECK-safe guard.

## What Was Built

Two coordinated changes fix the language detection gap:

1. **Migration** (`20260604153054_fix_identity_prompt_language_detection.sql`): UPDATEs the `system_prompt_template` for `cv.branch.identity` in `llm_tasks`. The new prompt adds a `language` field extraction instruction — the LLM now outputs `'fr'` or `'en'` based on the source document's language, while keeping all text fields in French.

2. **Workflow patch** (`workflows/extract-cv.ts`): In `saveResult`, extracts `language` from `result.object` using a safe cast and a `lang === 'en' ? 'en' : 'fr'` guard. Adds `language: detectedLanguage` to the Supabase `.update()` payload, ensuring the detected language is persisted to `candidates.language` on every extraction.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add language detection instruction to cv.branch.identity prompt | 3dbe612 | supabase/migrations/20260604153054_fix_identity_prompt_language_detection.sql |
| 2 | Write detected language to candidates.language in saveResult | c1bb9fa | workflows/extract-cv.ts |

## Deviations from Plan

### Auto-fixed Issues

None.

### Minor Adjustments

**Migration filename timestamp:** Plan specified `20260604152955`, actual execution timestamp is `20260604153054`. Applied per constraint: "Migration filename MUST use current timestamp — run `date +%Y%m%d%H%M%S` first."

## Known Stubs

None — both changes are fully wired. The language field flows from the LLM prompt output through the workflow saveResult into the candidates.language column.

## Verification Results

- `grep -c "détecte la langue principale" ...migration.sql` → 1
- `grep -n "language: detectedLanguage" workflows/extract-cv.ts` → line 456
- `npx tsc --noEmit` → exit 0 (no type errors)

## Self-Check: PASSED

- [x] `supabase/migrations/20260604153054_fix_identity_prompt_language_detection.sql` exists
- [x] `workflows/extract-cv.ts` modified with detectedLanguage
- [x] Commit 3dbe612 exists
- [x] Commit c1bb9fa exists
