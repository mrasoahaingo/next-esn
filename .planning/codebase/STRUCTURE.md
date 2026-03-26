# Codebase Structure

**Analysis Date:** 2026-03-26

## Directory Layout

```
next-esn/
├── app/                           # Next.js App Router pages and layouts
│   ├── api/                       # API routes
│   ├── admin/                     # Super admin dashboard
│   ├── positions/                 # Mission/job position management
│   ├── review/                    # CV review interface
│   ├── settings/                  # User and org settings
│   ├── sign-in/                   # Auth sign-in page
│   ├── sign-up/                   # Auth sign-up page
│   ├── templates/                 # CV template builder
│   ├── org-selection/             # Org picker on first login
│   ├── .well-known/               # ACME challenge, static files
│   ├── layout.tsx                 # Root layout (providers, ClerkProvider, etc.)
│   ├── page.tsx                   # Home/dashboard
│   ├── error.tsx                  # Error boundary
│   ├── loading.tsx                # Loading skeleton
│   ├── not-found.tsx              # 404 page
│   ├── globals.css                # Tailwind + global styles
│   └── favicon.ico
├── components/                    # React components
│   ├── ui/                        # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── admin/                     # Admin-specific components
│   ├── dashboard/                 # Dashboard widgets (charts, statistics)
│   ├── authenticated-shell.tsx    # Main layout shell (sidebar, header)
│   ├── app-header.tsx             # Top navigation bar
│   ├── unified-sidebar.tsx        # Left navigation sidebar (48.8K)
│   ├── query-provider.tsx         # React Query provider
│   ├── theme-provider.tsx         # next-themes provider
│   ├── org-branding-provider.tsx  # Org logo/branding context
│   ├── markdown-editor.tsx        # Markdown input component
│   ├── mission-job-analysis.tsx   # Positioning analysis UI (24.6K)
│   ├── onboarding-modal.tsx       # First-time user onboarding (20.1K)
│   └── [other feature components] # Feature-specific UI
├── lib/                           # Core utilities and business logic
│   ├── api/                       # Not present; API logic in app/api
│   ├── config/                    # Configuration (matching weights)
│   ├── hooks/                     # Custom React hooks (7 files)
│   │   ├── use-onboarding.ts      # Onboarding state
│   │   ├── useAutoSave.ts         # Auto-save functionality
│   │   ├── usePdfPreview.ts       # PDF preview generation
│   │   ├── useWorkflowStream.ts   # Streaming workflow handling (8.2K)
│   │   ├── useOrgRole.ts          # Org membership check
│   │   └── [other hooks]
│   ├── llm/                       # LLM utilities
│   │   ├── resolve-task.ts        # Task key resolution
│   │   ├── template-render.ts     # Prompt template rendering
│   │   ├── task-keys.ts           # Task key registry
│   │   └── constants.ts
│   ├── queries/                   # React Query hooks (TanStack React Query)
│   │   ├── index.ts               # Barrel export of all query hooks
│   │   ├── candidates.ts          # CV candidates queries/mutations
│   │   ├── missions.ts            # Job missions queries/mutations
│   │   ├── positionings.ts        # CV-to-job matching queries
│   │   ├── templates.ts           # Template CRUD queries
│   │   ├── team.ts                # Org members and invitations
│   │   ├── org-settings.ts        # Organization config queries
│   │   ├── admin.ts               # Admin stats and config
│   │   ├── admin-llm.ts           # LLM models/tasks admin queries
│   │   ├── workflow.ts            # Workflow cancellation
│   │   ├── recruiter-skills.ts    # Skill aggregation queries
│   │   ├── dashboard.ts           # Dashboard metrics queries
│   │   └── keys.ts                # React Query key factory
│   ├── services/                  # Business logic services (no HTTP)
│   │   ├── positioning.service.ts # CV-job matching logic (22.6K)
│   │   ├── job-posting-analysis.service.ts # Job posting parse/analysis
│   │   ├── job-posting-text-extract.service.ts # Job text extraction
│   │   ├── positioning-analyze-trigger.ts # Analyze workflow trigger
│   │   ├── positioning-generate-merge.ts # Merge generated positioning data
│   │   ├── positioning-analysis-merge.ts # Merge analysis updates
│   │   ├── extraction-merge.ts    # Merge extraction results
│   │   ├── pdf.service.ts         # PDF generation orchestration
│   │   ├── pdf.registry.tsx       # PDF template component registry (10.3K)
│   │   ├── pdf.template.ts        # PDF template setup
│   │   ├── ai-usage.service.ts    # AI usage tracking
│   │   └── job-posting-analyze-trigger.ts # Job analysis trigger
│   ├── stores/                    # Zustand client stores (4 files)
│   │   ├── cv-builder.store.ts    # CV editing state
│   │   ├── positioning.store.ts   # Positioning draft state
│   │   ├── template.store.ts      # Template building state
│   │   └── demo-mode.store.ts     # Demo mode flag
│   ├── types/                     # TypeScript type definitions (6 files)
│   │   ├── admin-llm-usage.ts     # Admin LLM usage row type
│   │   ├── cv-extraction-stream.ts # Streaming extraction type
│   │   ├── job-posting-analysis-stream.ts # Streaming job analysis type
│   │   ├── positioning-analysis-stream.ts # Streaming positioning type
│   │   ├── positioning-generate-stream.ts # Streaming generation type
│   │   └── organization-settings.ts # Org settings type
│   ├── utils/                     # Pure utility functions (14 files)
│   │   ├── supabase.ts            # Supabase client initialization
│   │   ├── auth.ts                # Auth helpers (requireOrgId, getOrgContext)
│   │   ├── skill-key.ts           # Skill label formatting
│   │   ├── format.ts              # Date/number formatting
│   │   ├── cv-experience-time.ts  # CV experience calculations (test present)
│   │   ├── experience-recency.ts  # Recency weighting for matching
│   │   ├── org-settings.ts        # Org settings helpers
│   │   ├── template.ts            # Template utilities
│   │   ├── job-description-hash.ts # Job description hashing
│   │   ├── pdf-embed.ts           # PDF embedding helpers
│   │   ├── match-score-confidence.ts # Score confidence calculation
│   │   ├── llm-log-payload.ts     # LLM logging payload
│   │   └── cv-date-years.ts       # CV date parsing
│   ├── validation/                # Zod validation schemas (if separate)
│   ├── schema.ts                  # Core Zod schemas (19.7K)
│   ├── ai.ts                      # AI integration setup
│   ├── pricing.ts                 # Pricing configuration
│   └── utils.ts                   # General-purpose utilities
├── hooks/                         # Root-level custom hook (1 file)
│   └── use-mobile.ts              # Mobile breakpoint detection
├── public/                        # Static assets
│   ├── esneo-icon.svg             # Site favicon
│   └── [other assets]
├── types/                         # Global TypeScript types (if any)
├── supabase/                      # Supabase config (migrations, SQL)
├── templates/                     # Template files (default templates)
├── workflows/                     # Workflow definitions (external package boundary)
├── docs/                          # Documentation
├── .planning/                     # GSD planning documents
│   └── codebase/                  # Architecture/structure analysis
├── .env.local                     # Dev environment variables (not committed)
├── .env.production                # Prod environment variables
├── middleware.ts                  # Next.js middleware (auth, routing)
├── next.config.ts                 # Next.js configuration with Workflow plugin
├── tsconfig.json                  # TypeScript configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── components.json                # shadcn/ui configuration
├── eslint.config.mjs              # ESLint configuration
├── postcss.config.mjs             # PostCSS configuration
├── package.json                   # Dependencies and scripts
├── pnpm-lock.yaml                 # Dependency lock file
├── vitest.config.ts               # Vitest configuration
└── AGENTS.md                      # GSD agents documentation
```

## Directory Purposes

**`app/`**
- Purpose: Next.js App Router pages and layouts; handles all routes and navigation
- Contains: Page components (`page.tsx`), layouts, error boundaries, API routes
- Key files: `layout.tsx` (root), `page.tsx` (dashboard), route folders for `/positions`, `/review`, `/settings`, `/admin`

**`app/api/`**
- Purpose: RESTful API endpoints for client requests
- Contains: Route handlers organized by resource (candidates, missions, positionings, extractions, etc.)
- Key endpoints: `/api/candidates`, `/api/extract`, `/api/generate`, `/api/missions/[id]/analyze-job`, `/api/positionings`

**`components/`**
- Purpose: Reusable React components split by concern
- Contains: UI primitives (shadcn), feature containers, layouts
- Key subdivisions:
  - `ui/` — shadcn/ui button, card, dialog, sidebar, etc.
  - `dashboard/` — charts, statistics, skill coverage visualizations
  - `admin/` — LLM management, usage analytics components

**`lib/`**
- Purpose: Core business logic, utilities, and data layer
- Contains: Services, queries, schemas, utilities, stores, hooks
- Rationale: Centralizes non-UI logic away from components for reusability and testability

**`lib/services/`**
- Purpose: Business logic encapsulation (not HTTP; no direct API calls)
- Example: `positioning.service.ts` builds matching analysis; called by API routes and workflows
- Pattern: Pure functions that accept data, return computed results

**`lib/queries/`**
- Purpose: React Query hooks for server sync
- Pattern: Each file exports query/mutation hooks for a domain (candidates, missions, etc.)
- Barrel export in `index.ts` for clean imports: `import { useCandidates } from '@/lib/queries'`

**`lib/stores/`**
- Purpose: Zustand client-only state (transient, not synced with server)
- Example: CV builder editing state before save; positioning draft form state
- Pattern: Each store file defines a Zustand store with typed state and actions

**`lib/hooks/`**
- Purpose: Custom React hooks for cross-cutting concerns
- Example: `useWorkflowStream` handles NDJSON stream parsing; `useOrgRole` checks membership
- Pattern: Hooks encapsulate component logic, return state/functions

**`lib/utils/`**
- Purpose: Pure utility functions
- Examples: `supabase.ts` (client setup), `auth.ts` (requireOrgId check), `skill-key.ts` (formatting)
- Pattern: No side effects; functions accept input, return output

**`middleware.ts`**
- Purpose: Next.js middleware for cross-request concerns
- Contains: Auth protection, org routing, role-based access (super_admin check)
- Pattern: Runs before each request; can redirect or return early

**`public/`**
- Purpose: Static assets served as-is
- Contains: favicon, logos, default images
- Not committed: Build artifacts, node_modules, .next

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout (providers, theme, auth wrapping)
- `app/page.tsx`: Dashboard home (CV upload, stats, positioning list)
- `middleware.ts`: Auth middleware (protection, org routing)

**Configuration:**
- `next.config.ts`: Next.js config with Workflow plugin
- `tailwind.config.ts`: Tailwind CSS theme and plugins
- `tsconfig.json`: TypeScript compiler options
- `components.json`: shadcn/ui aliases and style
- `.env.local`: Dev secrets (Supabase URL, API keys, etc.)
- `lib/config/matching-weights.ts`: Weighting config for CV matching

**Core Logic:**
- `lib/schema.ts`: Zod schemas for all data structures (CV, job, analysis, templates)
- `lib/services/positioning.service.ts`: Matching analysis business logic
- `lib/services/pdf.service.ts`: PDF generation orchestration
- `lib/utils/supabase.ts`: Supabase client init
- `lib/utils/auth.ts`: Auth helper functions (requireOrgId, getOrgContext)

**Testing:**
- `lib/utils/cv-experience-time.test.ts`: Example test file
- `vitest.config.ts`: Vitest test runner config
- No dedicated test directory; tests co-located with source files using `.test.ts` suffix

**Styling:**
- `app/globals.css`: Global Tailwind directives and custom CSS classes
- `lib/markdown-display-classes.ts`: CSS classes for rendered Markdown

## Naming Conventions

**Files:**
- Page routes: `page.tsx` (always)
- API handlers: `route.ts` (always)
- Components: PascalCase (e.g., `AppHeader.tsx`, `UnifiedSidebar.tsx`)
- Utilities: camelCase (e.g., `supabase.ts`, `skill-key.ts`)
- Hooks: camelCase or usePrefix (e.g., `useWorkflowStream.ts`, `usePdfPreview.ts`)
- Types: PascalCase in `.ts` files or `.types.ts` suffix (e.g., `admin-llm-usage.ts`)
- Tests: `*.test.ts` or `*.spec.ts` suffix

**Directories:**
- Feature routes: lowercase with hyphens (e.g., `/org-selection`, `/sign-in`)
- Dynamic segments: brackets (e.g., `/app/positions/[id]`, `/app/review/[id]`)
- Barrel exports: Directories with `index.ts` exporting all members
- Private: Prefixed with underscore if needed (not used in current structure)

## Where to Add New Code

**New Feature:**
- Primary code: `app/[feature]/page.tsx` or `app/[feature]/[id]/page.tsx`
- API: `app/api/[feature]/route.ts`
- Components: `components/[feature-name].tsx` or `components/[feature]/index.tsx`
- Queries: `lib/queries/[feature].ts` (export from `lib/queries/index.ts`)
- Services: `lib/services/[feature].service.ts` if business logic needed
- Tests: Co-locate with source as `[feature].test.ts`

**New Component/Module:**
- Reusable component: `components/[ComponentName].tsx`
- Feature-specific: `components/[feature]/[ComponentName].tsx`
- Primitive (UI): `components/ui/[component].tsx` (shadcn/ui pattern)
- Export from index: Create `components/[feature]/index.ts` if multiple files

**Utilities:**
- Shared helpers: `lib/utils/[concern].ts`
- Auth: `lib/utils/auth.ts`
- Formatting: `lib/utils/format.ts`
- Entity-specific: `lib/utils/[entity-name].ts`

**Hooks:**
- Custom hooks: `lib/hooks/use[HookName].ts`
- Root-level: `hooks/use[HookName].ts` (only for global hooks)
- Component-specific: Define inline in component if not reused

**Stores:**
- Zustand store: `lib/stores/[entity].store.ts`
- Pattern: One store per entity or feature

**Types:**
- Data types: Add to `lib/schema.ts` with Zod schema + type inference
- Response types: `lib/types/[response-name].ts`
- Utility types: Define in utility file or `lib/types/index.ts`

## Special Directories

**`workflows/`**
- Purpose: Externally imported workflow definitions (Workflow.ai SDK)
- Generated: No; authored but imported as external package
- Committed: Yes
- Notes: Compiled with `workflow` package; appears at package boundary

**`.planning/codebase/`**
- Purpose: GSD mapping documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes; created by `/gsd:map-codebase` agent
- Committed: Yes
- Notes: Reference for `/gsd:plan-phase` and `/gsd:execute-phase` commands

**`supabase/`**
- Purpose: Supabase migrations, schema, seed data
- Generated: Partially (migrations auto-generated by Supabase CLI)
- Committed: Yes
- Notes: Source of truth for database schema

**`.env.local`, `.env.production`**
- Purpose: Environment-specific configuration (secrets, API URLs)
- Generated: No; authored locally
- Committed: No (listed in `.gitignore`)
- Notes: Must manually set before deployment

**.next/, .swc/**
- Purpose: Next.js build cache
- Generated: Yes; auto-created during `npm run build` or `npm run dev`
- Committed: No (listed in `.gitignore`)

---

*Structure analysis: 2026-03-26*
