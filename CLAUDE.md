# CLAUDE.md

See the ./AGENTS.md file

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Next-ESN**

Un SaaS pour les ESN (Entreprises de Services Numériques) qui les aide dans leur quotidien : gestion des CVs de consultants, analyse de missions, et positionnement de consultants sur des missions, le tout assisté par l'IA (extraction automatique, analyse, matching).

**Core Value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille — il sait ce qui se passe, ne peut pas lancer de doublons, et voit les erreurs quand ça échoue.

### Constraints

- **Tech stack**: Next.js 16 + Supabase + Clerk + Vercel AI SDK — pas de changement de stack
- **Workflow runtime**: `@workflow/next` beta — travailler avec ses limitations, pas le remplacer
- **Scope**: Fiabilisation uniquement — pas de nouvelles features fonctionnelles
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.8.3 - Application code, type-safe development
- JavaScript (ESM) - Configuration files (postcss.config.mjs, eslint.config.mjs)
- CSS - Styling via Tailwind CSS
## Runtime
- Node.js v22.21.1 (verified at analysis)
- npm 10.9.4
- Lockfile: pnpm (package-lock.json present in node_modules/.pnpm structure)
## Frameworks
- Next.js 16.1.6 - Full-stack React framework, SSR/SSG
- React 19.2.4 - UI library
- React DOM 19.2.4 - DOM rendering
- Vitest 3.2.4 - Unit test runner (ES module compatible)
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- PostCSS 8.5.8 - CSS preprocessing (via @tailwindcss/postcss 4.2.1)
- TypeScript - Static type checking
## Key Dependencies
- @clerk/nextjs 7.0.5 - Authentication and user management (Clerk OAuth integration)
- @supabase/supabase-js 2.99.1 - PostgreSQL database client and real-time updates
- ai 6.0.116 - Vercel AI SDK for LLM integration and streaming
- @workflow/next 4.0.1-beta.66 - Workflow orchestration for Next.js
- workflow 4.2.0-beta.70 - Core workflow runtime
- @tanstack/react-query 5.90.21 - Server state management and caching
- zustand 5.0.11 - Client state management (lightweight alternative to Redux)
- zod 4.3.6 - Runtime schema validation
- @base-ui/react 1.3.0 - Headless UI components
- shadcn 4.0.6 - Pre-built component library (installed, used via imports)
- lucide-react 0.577.0 - Icon library
- sonner 2.0.7 - Toast notification system
- class-variance-authority 0.7.1 - CSS class composition utility
- @tiptap/react 3.20.5 - Headless rich text editor
- @tiptap/starter-kit 3.20.5 - Default editor extensions
- @tiptap/extension-placeholder 3.20.5 - Placeholder support
- @tiptap/extension-table 3.20.5 - Table editing
- @tiptap/extension-underline 3.20.5 - Underline formatting
- @tiptap/markdown 3.20.5 - Markdown serialization
- @tiptap/pm 3.20.5 - ProseMirror dependencies
- @react-pdf/renderer 4.3.2 - PDF generation from React
- @json-render/react 0.14.0 - JSON to React component rendering
- @json-render/react-pdf 0.14.0 - JSON to PDF rendering
- react-markdown 10.1.0 - Markdown parsing
- remark-gfm 4.0.1 - GitHub Flavored Markdown support
- remark-breaks 4.0.0 - Line break support
- marked 17.0.5 - Alternative markdown parser
- mammoth 1.12.0 - Word document conversion
- recharts 2.15.4 - Composable charting library
- @uiw/react-json-view 2.0.0-alpha.41 - JSON tree visualization
- @vercel/analytics 2.0.1 - Analytics instrumentation
- next-themes 0.4.6 - Dark/light theme support
- @clerk/localizations 4.2.2 - Clerk UI localization (French: frFR)
- clsx 2.1.1 - Conditional CSS class utility
- tailwind-merge 3.5.0 - Tailwind CSS class conflict resolution
- tw-animate-css 1.4.0 - Tailwind CSS animation utilities
- @ai-sdk/react 3.0.118 - React hooks for AI SDK (useChat, useCompletion)
## Configuration
- Configured via `.env.local` (development) and `.env.production` (production)
- Key variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, AI_GATEWAY_API_KEY, CLERK_* keys, NEXT_PUBLIC_* variables
- No `.env*` files are committed; variables are injected at deploy time
- `next.config.ts` - Integrated with `withWorkflow` wrapper for workflow support
- `tsconfig.json` - Strict mode enabled, path alias @ pointing to project root
- `postcss.config.mjs` - Tailwind CSS v4 PostCSS plugin
- `eslint.config.mjs` - ESLint with Next.js core-web-vitals and TypeScript presets
- `vitest.config.ts` - Test runner configured with @ path alias, test discovery pattern: `**/*.test.ts`
## Platform Requirements
- Node.js 18+ (tested with v22.21.1)
- npm or pnpm package manager
- Git for version control
- Vercel deployment platform (indicated by @vercel/analytics, .vercel/, .vercelignore)
- Environment variables injected at build/deploy time
- No Docker/container config detected (standard Next.js deployment)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Database Migrations
- Migration files: `supabase/migrations/` — format `YYYYMMDDHHmmss_description.sql` (14-digit timestamp, ex: `20260402143000_linkedin_context.sql`)
- **Le timestamp doit être unique** — utiliser l'heure courante (HHmmss) pour éviter les collisions quand plusieurs migrations sont créées le même jour
- Générer avec : `date +%Y%m%d%H%M%S` pour obtenir le timestamp
- Toutes les migrations doivent être **idempotentes** : `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS` avant `CREATE POLICY`, `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL END $$`
- Ne jamais modifier une migration déjà appliquée en production — créer une nouvelle migration

## Naming Patterns
- Component files: PascalCase with `.tsx` extension (e.g., `app-header.tsx`, `QueryProvider.tsx`)
- Utility/service files: camelCase with `.ts` extension (e.g., `positioning.service.ts`, `useAutoSave.ts`)
- API routes: kebab-case directory structure matching REST pattern (e.g., `/api/candidates/[id]/route.ts`)
- UI components from shadcn: kebab-case (e.g., `button.tsx`, `alert-dialog.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useAutoSave.ts`, `useOrgRole.ts`)
- Stores: camelCase with `.store.ts` suffix (e.g., `cv-builder.store.ts`, `positioning.store.ts`)
- Handlers: camelCase, descriptive verbs (e.g., `useCandidates`, `buildBreadcrumbs`, `formatTotalExperienceYears`)
- React components: PascalCase (e.g., `AppHeader`, `QueryProvider`, `Button`)
- Utility functions: camelCase (e.g., `cn`, `parsePositioningAnswers`, `normalizeExtractedCvExperienceTime`)
- Service functions: camelCase with descriptive action verbs (e.g., `buildMissionPositionHeadline`, `mergePositioningOutputPartial`)
- Constants: UPPER_SNAKE_CASE (e.g., `ACTIVE_CV_STATUSES`, `POSITIONING_ANALYSIS_FREEFORM_CANDIDATE_KEY`)
- Local variables/properties: camelCase (e.g., `candidateId`, `jobDescription`, `orgId`)
- Boolean flags: camelCase with `is`, `has`, `can` prefixes (e.g., `isCurrent`, `hasConcreteEndDate`, `isDirty`)
- Zustand store state: camelCase (e.g., `cvData`, `pdfBlobUrl`, `isPdfLoading`)
- Interfaces/Types: PascalCase (e.g., `CvBuilderState`, `Crumb`, `PositioningRecruiterAnswerEntry`)
- Schema/Zod objects: camelCase (e.g., `templateConfigSchema`, `createPositioningSchema`, `extractionSchema`)
- Inferred types from schemas: PascalCase with `Type` suffix (e.g., `TemplateConfig`, `Skill`, `ExtractedCV`)
- Generic type parameters: Single uppercase letters (e.g., `T extends Partial<JobPostingAnalysis>`)
## Code Style
- Prettier is configured in ESLint (no separate `.prettierrc`)
- Line length: No hard limit enforced, but consistent with modern defaults (~80-100 characters for readability)
- Indentation: 2 spaces
- Semicolons: Enabled (enforced via ESLint)
- Quote style: Single quotes for strings in TypeScript (enforced by ESLint config)
- ESLint configuration: `eslint.config.mjs` (flat config)
- Base configurations: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Target environment: Next.js with strict TypeScript checking
- Strict mode: Full TypeScript strict mode enabled (`"strict": true` in tsconfig.json)
## Import Organization
- `@/*` → Project root (e.g., `@/lib/utils`, `@/components/ui/button`)
- Used for all imports except in rare cases (internal module relative imports)
- Configured in `tsconfig.json` and `components.json`
## Error Handling
- Try-catch blocks in async functions (especially API routes and mutations)
- Error type-guard: `if (error instanceof NextResponse) return error;` before generic error handling
- Generic error casting: `(error as Error).message` for unknown error types
- JSON responses for API errors: `NextResponse.json({ error: message }, { status: 500 })`
- Schema validation with Zod: `parsed.success` check before using data, returning `fieldErrors` for 400 responses
- Check `error` field from response: `if (error) throw error;`
- Throw to be caught by outer try-catch block
- Include context in error message when possible (operation, resource type)
## Logging
- `console.error()`: API errors, workflow failures, extraction errors
- `console.warn()`: Non-fatal issues, development warnings
- No widespread use of `console.log` in production code (prefer structured logging if needed)
- Errors include operation context: "Upload error", "Extraction error", "Job description extract error"
- Development-only logs guarded by `process.env.NODE_ENV === 'development'`
- Middleware logs include request method and pathname for debugging
## Comments
- Complex business logic that isn't immediately obvious (e.g., barème weighting rules, date calculation edge cases)
- Boundary comments for major sections (e.g., `// ─── Template config ─────────────────────────────────────────────`)
- Reserved key names and their purpose (e.g., `candidat:` and `client:` prefixes in positioning answers)
- Compatibility notes for legacy data structures
- Used selectively for exported functions and types, especially in service layers
- Example from codebase:
- Parameters documented with inline `/** description */` syntax in type definitions
- Zod schema descriptions (via `.describe()`) serve as inline documentation for extracted data structure
- Acceptable in codebase when describing business logic (e.g., "Compat", "n'est pas fourni dans ce message")
- Helps align with domain language (French client context)
## Function Design
- Typical range: 5-30 lines for utility functions, 20-50 lines for components
- Service functions may extend 50-100+ lines (e.g., `buildAnalysisUserContent`)
- Long functions are decomposed into smaller helper functions
- Single object parameter for functions with 2+ parameters (enables optional fields and type safety)
- Example: `buildMissionPositionHeadline(mission: { title?: string | null; company?: string | null })`
- Positional parameters acceptable for 1-2 simple arguments
- Explicit return types on all exported functions
- Void for side-effect functions (mutations, void handlers)
- Nullability explicit: `string | undefined` not `string | null` (preferred unless data source enforces null)
- Async functions return `Promise<T>`
## Module Design
- Barrel exports in `lib/queries/index.ts` consolidate related hooks and types
- Named exports for specific functionality (rarely `export default`)
- Type exports via `export type { TypeName }`
- Used in `lib/queries/` for aggregating query hooks
- Used in `components/ui/` for shadcn components (each component is separate file, imported via path alias)
- Not used for `lib/services/` or `lib/utils/` (direct imports preferred for code clarity)
## Configuration & Constants
- Zod schemas define and validate all major data structures
- Defaults via `as const` or inline defaults (e.g., `DEFAULT_TEMPLATE_CONFIG`)
- Config objects exported separately (e.g., `DEFAULT_MATCHING_WEIGHTS`)
- Global constants in dedicated files: `lib/config/matching-weights.ts`, `lib/llm/constants.ts`
- Feature-specific constants co-located with feature (e.g., `ACTIVE_CV_STATUSES` in candidates query)
- Magic numbers avoided; extracted to named constants
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Modular layering: Pages → Components → Hooks → Services → Utilities
- Server-client boundary managed via `'use client'` directives
- Workflow-based async processing (extracted CV, positioning analysis, job posting analysis)
- Streaming responses for long-running AI operations
- Type-safe data flow with Zod schema validation
- State management via Zustand (client-side) and React Query (server sync)
- Middleware-based authentication and org routing
## Layers
- Purpose: Define routes and render layouts, manage page-level state
- Location: `app/*/page.tsx`, `app/layout.tsx`
- Contains: Page components, route-specific logic, dynamic segments (`[id]`)
- Depends on: Hooks, components, queries, stores
- Used by: Next.js app router
- Purpose: Reusable UI building blocks and feature-specific sections
- Location: `components/` (root components, feature containers), `components/ui/` (shadcn primitives)
- Contains: React Client components, containers, layouts
- Depends on: Hooks, stores, utilities, UI library (shadcn via Base UI)
- Used by: Pages, other components
- Purpose: Custom React hooks for state, side effects, and data fetching
- Location: `lib/hooks/` (custom hooks), `lib/queries/` (React Query mutations/queries)
- Contains: Auth hooks (`useOrgRole`, `useSuperAdmin`), stream hooks (`useWorkflowStream`), business logic hooks
- Depends on: Queries, stores, services, authentication
- Used by: Components, pages
- Purpose: React Query setup and TanStack Query hooks for server-client sync
- Location: `lib/queries/*.ts` (index exports all hooks)
- Contains: `useQuery` wrappers, mutation hooks, cache invalidation
- Key files: `candidates.ts`, `missions.ts`, `positionings.ts`, `templates.ts`, `admin.ts`
- Depends on: API routes, authentication
- Used by: Components, pages, hooks
- Purpose: Next.js API handlers that serve client requests and coordinate backend work
- Location: `app/api/*/route.ts`
- Contains: Route handlers (GET, POST, PATCH, DELETE), request validation, error handling
- Depends on: Services, utilities, database access (Supabase)
- Used by: React Query, direct fetch calls
- Purpose: Business logic encapsulation (CV extraction, positioning analysis, job posting analysis)
- Location: `lib/services/*.ts`
- Contains: Analysis triggers, merge logic, PDF generation, AI service orchestration
- Key files: `positioning.service.ts`, `job-posting-analysis.service.ts`, `pdf.service.ts`
- Depends on: Schemas, utilities, LLM config, database
- Used by: API routes, workflow pipelines
- Purpose: Zod schemas for validation and TypeScript type definitions
- Location: `lib/schema.ts`, `lib/types/*.ts`, `lib/validation/`
- Contains: Data shape definitions (CV extraction, analysis output, config), Zod parsers
- Depends on: Nothing (foundational)
- Used by: All layers
- Purpose: Pure functions, helpers, and cross-cutting concerns
- Location: `lib/utils/*.ts`
- Contains: Auth utilities, Supabase client setup, formatting, skill labeling, PDF embedding
- Depends on: Supabase, Clerk, schema layer
- Used by: All layers
- Purpose: Zustand stores for client-only state (not synced with server)
- Location: `lib/stores/*.ts`
- Contains: CV builder state, positioning state, template state, demo mode flag
- Depends on: Schema layer, types
- Used by: Client components, hooks
- Purpose: LLM task resolution, workflow streaming, template rendering
- Location: `lib/llm/*.ts`, `workflows/` (external package boundary)
- Contains: Task key resolution, prompt rendering, workflow stream handling
- Depends on: Schema, configuration, services
- Used by: API routes, hooks
## Data Flow
- **Server State:** React Query + Supabase (source of truth for candidates, missions, positionings, org settings)
- **Local State:** Zustand stores for CV editing, positioning drafts, template building
- **UI State:** React component state for forms, modals, loading, selections
## Key Abstractions
- Purpose: Represents a job applicant with CV data
- Files: `lib/schema.ts` (extraction schema), `lib/queries/candidates.ts`, `app/api/candidates/route.ts`
- Pattern: Extracted CV stored as `extracted_data` JSON, undergoes review cycle before finalization
- Purpose: A specific job opening/role that candidates are matched against
- Files: `lib/schema.ts` (mission schema), `lib/services/job-posting-analysis.service.ts`
- Pattern: Contains job description, key points, expected expertise level; triggers analysis of candidates
- Purpose: CV-to-job matching analysis with detailed match scores and skill mappings
- Files: `lib/services/positioning.service.ts`, `lib/schema.ts`, `lib/queries/positionings.ts`
- Pattern: Created per candidate-mission pair, analysis cached, regeneratable on demand
- Purpose: Customizable CV/document rendering configuration (colors, sections, layout)
- Files: `lib/schema.ts` (templateConfigSchema), `lib/stores/template.store.ts`, `lib/services/pdf.service.ts`
- Pattern: JSONB stored per organization, used in PDF generation pipeline
- Purpose: Org-level configuration (recruiter skills, matching weights, branding)
- Files: `lib/schema.ts`, `lib/queries/org-settings.ts`, `lib/config/matching-weights.ts`
- Pattern: Fetched on auth, cached in React Query, updatable by admins
## Entry Points
- Location: `app/layout.tsx`
- Triggers: Browser navigation to `/`
- Responsibilities: Wraps entire app with providers (ClerkProvider, QueryProvider, ThemeProvider, TooltipProvider), renders authenticated shell or public pages
- Location: `components/authenticated-shell.tsx`
- Triggers: User authenticated via Clerk
- Responsibilities: Renders sidebar, header, main content area; redirects to `/org-selection` if no org selected; blocks access to public routes
- Location: `middleware.ts`
- Triggers: All requests matching configured patterns
- Responsibilities: Protects routes (auth check), redirects to org selection, blocks non-admin from `/admin`, logs auth failures in dev
- Location: `app/page.tsx` (40.9K)
- Triggers: Authenticated user navigates to `/`
- Responsibilities: Shows candidate CV upload, extraction status, positioning list, skill coverage charts, mission activity
- Location: `app/positions/page.tsx`
- Triggers: User clicks Positions in sidebar
- Responsibilities: Lists missions, redirects to detail view if only one exists
- Location: `app/admin/page.tsx` (11.1K)
- Triggers: Super admin user navigates to `/admin`
- Responsibilities: LLM model/task management, usage analytics, org overrides
## Error Handling
- API routes wrap try-catch, return `{ error: message }` with HTTP status
- Components use React Query's `error` state to show toast via `useEffect` (or implicit error boundary)
- Workflow streaming catches errors mid-stream, returns error frame in NDJSON
- Middleware logs auth failures to console in development
```typescript
```
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
