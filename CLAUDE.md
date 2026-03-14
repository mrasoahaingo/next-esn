# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Himeo CV Automation — a tool for French ESN (IT consulting firm) Himeo that automates CV reformatting. Users upload a CV (PDF/DOCX), AI extracts and normalizes the data, users review/edit in a split-screen builder with live PDF preview, then export as a branded Himeo PDF.

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

## Architecture

**Stack**: Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase (DB + Storage), Vercel AI SDK + AI Gateway (Gemini 2.5 Flash), @json-render/react-pdf for PDF generation, Zustand for state.

### Flow

1. **Upload** (`/` → `POST /api/upload`): File uploaded to Supabase Storage bucket `cv-original`, candidate row created in `candidates` table with status `uploaded`
2. **Extract** (`/review/[id]` → `POST /api/extract`): File downloaded from storage. PDF → sent directly as file attachment to Gemini 2.5 Flash (native OCR). DOCX → text extracted via mammoth then sent as text prompt. Streamed via `streamObject` with Zod schema validation. Result saved to `candidates.extracted_data`, history logged to `extraction_history` table
3. **Review** (`/review/[id]`): Split-screen builder — editable form on left, live PDF preview on right. During AI streaming, form fills in progressively (read-only). After streaming, form becomes editable and PDF updates on every change (debounced 600ms)
4. **PDF Preview** (`POST /api/pdf-preview`): Receives partial `ExtractedCV` data, builds a json-render spec via `pdf.template.ts`, renders to PDF buffer via `@json-render/react-pdf`, returns binary PDF
5. **Export** (`POST /api/generate`): Same PDF generation, uploads to Supabase `cv-formatted` bucket

### Key Design Decisions

- **AI model config** is centralized in `lib/ai.ts` — uses Vercel AI Gateway (`createGateway` from `ai`) with `AI_GATEWAY_API_KEY`. Single place to change the model provider/name
- **CV schema** (`lib/schema.ts`) is a single Zod schema (`extractionSchema`) shared across AI extraction, streaming validation, form editing, and PDF generation
- **Streaming extraction** uses Vercel AI SDK's `streamObject` (server) + `experimental_useObject` (client) for real-time partial object streaming
- **Zustand store** (`lib/stores/cv-builder.store.ts`) is the single source of truth for CV data, shared between the form, streaming hook, and PDF preview
- **PDF preview** (`lib/hooks/usePdfPreview.ts`) debounces 600ms, aborts in-flight requests, manages blob URLs with proper cleanup
- **PDF template** (`lib/services/pdf.template.ts`) builds a json-render `Spec` from `Partial<ExtractedCV>`, handling missing sections gracefully during streaming
- **PDF rendering** (`lib/services/pdf.service.ts`) uses `@json-render/react-pdf`'s `renderToBuffer` server-side
- **Supabase client** (`lib/utils/supabase.ts`) uses service role key (server-side only, singleton pattern)

### Supabase Tables

- `candidates`: id, original_file_url, formatted_file_url, extracted_data (JSONB), status (uploaded → extracting → reviewing → ready → generated)
- `extraction_history`: candidate_id, extraction_result, ai_model

### Storage Buckets

- `cv-original`: uploaded source CVs
- `cv-formatted`: generated Himeo PDF files

### UI Components

Always prefer shadcn/ui components (`components/ui/`) over custom HTML elements. Use Button, Badge, Tooltip, Separator, Card, Input, Label, etc. before writing raw markup. Add new shadcn components via `pnpm dlx shadcn@latest add <component>` when needed.

### Custom Tailwind Theme

Defined in `tailwind.config.ts` — dark-first palette with custom colors: `shell`, `panel`, `neon` (accent green), `violet` (accent purple). Glass-panel and neon-ring utility classes defined in `globals.css`.
