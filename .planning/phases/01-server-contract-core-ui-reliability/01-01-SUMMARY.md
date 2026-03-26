---
phase: 01-server-contract-core-ui-reliability
plan: 01
subsystem: api
tags: [workflow, ndjson, error-handling, supabase, streaming]

requires: []
provides:
  - "Workflow error handlers that write status 'error' to Supabase on failure"
  - "NDJSON error frame emission from workflow error handlers"
  - "useWorkflowStream error frame parsing and propagation to hook error state"
affects: [01-02, ui-feedback, workflow-reliability]

tech-stack:
  added: []
  patterns:
    - "handleWorkflowError step function pattern for workflow error cleanup"
    - "NDJSON error frame { error: string } as last frame on workflow failure"

key-files:
  created: []
  modified:
    - workflows/extract-cv.ts
    - workflows/positioning-analyze.ts
    - workflows/positioning-generate.ts
    - workflows/analyze-job-posting.ts
    - lib/hooks/useWorkflowStream.ts

key-decisions:
  - "Error handler is local to each file (not shared module) because workflow runtime needs step functions co-located with their workflow"
  - "handleWorkflowError.maxRetries = 0 -- retrying error cleanup is nonsensical"
  - "Error handler closes the NDJSON stream after writing error frame, since the normal save step (which would close it) is never reached on failure"

patterns-established:
  - "handleWorkflowError step pattern: update Supabase status, write NDJSON error frame, close stream"
  - "NDJSON error frame detection in consumeNdjsonStream: check chunk.error, call onError, return early"

requirements-completed: [WFS-01, WFS-02, WFS-03, WFS-04, ERR-01]

duration: 2min
completed: 2026-03-26
---

# Phase 01 Plan 01: Workflow Error Handling Summary

**try/catch error handlers in all 4 workflow orchestrators writing status 'error' to Supabase + NDJSON error frame parsing in useWorkflowStream**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T20:44:54Z
- **Completed:** 2026-03-26T20:47:16Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- All 4 workflow orchestrators (extract-cv, positioning-analyze, positioning-generate, analyze-job-posting) now have try/catch with error cleanup
- On failure, Supabase records are set to status 'error' with workflow_run_id cleared (or job_analysis_workflow_run_id for missions)
- NDJSON error frame { error: message } written to stream so connected clients receive it
- useWorkflowStream hook now detects error frames and sets hook error state

## Task Commits

Each task was committed atomically:

1. **Task 1: Add shared workflow error handler step + wrap all 4 orchestrators** - `90fb712` (feat)
2. **Task 2: Make useWorkflowStream parse NDJSON error frames** - `e84f182` (feat)

## Files Created/Modified
- `workflows/extract-cv.ts` - Added handleWorkflowError step, wrapped extractCvWorkflow in try/catch
- `workflows/positioning-analyze.ts` - Added handleWorkflowError step, wrapped positioningAnalyzeWorkflow in try/catch
- `workflows/positioning-generate.ts` - Added handleWorkflowError step, wrapped positioningGenerateWorkflow in try/catch
- `workflows/analyze-job-posting.ts` - Added handleWorkflowError step (missions variant), wrapped analyzeJobPostingWorkflow in try/catch
- `lib/hooks/useWorkflowStream.ts` - Added onError callback to consumeNdjsonStream, error frame detection, propagation to setError

## Decisions Made
- Error handler is local to each file (not a shared module) because the workflow runtime discovers step functions by file co-location
- Set maxRetries=0 on error handler to prevent retry loops on cleanup
- Error handler closes the stream (writable.close()) since the normal save step is skipped on failure paths

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all error handling is fully wired from workflow failure to Supabase status update to NDJSON stream to hook error state.

## Next Phase Readiness
- Server contract for error propagation is complete
- Plan 01-02 can now build UI feedback states that consume the error state from useWorkflowStream
- The error frame format { error: string } is the contract between server and client

---
*Phase: 01-server-contract-core-ui-reliability*
*Completed: 2026-03-26*
