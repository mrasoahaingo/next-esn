---
phase: quick-260604-pin
plan: 01
subsystem: ui
tags: [cv, pdf, language, i18n, experience]

requires: []
provides:
  - Language-aware formatTotalExperienceYears returning "N years" for en, "N ans" for fr
  - prepareCvForMatchingPrompt propagates cv.language to the years label
affects: [cv-pdf-generation, cv-builder, matching-prompt]

tech-stack:
  added: []
  patterns:
    - "Language discriminator pattern: optional language param with 'fr' default for backward compatibility"

key-files:
  created: []
  modified:
    - lib/utils/cv-experience-time.ts
    - lib/utils/cv-experience-time.test.ts

key-decisions:
  - "Optional language parameter with 'fr' default keeps all existing call sites unchanged"
  - "Unit label resolved at leaf function (formatTotalExperienceYears), not caller — single point of change"

patterns-established:
  - "Language param pattern: 'fr' | 'en' = 'fr' optional third param for locale-aware formatters"

requirements-completed:
  - QUICK-260604-pin

duration: 5min
completed: 2026-06-04
---

# Quick Task 260604-pin: Language-aware "ans" / "years" label in formatTotalExperienceYears Summary

**formatTotalExperienceYears now emits "8 years" for English CVs and "8 ans" for French CVs via optional language parameter propagated from cv.language**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-04T18:27:00Z
- **Completed:** 2026-06-04T18:28:00Z
- **Tasks:** 1 (TDD: RED → GREEN)
- **Files modified:** 2

## Accomplishments
- Added optional `language: 'fr' | 'en' = 'fr'` parameter to `formatTotalExperienceYears` — fully backward-compatible
- Unit label is now `language === 'en' ? 'years' : 'ans'`
- `prepareCvForMatchingPrompt` propagates `out.language ?? 'fr'` as third argument
- New test case verifies English CV produces "8 years"; existing French test still passes

## Task Commits

1. **Task 1: Accept language in formatTotalExperienceYears and propagate from CV** - `314d4c2` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified
- `lib/utils/cv-experience-time.ts` - Added `language` param to `formatTotalExperienceYears`, conditional unit label, propagation in `prepareCvForMatchingPrompt`
- `lib/utils/cv-experience-time.test.ts` - Added English CV test case, updated existing test description

## Decisions Made
- Optional parameter with `'fr'` default — zero impact on existing callers outside these two functions
- Unit label resolved at `formatTotalExperienceYears` (leaf), not in `prepareCvForMatchingPrompt` (caller), keeping the formatter self-contained

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- English CVs will now correctly display "8 years" in the PDF's years-of-experience row
- Any other callers of `formatTotalExperienceYears` can pass `'en'` to get the English label

---
*Phase: quick-260604-pin*
*Completed: 2026-06-04*
