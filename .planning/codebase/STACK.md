# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- TypeScript 5.8.3 - Application code, type-safe development
- JavaScript (ESM) - Configuration files (postcss.config.mjs, eslint.config.mjs)

**Secondary:**
- CSS - Styling via Tailwind CSS

## Runtime

**Environment:**
- Node.js v22.21.1 (verified at analysis)

**Package Manager:**
- npm 10.9.4
- Lockfile: pnpm (package-lock.json present in node_modules/.pnpm structure)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework, SSR/SSG
- React 19.2.4 - UI library
- React DOM 19.2.4 - DOM rendering

**Testing:**
- Vitest 3.2.4 - Unit test runner (ES module compatible)

**Build/Dev:**
- Tailwind CSS 4.2.1 - Utility-first CSS framework
- PostCSS 8.5.8 - CSS preprocessing (via @tailwindcss/postcss 4.2.1)
- TypeScript - Static type checking

## Key Dependencies

**Critical:**
- @clerk/nextjs 7.0.5 - Authentication and user management (Clerk OAuth integration)
- @supabase/supabase-js 2.99.1 - PostgreSQL database client and real-time updates
- ai 6.0.116 - Vercel AI SDK for LLM integration and streaming
- @workflow/next 4.0.1-beta.66 - Workflow orchestration for Next.js
- workflow 4.2.0-beta.70 - Core workflow runtime

**Data Management:**
- @tanstack/react-query 5.90.21 - Server state management and caching
- zustand 5.0.11 - Client state management (lightweight alternative to Redux)
- zod 4.3.6 - Runtime schema validation

**UI/Rendering:**
- @base-ui/react 1.3.0 - Headless UI components
- shadcn 4.0.6 - Pre-built component library (installed, used via imports)
- lucide-react 0.577.0 - Icon library
- sonner 2.0.7 - Toast notification system
- class-variance-authority 0.7.1 - CSS class composition utility

**Rich Text & Document Handling:**
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

**Charts & Analytics:**
- recharts 2.15.4 - Composable charting library
- @uiw/react-json-view 2.0.0-alpha.41 - JSON tree visualization
- @vercel/analytics 2.0.1 - Analytics instrumentation

**Theme Management:**
- next-themes 0.4.6 - Dark/light theme support
- @clerk/localizations 4.2.2 - Clerk UI localization (French: frFR)

**Utilities:**
- clsx 2.1.1 - Conditional CSS class utility
- tailwind-merge 3.5.0 - Tailwind CSS class conflict resolution
- tw-animate-css 1.4.0 - Tailwind CSS animation utilities
- @ai-sdk/react 3.0.118 - React hooks for AI SDK (useChat, useCompletion)

## Configuration

**Environment:**
- Configured via `.env.local` (development) and `.env.production` (production)
- Key variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, AI_GATEWAY_API_KEY, CLERK_* keys, NEXT_PUBLIC_* variables
- No `.env*` files are committed; variables are injected at deploy time

**Build:**
- `next.config.ts` - Integrated with `withWorkflow` wrapper for workflow support
- `tsconfig.json` - Strict mode enabled, path alias @ pointing to project root
- `postcss.config.mjs` - Tailwind CSS v4 PostCSS plugin
- `eslint.config.mjs` - ESLint with Next.js core-web-vitals and TypeScript presets
- `vitest.config.ts` - Test runner configured with @ path alias, test discovery pattern: `**/*.test.ts`

## Platform Requirements

**Development:**
- Node.js 18+ (tested with v22.21.1)
- npm or pnpm package manager
- Git for version control

**Production:**
- Vercel deployment platform (indicated by @vercel/analytics, .vercel/, .vercelignore)
- Environment variables injected at build/deploy time
- No Docker/container config detected (standard Next.js deployment)

---

*Stack analysis: 2026-03-26*
