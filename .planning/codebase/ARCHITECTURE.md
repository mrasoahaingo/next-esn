# Architecture

**Analysis Date:** 2026-03-26

## Pattern Overview

**Overall:** Next.js 16+ Server-Driven Full-Stack with Streaming Workflows

**Key Characteristics:**
- Modular layering: Pages → Components → Hooks → Services → Utilities
- Server-client boundary managed via `'use client'` directives
- Workflow-based async processing (extracted CV, positioning analysis, job posting analysis)
- Streaming responses for long-running AI operations
- Type-safe data flow with Zod schema validation
- State management via Zustand (client-side) and React Query (server sync)
- Middleware-based authentication and org routing

## Layers

**Page Layer (App Router):**
- Purpose: Define routes and render layouts, manage page-level state
- Location: `app/*/page.tsx`, `app/layout.tsx`
- Contains: Page components, route-specific logic, dynamic segments (`[id]`)
- Depends on: Hooks, components, queries, stores
- Used by: Next.js app router

**Component Layer:**
- Purpose: Reusable UI building blocks and feature-specific sections
- Location: `components/` (root components, feature containers), `components/ui/` (shadcn primitives)
- Contains: React Client components, containers, layouts
- Depends on: Hooks, stores, utilities, UI library (shadcn via Base UI)
- Used by: Pages, other components

**Hook Layer:**
- Purpose: Custom React hooks for state, side effects, and data fetching
- Location: `lib/hooks/` (custom hooks), `lib/queries/` (React Query mutations/queries)
- Contains: Auth hooks (`useOrgRole`, `useSuperAdmin`), stream hooks (`useWorkflowStream`), business logic hooks
- Depends on: Queries, stores, services, authentication
- Used by: Components, pages

**Query/Data Fetching Layer:**
- Purpose: React Query setup and TanStack Query hooks for server-client sync
- Location: `lib/queries/*.ts` (index exports all hooks)
- Contains: `useQuery` wrappers, mutation hooks, cache invalidation
- Key files: `candidates.ts`, `missions.ts`, `positionings.ts`, `templates.ts`, `admin.ts`
- Depends on: API routes, authentication
- Used by: Components, pages, hooks

**API Route Layer:**
- Purpose: Next.js API handlers that serve client requests and coordinate backend work
- Location: `app/api/*/route.ts`
- Contains: Route handlers (GET, POST, PATCH, DELETE), request validation, error handling
- Depends on: Services, utilities, database access (Supabase)
- Used by: React Query, direct fetch calls

**Service Layer:**
- Purpose: Business logic encapsulation (CV extraction, positioning analysis, job posting analysis)
- Location: `lib/services/*.ts`
- Contains: Analysis triggers, merge logic, PDF generation, AI service orchestration
- Key files: `positioning.service.ts`, `job-posting-analysis.service.ts`, `pdf.service.ts`
- Depends on: Schemas, utilities, LLM config, database
- Used by: API routes, workflow pipelines

**Schema/Type Layer:**
- Purpose: Zod schemas for validation and TypeScript type definitions
- Location: `lib/schema.ts`, `lib/types/*.ts`, `lib/validation/`
- Contains: Data shape definitions (CV extraction, analysis output, config), Zod parsers
- Depends on: Nothing (foundational)
- Used by: All layers

**Utility Layer:**
- Purpose: Pure functions, helpers, and cross-cutting concerns
- Location: `lib/utils/*.ts`
- Contains: Auth utilities, Supabase client setup, formatting, skill labeling, PDF embedding
- Depends on: Supabase, Clerk, schema layer
- Used by: All layers

**Store Layer (Client State):**
- Purpose: Zustand stores for client-only state (not synced with server)
- Location: `lib/stores/*.ts`
- Contains: CV builder state, positioning state, template state, demo mode flag
- Depends on: Schema layer, types
- Used by: Client components, hooks

**LLM & Workflow Layer:**
- Purpose: LLM task resolution, workflow streaming, template rendering
- Location: `lib/llm/*.ts`, `workflows/` (external package boundary)
- Contains: Task key resolution, prompt rendering, workflow stream handling
- Depends on: Schema, configuration, services
- Used by: API routes, hooks

## Data Flow

**CV Extraction Flow:**

1. User uploads PDF → `page.tsx` (or sidebar) triggers `useUploadCv` mutation
2. `useCandidates.ts` POST to `/api/candidates` → creates candidate record
3. User clicks "Extract" → `page.tsx` calls `useExtractCv` (or direct fetch to `/api/extract`)
4. `/api/extract/route.ts` → calls `workflow.start(extractCvWorkflow, [candidateId])`
5. Workflow streams NDJSON updates (`CvExtractionStream` type from `lib/types/`)
6. Client-side stream reader updates UI in real-time, triggers React Query invalidation
7. Extracted data stored in `candidates.extracted_data` (JSONB)
8. User reviews/edits in client → `useCvBuilderStore` tracks dirty state
9. Submit → POST `/api/candidates/[id]` updates Supabase with reviewed data

**Positioning Analysis Flow:**

1. User selects candidate + job description → `useCreatePositioning` mutation
2. POST `/api/positionings` → creates positioning record with `status: 'analyzing'`
3. Background: `/api/missions/[id]/analyze-job` or internal trigger calls `positioning.service.ts`
4. Service builds prompt with candidate CV + job description + mission context
5. LLM generates analysis → `PositioningAnalysis` schema (structured JSON with matchScore, skillMatches)
6. Result stored in `positionings.analysis` (JSONB)
7. Client polls or subscribes → React Query `usePositioning` fetches updated record
8. Component renders analysis, skill matches, score distribution
9. User can regenerate or export to PDF → `useExportPositioning` streams PDF

**Server-to-Client Sync:**

1. API returns NextResponse JSON or streaming response
2. React Query `useQuery` caches result with `queryKey` from `lib/queries/keys.ts`
3. Mutations call API, then auto-invalidate query cache → triggers refetch
4. Streaming responses use NDJSON format (`Content-Type: application/x-ndjson`)
5. Client `EventSource` or manual `fetch().body.getReader()` pipes to UI
6. Zustand stores hold transient local state (CV builder, positioning draft)

**State Management:**

- **Server State:** React Query + Supabase (source of truth for candidates, missions, positionings, org settings)
- **Local State:** Zustand stores for CV editing, positioning drafts, template building
- **UI State:** React component state for forms, modals, loading, selections

## Key Abstractions

**Candidate:**
- Purpose: Represents a job applicant with CV data
- Files: `lib/schema.ts` (extraction schema), `lib/queries/candidates.ts`, `app/api/candidates/route.ts`
- Pattern: Extracted CV stored as `extracted_data` JSON, undergoes review cycle before finalization

**Mission (Job Position):**
- Purpose: A specific job opening/role that candidates are matched against
- Files: `lib/schema.ts` (mission schema), `lib/services/job-posting-analysis.service.ts`
- Pattern: Contains job description, key points, expected expertise level; triggers analysis of candidates

**Positioning:**
- Purpose: CV-to-job matching analysis with detailed match scores and skill mappings
- Files: `lib/services/positioning.service.ts`, `lib/schema.ts`, `lib/queries/positionings.ts`
- Pattern: Created per candidate-mission pair, analysis cached, regeneratable on demand

**Template:**
- Purpose: Customizable CV/document rendering configuration (colors, sections, layout)
- Files: `lib/schema.ts` (templateConfigSchema), `lib/stores/template.store.ts`, `lib/services/pdf.service.ts`
- Pattern: JSONB stored per organization, used in PDF generation pipeline

**Organization Settings:**
- Purpose: Org-level configuration (recruiter skills, matching weights, branding)
- Files: `lib/schema.ts`, `lib/queries/org-settings.ts`, `lib/config/matching-weights.ts`
- Pattern: Fetched on auth, cached in React Query, updatable by admins

## Entry Points

**Web Application:**
- Location: `app/layout.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Wraps entire app with providers (ClerkProvider, QueryProvider, ThemeProvider, TooltipProvider), renders authenticated shell or public pages

**Authenticated Shell:**
- Location: `components/authenticated-shell.tsx`
- Triggers: User authenticated via Clerk
- Responsibilities: Renders sidebar, header, main content area; redirects to `/org-selection` if no org selected; blocks access to public routes

**Middleware:**
- Location: `middleware.ts`
- Triggers: All requests matching configured patterns
- Responsibilities: Protects routes (auth check), redirects to org selection, blocks non-admin from `/admin`, logs auth failures in dev

**Dashboard Home:**
- Location: `app/page.tsx` (40.9K)
- Triggers: Authenticated user navigates to `/`
- Responsibilities: Shows candidate CV upload, extraction status, positioning list, skill coverage charts, mission activity

**Positions/Missions Manager:**
- Location: `app/positions/page.tsx`
- Triggers: User clicks Positions in sidebar
- Responsibilities: Lists missions, redirects to detail view if only one exists

**Admin Panel:**
- Location: `app/admin/page.tsx` (11.1K)
- Triggers: Super admin user navigates to `/admin`
- Responsibilities: LLM model/task management, usage analytics, org overrides

## Error Handling

**Strategy:** Try-catch in API routes, return NextResponse with 500 status; client-side toast notifications via Sonner

**Patterns:**
- API routes wrap try-catch, return `{ error: message }` with HTTP status
- Components use React Query's `error` state to show toast via `useEffect` (or implicit error boundary)
- Workflow streaming catches errors mid-stream, returns error frame in NDJSON
- Middleware logs auth failures to console in development

**Example from `/api/candidates/route.ts`:**
```typescript
if (error instanceof NextResponse) return error;
return NextResponse.json({ error: (error as Error).message }, { status: 500 });
```

## Cross-Cutting Concerns

**Logging:** Console.log in development, Vercel Analytics in production; context-aware logs include `[middleware]`, `[api]` prefixes

**Validation:** Zod schemas enforce runtime validation; API routes check `requireOrgId()` or `requireOrgContext()` before processing

**Authentication:** Clerk handles user identity; middleware protects routes; org membership checked via `session.orgId`; super-admin role checked via `session.sessionClaims.metadata.role`

**Authorization:** Role-based (super_admin for `/admin`); org-based (user belongs to org); checked in middleware and API routes

**Rate Limiting:** Not explicitly implemented; relies on Vercel's platform limits

---

*Architecture analysis: 2026-03-26*
