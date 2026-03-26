# Codebase Concerns

**Analysis Date:** 2026-03-26

## Security Considerations

**Exposed Credentials in Environment Files:**
- Risk: `.env.local` contains hardcoded Supabase API keys, AI Gateway API key, and Clerk secret key visible in version control
- Files: `.env.local` (contains SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, AI_GATEWAY_API_KEY, CLERK_SECRET_KEY)
- Current mitigation: File exists but likely committed to git (gitStatus shows no .env.local in untracked)
- Recommendations:
  - Move all secrets to `.env.local.example` as template
  - Add `.env.local` to `.gitignore` immediately
  - Rotate all exposed keys (Supabase anon/service role, AI Gateway, Clerk secret)
  - Use Vercel Secrets management in production

**Type Safety Issues in API Routes:**
- Risk: Some routes accept `unknown` types without validation, bypassing type safety
- Files: `app/review/[id]/positioning/[positioningId]/page.tsx:103` (mission record typed as `{ job_analysis?: unknown }`)
- Current mitigation: Partial validation with Zod in some routes
- Recommendations: Apply consistent Zod schema validation to all API request bodies

**Unsafe JSON Parsing:**
- Risk: Not all API routes validate incoming JSON before parsing
- Files:
  - `app/api/missions/[id]/analyze-job/route.ts`: `.catch(() => {})` silently swallows JSON parse errors
  - `app/api/pdf-preview/route.ts`: Reads body without safeParse
  - `app/api/positioning/generate/route.ts`: No validation shown
- Current mitigation: Some routes use `safeParse` (e.g., `app/api/missions/route.ts`, `app/api/positioning/route.ts`)
- Recommendations: Apply Zod `safeParse` to all request body parsing; never silently catch JSON parse errors

## Tech Debt

**Large Monolithic Files:**
- Issue: Single-file components with excessive logic and state management
- Files:
  - `app/page.tsx` (972 lines) - Dashboard component mixing UI, data fetching, calculations
  - `lib/services/positioning.service.ts` (541 lines) - Core positioning logic
  - `lib/schema.ts` (497 lines) - All schema definitions in one file
- Impact: Difficult to test, maintain, and reuse logic; high cognitive load
- Fix approach:
  - Split `app/page.tsx` into smaller components (stats calculation, chart rendering, upload handler)
  - Extract positioning service logic into smaller utility functions by concern
  - Organize schemas into domain-specific files (e.g., `lib/schema/cv.ts`, `lib/schema/positioning.ts`)

**Missing Test Coverage:**
- Issue: Zero test files found in codebase (`find ... -name "*.test.ts" -o -name "*.spec.ts"` returned 0)
- Files: Entire `app/` and `lib/` directories lack unit/integration tests
- Impact: No regression protection, refactoring risk, unknown edge case behavior
- Fix approach:
  - Add unit tests for schema validation and parsing functions (`lib/services/positioning.service.ts`, `lib/utils/`)
  - Add integration tests for API routes using a test request factory
  - Configure vitest and establish coverage targets (>70% for lib/, >50% for app/)
  - Test critical paths: CV extraction, positioning analysis, PDF export

**Inconsistent Error Handling Patterns:**
- Issue: Mix of error handling approaches across codebase
- Files:
  - Some routes throw `NextResponse` directly (`app/api/extract/route.ts:27` - `instanceof NextResponse`)
  - Some routes use Zod `safeParse` (`app/api/missions/route.ts`)
  - Some routes use try-catch and manual error conversion
  - Catch-all uses `.catch(console.error)` without response (`app/review/[id]/positioning/[positioningId]/page.tsx`)
- Impact: Unpredictable error messages, difficult debugging, inconsistent API responses
- Fix approach: Create error handling utility with standardized response format; use consistently across all routes

**Promise Patterns Mixed (then/catch vs async/await):**
- Issue: 26 instances of `.then()` and `.catch()` patterns found alongside async/await
- Files: Multiple API routes and client components use both patterns
- Impact: Inconsistent async handling, harder to follow control flow
- Fix approach: Migrate all `.then()/.catch()` to async/await for consistency

**Console Logging in Production Code:**
- Issue: `console.error()` calls scattered throughout API routes for debugging
- Files: 20+ instances found in API routes and error handlers
- Impact: Noisy production logs, security risk if sensitive data is logged
- Current mitigation: Error messages logged to console
- Recommendations: Replace with structured logging (Winston, Pino); remove development-only logs before production; mask sensitive data

## Fragile Areas

**State Management Complexity in Positioning Workflow:**
- Files: `lib/stores/positioning.store.ts`, `app/review/[id]/positioning/[positioningId]/page.tsx`
- Why fragile:
  - Large Zustand store with 25+ state fields and setters for positioning workflow
  - Multiple mutable structures: `recruiterAnswerEntries` (Record<string, PositioningRecruiterAnswerEntry[]>)
  - Complex computed values combining multiple store fields with derived data from queries
  - Implicit coupling between store state and multiple query results (usePositioning, useCandidate)
- Safe modification:
  - Never directly mutate store objects; always create new objects
  - Document field dependencies in comments
  - Add validation before state updates
  - Test all multi-step workflows with existing state

**PDF Blob URL Management:**
- Files: `lib/stores/positioning.store.ts:79-90` (pdfBlobUrl setter), `components/` (PDF rendering)
- Why fragile:
  - BlobURLs have short lifetimes and browser-specific behavior
  - No cleanup mechanism for revoked URLs
  - PDF loading state (`isPdfLoading`) can be out of sync with actual blob availability
- Safe modification: Always call `URL.revokeObjectURL()` when replacing or clearing blob URLs; add tests for lifecycle

**Dynamic Component Loading:**
- Files: `app/page.tsx:34-41` (ScoreDistributionChart, SkillCoverageChart), `app/review/[id]/positioning/[positioningId]/page.tsx:50-53` (AnalysisCharts)
- Why fragile:
  - Dynamic imports with `ssr: false` and custom loading fallbacks
  - No error boundary if lazy-loaded component fails to load
  - Fallback loading UI doesn't match actual component height (may cause layout shift)
- Safe modification: Wrap dynamic components with error boundary; match loading skeleton height to actual component

**Zustand Store Partial Types:**
- Files: `lib/stores/positioning.store.ts:8-12` (uses `Partial<>` for multiple state fields)
- Why fragile:
  - `Partial<PositioningAnalysis>` means any property could be missing at runtime
  - No validation that required fields are present before use
  - Risk of `undefined` access without null checks
- Safe modification: Use specific types or validation instead of `Partial<>`; add runtime schema validation for loaded data

## Performance Bottlenecks

**Large Dashboard Page (972 lines):**
- Problem: Single component handling data fetching, calculations, and rendering
- Files: `app/page.tsx`
- Cause: No component decomposition; all logic in one place
- Improvement path:
  - Extract stat calculations into separate memo'd component
  - Use `React.memo()` for chart components
  - Lazy-load charts below fold
  - Consider pagination for candidate/positioning lists

**Unoptimized List Rendering:**
- Problem: Dashboard renders all candidates and positionings in a single list
- Files: `app/page.tsx:180-195` (filter operations on full arrays)
- Cause: No pagination or virtual scrolling
- Improvement path: Implement pagination with React Query's `useInfiniteQuery` or virtual scrolling with `react-window`

**Unnecessary Re-renders from Store:**
- Problem: Positioning store has 25+ fields; any state update triggers subscribers for all fields
- Files: `lib/stores/positioning.store.ts`
- Cause: Single Zustand store without field-level subscriptions
- Improvement path: Split store into smaller focused stores (JobDescription, Analysis, CvEditor, EmailGenerator) or use selector-based subscriptions

**Query Client Invalidations:**
- Problem: `queryClient.invalidateQueries()` without specificity
- Files: API response handlers and store update methods
- Cause: Likely invalidating entire query cache instead of specific queries
- Improvement path: Use query keys from `lib/queries/keys.ts` to invalidate specific queries; add selective invalidation

## Dependencies at Risk

**Workflow Package (4.0.1-beta):**
- Risk: Beta version of critical workflow orchestration library
- Package: `@workflow/ai`, `@workflow/next`, `workflow` (version 4.0.1-beta.70 and 4.0.1-beta.56)
- Impact: Breaking changes possible between builds; production stability unknown
- Migration plan: Monitor for stable release; establish tested upgrade path; consider vendoring critical functions

**Outdated/Duplicate PostCSS:**
- Risk: Two versions of PostCSS in node_modules (8.4.31 and 8.5.8)
- Package: `postcss` (pnpm duplicate versions)
- Impact: Potential build inconsistencies; larger node_modules
- Migration plan: Run `pnpm dedupe`; lock single PostCSS version in pnpm-lock.yaml

**JSON-Render for PDF:**
- Risk: Alpha version rendering engine with limited maturity
- Package: `@json-render/core`, `@json-render/react`, `@json-render/react-pdf` (0.14.0)
- Impact: May have rendering bugs; limited support/documentation
- Migration plan: Test PDF export edge cases thoroughly; prepare fallback rendering approach

**React 19 with RC Libraries:**
- Risk: Using React 19.2.4 with some libraries still supporting React 18
- Package: React 19 with older versions of base-ui, ai-sdk modules
- Impact: Potential peer dependency conflicts; incompatible hooks
- Migration plan: Audit all major dependencies for React 19 compatibility; test thoroughly

## Missing Critical Features

**No Input Rate Limiting:**
- Problem: API routes accept requests without rate limiting
- Files: All routes in `app/api/`
- Blocks: Risk of abuse; large file uploads; uncontrolled workflow invocations
- Recommendation: Implement rate limiting (e.g., `Ratelimit` from `@vercel/ratelimit` or similar)

**No Request ID Tracing:**
- Problem: No correlation IDs for request logging and debugging
- Files: All API routes
- Blocks: Difficult to trace multi-step workflows across service calls
- Recommendation: Add request ID middleware; pass through to Supabase and workflow calls

**No Webhook Signature Verification:**
- Problem: Cannot verify incoming webhooks from Clerk, Workflow, or other services
- Files: `app/api/webhook` routes (not found)
- Blocks: Vulnerable to spoofed webhook requests
- Recommendation: Implement signature verification per service documentation

## Scaling Limits

**Single Supabase Instance:**
- Current capacity: Free tier or small Pro plan (unclear from config)
- Limit: Will hit connection limits; no read replicas for analytics queries
- Scaling path:
  - Profile database queries from dashboards
  - Add connection pooling (PgBouncer)
  - Create materialized views for dashboard metrics
  - Consider read replica for reporting

**Workflow Queue Capacity:**
- Current capacity: Unknown (depends on workflow service limits)
- Limit: Concurrent CV extractions and positioning analyses may queue
- Scaling path:
  - Add job queue (Bull, RabbitMQ) for batch processing
  - Implement exponential backoff for workflow failures
  - Monitor workflow service SLAs

**Client-Side State in Zustand:**
- Current capacity: Positioning store holds all workflow state in memory
- Limit: Large PDFs and long editing sessions may cause memory issues
- Scaling path:
  - Persist state to IndexedDB for recovery
  - Implement periodic cleanup of old blob URLs
  - Add memory usage monitoring

## Validation Gaps

**Incomplete Zod Schema Coverage:**
- Problem: Not all API request bodies have corresponding Zod schemas
- Files: Multiple routes bypass validation
- Impact: Invalid data can propagate to database and workflows
- Fix: Create comprehensive schema file (`lib/validation/api.ts`) with schemas for all POST/PATCH/DELETE endpoints

**Missing Runtime Assertions:**
- Problem: Assumes query results contain expected fields without validation
- Files: `app/page.tsx:99-110` (assumes positioning data structure), `app/review/[id]/positioning/[positioningId]/page.tsx:130-146`
- Impact: Runtime errors if schema changes in database
- Fix: Wrap all data operations with `safeParse()` and handle parse errors

---

*Concerns audit: 2026-03-26*
