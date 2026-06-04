# Stack Research: Multilingual Support

**Project:** Next-ESN — v1.2 Multi-langue milestone
**Researched:** 2026-06-04
**Scope:** Technical additions for `language: 'fr' | 'en'` on DB entities, LLM language detection, PDF label swapping, Zod patterns. UI stays French — no i18n framework.

---

## New additions needed

### 1. No new npm dependencies — zero additions required

All four technical concerns are solvable with what is already installed. Confidence: HIGH.

---

## Implementation patterns per concern

### (1) Postgres CHECK constraint for language column

**Pattern:** `VARCHAR(2)` with `CHECK (language IN ('fr', 'en'))` + `DEFAULT 'fr'`.

```sql
-- idempotent migration pattern (matches existing conventions)
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'fr'
  CHECK (language IN ('fr', 'en'));

ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS language VARCHAR(2) NOT NULL DEFAULT 'fr'
  CHECK (language IN ('fr', 'en'));

ALTER TABLE organization_settings
  ADD COLUMN IF NOT EXISTS default_language VARCHAR(2) NOT NULL DEFAULT 'fr'
  CHECK (default_language IN ('fr', 'en'));
```

**Why VARCHAR(2) over ENUM type:** Postgres `CREATE TYPE` is not idempotent without the `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` wrapper (already used in this codebase — see `initial_schema.sql` conventions). VARCHAR + CHECK is simpler, fully idempotent with `ADD COLUMN IF NOT EXISTS`, and easy to extend to `'de'` later by altering the constraint. BCP-47 tags (`'fr-FR'`) are overkill for a two-language ESN product.

**Index:** Not needed — language is a filter helper, never the primary query predicate. Skip unless queries `WHERE language = 'en'` at scale.

**Confidence:** HIGH — standard Postgres pattern, consistent with existing `status` CHECK constraint in `initial_schema.sql` line 10.

---

### (2) Vercel AI SDK: reliable language detection via generateObject

**Pattern:** Add `language` field to the existing `extractionIdentitySchema` in `lib/schema.ts`. The identity branch already uses `generateObject` (Output.object) — language detection is one field on the same call, not a separate call.

```typescript
// lib/schema.ts — extend extractionIdentitySchema
export const extractionIdentitySchema = extractionSchema.pick({
  personalInfo: true,
  summary: true,
}).extend({
  language: z.enum(['fr', 'en'])
    .describe("Detected language of the CV document. 'fr' for French, 'en' for English."),
});
```

The existing `resolveLlmTask` + `renderTemplate` pipeline already injects context variables. Add `{{language}}` to prompt templates by passing `language` in the `context` object:

```typescript
// in workflow orchestrator — after identity extraction resolves
const context = {
  language: detectedLanguage, // 'fr' | 'en'
  // ... other vars
};
await resolveLlmTask(supabase, { taskKey: 'cv_experiences', orgId, context });
```

**Why not a separate LLM call for detection:** Extra latency + cost for something a schema field handles in the same identity branch call. The LLM already reads the full document for `personalInfo` — adding one enum field to the same `generateObject` schema is zero cost.

**Reliability note:** Vercel AI SDK `generateObject` with `z.enum(['fr', 'en'])` is constrained output — the model cannot return an invalid value. This is the correct pattern. `streamText` parsing of language would require manual extraction from prose and is fragile. Use `generateObject` (already used in the identity branch).

**Confidence:** HIGH — `generateObject` with Zod enum is documented Vercel AI SDK pattern. Codebase already uses it in extraction branches.

---

### (3) @react-pdf/renderer font considerations for multilingual PDFs

**Current state:** `lib/services/pdf.registry.tsx` uses Helvetica (built-in PDF font) for all text. Helvetica is a Type 1 PostScript font bundled in every PDF reader — no `Font.register()` call needed for it.

**For FR + EN content:** Helvetica covers the full Latin-1 Extended character set, which includes all French accented characters (é, è, ê, ë, à, â, ô, ù, û, ç, î, ï, œ, æ) and English. **No font change is required.** Both languages are fully within the Helvetica coverage area.

**What would require a font change:** Arabic, Chinese, Japanese, Korean, or any non-Latin script. That is out of scope for v1.2.

**Action required:** None. The existing Helvetica setup handles FR and EN correctly.

**Confidence:** HIGH — Helvetica/WinAnsiEncoding covers ISO 8859-1 (Latin-1) and Latin Extended-A, which covers all French and English characters in use in CV documents.

---

### (4) Zod pattern for language field

**Pattern:** `z.enum(['fr', 'en'])` — not a discriminated union.

Discriminated unions (`.discriminatedUnion()`) are for objects where the shape changes based on a tag field. Here `language` is a simple string enum on a flat schema — use `z.enum`.

```typescript
// Canonical definition — single source of truth
export const languageSchema = z.enum(['fr', 'en']);
export type Language = z.infer<typeof languageSchema>; // 'fr' | 'en'
```

Reuse this in:
- `extractionIdentitySchema` (LLM output detection)
- Any API route body that accepts `language` as input
- DB query types where `language` is returned

For the `CV_LABELS` map:

```typescript
// templates/cv-labels.ts
import type { Language } from '@/lib/schema';

export const CV_LABELS: Record<Language, { skills: string; experiences: string; education: string; summary: string; strengths: string }> = {
  fr: {
    skills: 'Compétences',
    experiences: 'Expériences professionnelles',
    education: 'Formations',
    summary: 'Résumé',
    strengths: 'Points forts',
  },
  en: {
    skills: 'Skills',
    experiences: 'Professional Experience',
    education: 'Education',
    summary: 'Summary',
    strengths: 'Key Strengths',
  },
};
```

TypeScript's `Record<Language, ...>` enforces exhaustive coverage — adding `'de'` to the enum will cause a compile error on the labels map until both are updated. This is the correct pattern.

**Confidence:** HIGH — standard Zod enum + TypeScript Record pattern.

---

## What NOT to add

| Library | Why not |
|---------|---------|
| `next-intl` | UI stays French. No route-based locale switching, no message catalogs, no locale-aware routing needed. Adding it creates complexity with zero payoff. |
| `react-i18next` / `i18next` | Same reason. Heavyweight for two static label maps in the PDF layer. |
| `@formatjs/intl` / `react-intl` | Overkill. The only "translation" needed is a `CV_LABELS` constant map. |
| `franc` / `langdetect` (language detection libs) | LLM already reads the full document. A statistical n-gram detector adds a dependency and is less reliable than the LLM for short mixed-content CVs. Let the AI do it. |
| Separate `llm_tasks` rows per language | Creates prompt duplication and admin maintenance burden. The `{{language}}` directive injection into existing prompts is the correct approach — already supported by `renderTemplate`. |
| Custom font registration for FR/EN | Not needed. Helvetica covers both character sets. Only add custom fonts if non-Latin scripts are required. |

---

## Integration notes

**`renderTemplate` is already compatible.** The function at `lib/llm/template-render.ts` replaces `{{language}}` with no changes — just pass `language` in the `context` object when calling `resolveLlmTask`.

**Language propagation flow:**
1. Identity branch extracts `language: 'fr' | 'en'` as a Zod enum field from the LLM response.
2. Workflow orchestrator persists `language` to `candidates.language` (or `missions.language`).
3. Downstream branches receive `language` via the `context` object passed to `resolveLlmTask`.
4. PDF generation reads `candidate.language` and selects from `CV_LABELS[language]`.

**Cross-language positioning rule (from PROJECT.md):** When CV is FR and mission is EN, positioning artifacts follow the mission language. This means the workflow orchestrator must pass `mission.language` (not `candidate.language`) as `{{language}}` when triggering positioning branches.

**`organization_settings.default_language`:** Used as fallback when auto-detection is unavailable or skipped (e.g., manual creation without file upload). Read it during onboarding, not on every workflow call.

**Migration timestamp:** Use `date +%Y%m%d%H%M%S` at creation time to avoid collisions. Three separate `ALTER TABLE` statements can be in one migration file or split — one file is cleaner given they are all part of the same feature.
