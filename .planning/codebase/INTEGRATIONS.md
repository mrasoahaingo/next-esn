# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**AI/LLM:**
- Google Generative AI (Gemini 2.5 Flash) - Model for CV extraction, job posting analysis, positioning analysis
  - SDK/Client: `ai` (Vercel AI SDK) with AI Gateway wrapper
  - Gateway: Custom gateway via `createGateway()` in `lib/ai.ts`
  - Auth: `AI_GATEWAY_API_KEY` env var
  - Usage tracking: Integrated via `logAiUsage()` in `lib/services/ai-usage.service.ts`
  - Model identifier: `google/gemini-2.5-flash`

**Workflow Orchestration:**
- Workflow Runtime - Long-running task orchestration
  - SDK/Client: `workflow` (core runtime), `@workflow/next` (Next.js integration), `@workflow/ai` (AI task support)
  - Triggers: CV extraction, job posting analysis, positioning analysis workflows
  - Storage: Database backed (Supabase PostgreSQL)
  - API endpoints: `/api/workflow/[runId]/stream` (streaming results), `/api/workflow/[runId]/cancel` (cancellation)

## Data Storage

**Databases:**
- Supabase PostgreSQL - Primary database
  - Connection: SUPABASE_URL, SUPABASE_ANON_KEY (client-side), SUPABASE_SERVICE_ROLE_KEY (server-side)
  - Client: `@supabase/supabase-js` 2.99.1
  - Tables referenced:
    - `ai_usage_log` - AI API cost tracking
    - `missions` - Job posting/mission records
    - Job analysis workflow state
    - Positioning workflow state
  - ORM: Direct SQL via Supabase client (no traditional ORM)
  - Real-time: Supabase real-time subscriptions available (SDK supports it, usage TBD)

**File Storage:**
- Local file system (default) - Temporary file handling during uploads
- Supabase Storage bucket support available but not detected in current use

**Caching:**
- React Query (@tanstack/react-query 5.90.21) - Client-side query caching
- Query keys: `missions`, `positionings`, `candidates`, `templates`, `org-settings`, etc.
- Stale time and invalidation patterns defined per query hook in `lib/queries/`

## Authentication & Identity

**Auth Provider:**
- Clerk - Complete auth solution
  - Implementation: Clerk SDK (@clerk/nextjs 7.0.5)
  - Server-side auth: `auth()` from `@clerk/nextjs/server` in `lib/utils/auth.ts`
  - Client hooks: `useUser()`, `useOrganization()` from `@clerk/nextjs`
  - Middleware: `clerkMiddleware()` in `middleware.ts`
  - Multi-tenant: Organization support via `orgId`, `orgRole`
  - Roles: `super_admin` (platform), `org:admin`, `org:member`
  - UI localization: French (frFR) via @clerk/localizations
  - Publishable key: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Secret key: `CLERK_SECRET_KEY`

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar integrated

**Logs:**
- Console logging (standard Node.js console)
- AI usage tracking: Custom logging service to Supabase `ai_usage_log` table
- Workflow execution: Stored in database via Workflow Runtime

**Analytics:**
- Vercel Analytics (@vercel/analytics 2.0.1) - Web Vitals tracking
  - Instrumented in `app/layout.tsx` via `<Analytics />` component
  - Minimal client overhead (1st party data collection)

## CI/CD & Deployment

**Hosting:**
- Vercel - Production deployment platform
  - Indicators: @vercel/analytics, .vercel/ directory, .vercelignore file
  - Serverless functions for API routes
  - Next.js optimized runtime

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar config files found

## Environment Configuration

**Required env vars (Development):**
- `NEXT_PUBLIC_APP_URL` - Application base URL (e.g., http://localhost:3000)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase public/anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase privileged service role key
- `AI_GATEWAY_API_KEY` - API Gateway key for LLM access
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key (exposed to client)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL` - Clerk auth redirect
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL` - Clerk signup redirect
- `CLERK_SECRET_KEY` - Clerk server secret

**Secrets location:**
- `.env.local` (development) - Git ignored
- `.env.production` - Git ignored (template structure only, values injected at deploy)
- Vercel Environment Variables dashboard (production)

**Public vs. Private:**
- Public (prefixed `NEXT_PUBLIC_`): Clerk keys, app URL, sign-in/up URLs
- Private (server-side only): Database keys, API Gateway key, Clerk secret

## Webhooks & Callbacks

**Incoming:**
- Not explicitly detected in current codebase
- Clerk may send webhooks (not configured in this analysis)

**Outgoing:**
- Workflow state stored to Supabase (via workflow runtime)
- AI usage logged to Supabase (via `ai-usage.service.ts`)
- Vercel Analytics data sent to Vercel servers
- No third-party API webhooks detected

## Document Processing

**PDF/Document Integration:**
- `@react-pdf/renderer` - React to PDF rendering
- `@json-render/react-pdf` - JSON schema to PDF
- `mammoth` - DOCX to HTML conversion (Word document parsing)
- `react-markdown` - Markdown rendering
- `marked` - Markdown parsing
- Rich text editor via Tiptap with Markdown serialization

## Data Validation

**Runtime Validation:**
- `zod` 4.3.6 - Schema validation (used in API routes and service functions)
- Form validation patterns in React components

---

*Integration audit: 2026-03-26*
