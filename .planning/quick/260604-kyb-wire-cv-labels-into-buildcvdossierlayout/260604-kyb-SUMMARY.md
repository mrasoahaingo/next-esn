---
phase: quick-260604-kyb
plan: "01"
subsystem: pdf-generation
tags: [i18n, pdf, cv-labels, language-aware]
dependency_graph:
  requires: [Phase 06 extractionSchema language field]
  provides: [language-aware PDF label rendering]
  affects: [templates/cv-dossier-layout.ts, lib/utils/cv-experience-time.test.ts]
tech_stack:
  added: []
  patterns: [CV_LABELS lookup via data.language ?? 'fr']
key_files:
  created: []
  modified:
    - templates/cv-dossier-layout.ts
    - lib/utils/cv-experience-time.test.ts
decisions:
  - CV_LABELS extended in-place with new keys alongside existing ones (backward compatible)
  - data.language ?? 'fr' used as fallback — French PDF unchanged when language is undefined
metrics:
  duration: ~5 minutes
  completed_date: "2026-06-04"
---

# Phase quick-260604-kyb Plan 01: Wire CV Labels Summary

**One-liner:** CV_LABELS expanded with 14 new fr/en keys, wired into all 5 block builders via `data.language ?? 'fr'` so PDF previews render labels in document language.

## What Was Done

Task 1 executed fully:

1. Expanded `CV_LABELS` in `templates/cv-dossier-layout.ts` to include all formerly-hardcoded French strings as typed keys in both `fr` and `en` entries: `poste`, `yearsOfExperience`, `location`, `email`, `phone`, `summaryHeading`, `skillsHeading`, `educationHeading`, `experiencesHeading`, `technologies`, `softSkills`, `expertises`, `methodologies`.

2. Wired language resolution in each of the 5 block builders:
   - `addProfileInfoBlock` — info table row labels (Poste, Années d'expérience, Localisation, Disponibilité, Email, Téléphone)
   - `addSummaryBlock` — section heading (Synthèse du profil / Profile Summary)
   - `addSkillsBlock` — skill category labels (Technologies, Soft skills, Expertises, Méthodologies) + section heading (Compétences / Skills)
   - `addEducationBlock` — section heading (Formations / Education)
   - `addExperiencesBlock` — section heading (Expériences professionnelles / Professional Experience)

3. Each builder reads `const lang = data.language ?? 'fr'; const L = CV_LABELS[lang];` at the top of its function body.

## Verification

- TypeScript compiles without errors: `npx tsc --noEmit` exits 0
- No hardcoded French strings remain in builder functions (all occurrences of former hardcoded strings are now inside the `CV_LABELS` constant only)
- French PDF unchanged: `data.language = 'fr'` or `undefined` → French labels via fallback
- English PDF: `data.language = 'en'` → English labels

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 — Expand CV_LABELS and wire language into block builders | 1e42d2c | templates/cv-dossier-layout.ts, lib/utils/cv-experience-time.test.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing `language` field in test fixture**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** `lib/utils/cv-experience-time.test.ts` line 12 — `baseCv()` helper returned `ExtractedCV` without the `language` field, which Phase 06 added as a required field (with default `'fr'`). TypeScript reported `TS2322` type incompatibility.
- **Fix:** Added `language: 'fr'` to the fixture object in `baseCv()`.
- **Files modified:** `lib/utils/cv-experience-time.test.ts`
- **Commit:** 1e42d2c (bundled with task commit)

## Known Stubs

None — all label keys are fully translated in both `fr` and `en`.

## Self-Check: PASSED

- `templates/cv-dossier-layout.ts` — modified and committed (1e42d2c)
- `lib/utils/cv-experience-time.test.ts` — modified and committed (1e42d2c)
- TypeScript compilation: clean
