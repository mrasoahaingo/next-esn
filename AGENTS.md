# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Esneo CV Automation — a tool for French ESN (IT consulting firm) Esneo that automates CV reformatting. Users upload a CV (PDF/DOCX), AI extracts and normalizes the data, users review/edit in a split-screen builder with live PDF preview, then export as a branded Esneo PDF.

The app is entirely in French (UI labels, AI prompts, generated documents).

## Commands using ONLY pnpm

```bash
pnpm install        # install dependencies (uses pnpm, not npm)
pnpm dev            # start dev server
pnpm build          # production build
pnpm lint           # ESLint
```

## Environment Variables

Required in `.env`:
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_GATEWAY_API_KEY` (Vercel AI Gateway key — uses `google/gemini-2.5-flash` for OCR + structured extraction)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

## Architecture

**Stack**: Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase (DB + Storage), Vercel AI SDK + AI Gateway (Gemini 2.5 Flash), @json-render/react-pdf for PDF generation, Zustand for state.

### Flow

1. **Upload** (`/` → `POST /api/upload`): File uploaded to Supabase Storage bucket `cv-original`, candidate row created in `candidates` table with status `uploaded`
2. **Extract** (`/review/[id]` → `POST /api/extract`): Starts `extractCvWorkflow` (Vercel Workflow). File is read from storage: PDF → optional transcription step via `streamText` (file attachment), then parallel `streamText` + `Output.object` branches with Zod sub-schemas; DOCX → mammoth text then same parallel extraction. Progress streamed to the client as NDJSON. Result saved to `candidates.extracted_data`, snapshot logged to `extraction_history`, usage to `ai_usage_log` (see below)
3. **Review** (`/review/[id]`): Split-screen builder — editable form on left, live PDF preview on right. During AI streaming, form fills in progressively (read-only). After streaming, form becomes editable and PDF updates on every change (debounced 600ms)
4. **PDF Preview** (`POST /api/pdf-preview`): Receives partial `ExtractedCV` data, builds a json-render spec via `pdf.template.ts`, renders to PDF buffer via `@json-render/react-pdf`, returns binary PDF
5. **Export** (`POST /api/generate`): Same PDF generation, uploads to Supabase `cv-formatted` bucket

### Key Design Decisions

- **AI model config** is centralized in `lib/ai.ts` — uses Vercel AI Gateway (`createGateway` from `ai`) with `AI_GATEWAY_API_KEY`. Single place to change the model provider/name
- **CV schema** (`lib/schema.ts`) is a single Zod schema (`extractionSchema`) shared across AI extraction, streaming validation, form editing, and PDF generation
- **Streaming extraction** uses the workflow in `workflows/extract-cv.ts` (`streamText` + `Output.object` on the server, NDJSON stream to the client) so partial structured data updates the review UI as branches complete
- **Zustand store** (`lib/stores/cv-builder.store.ts`) is the single source of truth for CV data, shared between the form, streaming hook, and PDF preview
- **PDF preview** (`lib/hooks/usePdfPreview.ts`) debounces 600ms, aborts in-flight requests, manages blob URLs with proper cleanup
- **PDF template** (`lib/services/pdf.template.ts`) builds a json-render `Spec` from `Partial<ExtractedCV>`, handling missing sections gracefully during streaming
- **PDF rendering** (`lib/services/pdf.service.ts`) uses `@json-render/react-pdf`'s `renderToBuffer` server-side
- **Supabase client** (`lib/utils/supabase.ts`) uses service role key (server-side only, singleton pattern)
- **Auth & RBAC** (`lib/utils/auth.ts`) — Clerk-based, 3 levels: `super_admin` (platform founders via `publicMetadata.role`), `org:admin` (org managers, Clerk built-in role), `org:member` (employees, default). Helpers: `requireOrgId()`, `requireSuperAdmin()`, `requireOrgAdmin()`, `getAuthContext()`
- **Global type** (`types/clerk.d.ts`) augments Clerk's `CustomJwtSessionClaims` to include `metadata.role`

### LLM usage tracking (`ai_usage_log`)

Every call to the language model must be accounted for in Supabase table `ai_usage_log`:

- Use `logAiUsage` from `lib/services/ai-usage.service.ts` after the call (or once per workflow after aggregating usages).
- Pass `aiModel` from `usageModelIds` in `lib/ai.ts` (same string as the gateway model id). Keys must exist in `MODEL_PRICING_USD` in `lib/pricing.ts` for admin cost estimates.
- Extend the `AiOperation` union in `ai-usage.service.ts` if you add a new class of operation (today: `extraction`, `analysis`, `generation`).
- For workflows that run several LLM calls in parallel or sequence, merge usages with `aggregateLanguageModelUsage` in `lib/services/extraction-merge.ts`, then call `logAiUsage` once in the corresponding `save*` step.

Do not add new `streamText` / `generateObject` / similar calls without this logging path.

### LLM models and tasks (Supabase + admin)

- Tables: `llm_models` (gateway id + USD/1M), `llm_tasks` (`task_key` + template + `model_id`), `llm_task_org_overrides` (optional per-org overrides). Les prompts système sont en base ; régénérer le seed avec `pnpm dlx tsx scripts/generate-llm-task-seed.ts` (sources dans `scripts/llm-seed-prompt-builders.ts`).
- Runtime: `resolveLlmTask` in `lib/llm/resolve-task.ts` + `createGatewayLanguageModel` in `lib/ai.ts`. Stable keys: `lib/llm/task-keys.ts`.
- Super-admin UI: `/admin` tab « Modèles & tâches LLM » (CRUD + surcharges org). APIs under `/api/admin/llm-*` and `/api/admin/org-llm-overrides`.

### Clerk Dashboard Setup

1. Enable **Organizations** in Clerk Dashboard
2. **Session token**: Customize → add `{ "metadata": "{{user.public_metadata}}" }` so `publicMetadata.role` is available in session claims
3. **Super admin**: Set `publicMetadata: { "role": "super_admin" }` on founder users via Clerk Dashboard (Users → user → Metadata)
4. **Org roles**: Use built-in `org:admin` / `org:member` — no custom roles needed

### Supabase Tables

- `candidates`: id, original_file_url, formatted_file_url, extracted_data (JSONB), status (uploaded → extracting → reviewing → ready → generated)
- `extraction_history`: candidate_id, extraction_result, ai_model
- `ai_usage_log`: token usage and duration per LLM operation (linked to candidate / positioning / mission / org when applicable)

### Storage Buckets

- `cv-original`: uploaded source CVs
- `cv-formatted`: generated Esneo PDF files

### UI Components

Always prefer shadcn/ui components (`components/ui/`) over custom HTML elements. Use Button, Badge, Tooltip, Separator, Card, Input, Label, etc. before writing raw markup. Add new shadcn components via `pnpm dlx shadcn@latest add <component>` when needed.

### Custom Tailwind Theme

Defined in `tailwind.config.ts` — dark-first palette with custom colors: `shell`, `panel`, `neon` (accent green), `violet` (accent purple). Glass-panel and neon-ring utility classes defined in `globals.css`.
