---
phase: 06-db-schema-foundation
plan: "03"
subsystem: llm
tags: [vitest, template, console.warn, placeholder, guard]

requires:
  - phase: 06-db-schema-foundation
    provides: template-render.ts renderTemplate function already handles missing keys by leaving {{ intact

provides:
  - console.warn guard in resolveLlmTask for unresolved {{ placeholders
  - unit tests for renderTemplate behavior and regex detection

affects:
  - phase-07 (prompt injection multi-langue — guard will catch missing {{language}} context)

tech-stack:
  added: []
  patterns:
    - "Placeholder guard: regex /\\{\\{/ on rendered prompt triggers console.warn with taskKey and placeholder names"

key-files:
  created:
    - lib/llm/resolve-task.test.ts
  modified:
    - lib/llm/resolve-task.ts

key-decisions:
  - "Guard fires on rendered output (post-renderTemplate), not on the template itself — catches real silent passthrough"
  - "warn message includes taskKey and unresolved placeholder names for actionable debug output"

patterns-established:
  - "Guard pattern: check rendered output with regex, extract placeholder names, warn with context"

requirements-completed:
  - PROMPT-02

duration: 8min
completed: 2026-06-04
---

# Phase 06 Plan 03: Placeholder Guard Summary

**console.warn guard added to resolveLlmTask detecting unresolved {{ placeholders in rendered prompts, with taskKey and placeholder names in the warning message**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-04T12:50:00Z
- **Completed:** 2026-06-04T12:58:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Added `/\{\{/.test(systemPrompt)` guard after renderTemplate call in resolveLlmTask
- Guard extracts unresolved placeholder names via regex and logs them with the taskKey
- Created unit test file covering renderTemplate behavior and regex detection logic
- Function signature, return value, and error behavior all unchanged

## Task Commits

1. **Task 1: Ajouter le guard console.warn dans resolveLlmTask** - `fff2e1d` (feat)

## Files Created/Modified

- `lib/llm/resolve-task.ts` - Added console.warn guard after renderTemplate call (lines 74–80)
- `lib/llm/resolve-task.test.ts` - Unit tests for renderTemplate behavior and {{ detection regex

## Decisions Made

Guard fires on the rendered output rather than the template string — this is the correct place since renderTemplate may resolve some placeholders while leaving others intact. Testing renderTemplate directly avoids the need to mock Supabase for these unit tests.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- PROMPT-02 complete: any unresolved {{ in LLM prompts will now surface as console.warn in dev and production
- Phase 7 prompt injection ({{language}}) will benefit immediately from this guard during integration
- No blockers

---
*Phase: 06-db-schema-foundation*
*Completed: 2026-06-04*
