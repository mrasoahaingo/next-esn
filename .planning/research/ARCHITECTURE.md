# Architecture Research: Language Integration

## Data flow

```
DB (candidates.language / missions.language)
  └── read at workflow start (fetchAndAnalyze step / parallelExtractAndStream step)
        ├── injected into resolveLlmTask context as { language: 'fr'|'en' }
        │     └── {{language}} rendered into system prompt by existing template-render.ts
        └── returned from saveResult step → triggers downstream
              ├── PDF chain: generateCvPdf(data, templateConfig, language)
              │     └── buildCvSpec → buildCvTemplateSpec → buildCvDossierLayoutSpec
              │           └── CV_LABELS[language] selects section heading strings
              └── positioning workflows: read missions.language at fetchAndAnalyze entry
                    └── passed to buildAnalysisUserContent(cv, jd, analysis, weights, opts, answers, language)
```

**Language source of truth per artifact:**
- CV extraction → language detected by identity branch → persisted to `candidates.language`
- Job posting analysis → language detected by analyze workflow → persisted to `missions.language`
- Positioning artefacts (analysis, generate) → read `missions.language` (cross-language rule: artifacts follow mission language)
- PDF export → read `candidates.language` from DB at API call time OR passed through from caller

---

## Question-by-question answers

### Q1: extract-cv.ts — identity first, then 3 parallel branches

The current structure runs all 4 branches in a single `Promise.all` inside `parallelExtractAndStream`. The language is not available until the identity branch completes.

**Cleanest restructure without breaking NDJSON:**

Split `parallelExtractAndStream` into two sequential `'use step'` functions — both operating on the same writable stream via `getWritable()`. The `@workflow/next` runtime allows multiple steps to write to the same writable within a single workflow invocation.

```
step 1: extractIdentityBranch(candidateId, cvText, ...) → returns { identity, language, chunkIndex }
  - runs only CV_BRANCH_IDENTITY via consumeBranch
  - persists candidates.language immediately after identity resolves
  - streams identity partial via the writable (same NDJSON channel)
  - returns the detected language

step 2: parallelExtractRemaining(candidateId, cvText, language, chunkIndex, ...) → returns ParallelExtractResult
  - runs Promise.all([experiences, education, skills])
  - injects { language } into each resolveLlmTask context call
  - continues streaming to same writable
```

The `extractCvWorkflow` function becomes:
```
const prep = await prepareCvText(candidateId)
const identity = await extractIdentityBranch(candidateId, prep.cvText, ...)
const ext = await parallelExtractRemaining(candidateId, prep.cvText, identity.language, ...)
await saveResult(candidateId, { ...ext, language: identity.language })
```

**NDJSON impact:** Zero. The writable stays open across steps. The client already handles partial `data` payloads from multiple emit() calls. The stream closes only in `saveResult` (via `writable.close()`), unchanged.

**Step boundary constraint:** Each `'use step'` function gets its own `getWritable()` call — this is fine because `getWritable()` returns the same underlying writable for the current workflow run. Confirm this holds with the `@workflow/next` beta API before splitting.

**Fallback if getWritable() does not persist across steps:** Run identity branch sequentially inside the existing single `'use step'` function before launching the `Promise.all` — no step split required, just sequential then parallel within one step boundary. Language is available for the remaining branches. Slightly less granular error attribution on identity failures, but no NDJSON risk.

### Q2: PDF chain — where to add language to function signatures

Add `language` as an optional param with `'fr'` default at every layer. Thread it inward:

| Function | File | Change |
|---|---|---|
| `generateCvPdf(data, templateConfig, language?)` | `pdf.service.ts` | Add `language?: 'fr'\|'en'` param |
| `buildCvSpec(data, templateConfig, language?)` | `pdf.template.ts` | Pass through to registry |
| `buildCvTemplateSpec(data, templateConfig, language?)` | `templates/registry.ts` | Pass through to layout |
| `buildCvDossierLayoutSpec(data, templateConfig, language?)` | `templates/cv-dossier-layout.ts` | Use `CV_LABELS[language ?? 'fr']` |

`CV_LABELS` is a new `const` in `cv-dossier-layout.ts`:
```typescript
const CV_LABELS = {
  fr: { summary: 'Synthese du profil', skills: 'Competences', edu: 'Formations', exp: 'Experiences professionnelles' },
  en: { summary: 'Profile summary', skills: 'Skills', edu: 'Education', exp: 'Work experience' },
} as const;
```

The 4 hardcoded French strings in `addSectionHeading` calls (lines 316, 371, 391, 459) are the only changes in `cv-dossier-layout.ts`. All other layout logic is language-agnostic.

### Q3: API routes — how language enters workflow invocation

**For upload (`app/api/upload/route.ts`):** Language is unknown at upload time. The workflow detects it. No change to the `start(extractCvWorkflow, [candidate.id])` call. Language flows out of the workflow via `saveResult` persisting `candidates.language`.

**For PDF generation API routes:** Read `candidates.language` from DB at the start of the route handler, then pass it to `generateCvPdf`. Do not accept language from request body — use DB as source of truth to prevent inconsistency. Pattern:
```typescript
const { data: candidate } = await supabase.from('candidates').select('language').eq('id', candidateId).single();
const language = candidate?.language ?? 'fr';
await generateCvPdf(data, templateConfig, language);
```

**For job posting analysis routes:** Language detected by the analyze workflow and persisted to `missions.language`. The API route triggering re-analysis does not pass language in; the workflow reads and writes it.

**For positioning routes:** No change to route invocation. The workflow reads `missions.language` internally.

### Q4: Positioning workflows — where to read mission.language

Read it at the top of `fetchAndAnalyze`, from the already-fetched `positioning.missions` join. The missions select already fetches `title, company, job_analysis` — add `language` to that select:

```typescript
.select('*, candidates(*), missions(job_analysis, title, company, language)')
```

Then early in `fetchAndAnalyze`:
```typescript
const missionLanguage = (missionRow?.language as 'fr' | 'en' | null) ?? 'fr';
```

Pass `missionLanguage` to:
1. Each `resolveLlmTask` call: `context: { language: missionLanguage, ... }`
2. `buildAnalysisUserContent(cv, jd, jobAnalysis, matchingWeights, promptOptions, priorAnswers, missionLanguage)`

Same pattern applies to `positioning-generate.ts` — it follows the same fetch-then-branch structure.

---

## New vs modified components

| Component | Status | What changes |
|---|---|---|
| `supabase/migrations/` | NEW | Add `candidates.language`, `missions.language`, `organization_settings.default_language` columns |
| `lib/schema.ts` (`extractionIdentitySchema`) | MODIFIED | Add `language: z.enum(['fr','en'])` field so identity branch LLM output includes detected language |
| `templates/cv-dossier-layout.ts` | MODIFIED | Extract 4 hardcoded French strings into `CV_LABELS` map; add `language?` param to `buildCvDossierLayoutSpec` |
| `templates/registry.ts` | MODIFIED | Thread `language?` through `buildCvTemplateSpec` |
| `lib/services/pdf.template.ts` | MODIFIED | Thread `language?` through `buildCvSpec` |
| `lib/services/pdf.service.ts` | MODIFIED | Add `language?` param to `generateCvPdf` |
| `workflows/extract-cv.ts` | MODIFIED | Split or sequence identity branch first; persist `candidates.language` in `saveResult`; inject `language` into remaining branch contexts |
| `workflows/analyze-job-posting.ts` | MODIFIED | Detect and persist `missions.language` after analysis |
| `workflows/positioning-analyze.ts` | MODIFIED | Read `missions.language` from join; inject into `resolveLlmTask` context and `buildAnalysisUserContent` |
| `workflows/positioning-generate.ts` | MODIFIED | Same pattern as positioning-analyze |
| `lib/services/positioning.service.ts` | MODIFIED | Add `language?` param to `buildAnalysisUserContent` and user-content builders |
| DB `llm_tasks` prompts | MODIFIED | Add `{{language}}` directive to CV extraction, job posting analysis, and positioning prompt text (no new rows) |
| PDF export API routes | MODIFIED | Read `candidates.language` from DB before calling `generateCvPdf` |

---

## Build order recommendation

**Phase 1 — Foundation (no runtime behavior change)**
- DB migration: `candidates.language`, `missions.language`, `organization_settings.default_language` (nullable, all reads coerce null → 'fr')
- `CV_LABELS` map in `cv-dossier-layout.ts` with `language?` param threaded through full PDF chain — guarded by `?? 'fr'` fallback so all existing PDFs stay identical
- `extractionIdentitySchema` gains `language` field

**Phase 2 — Detection in workflows**
- Split/sequence `extract-cv.ts` identity branch out; persist `candidates.language` in `saveResult`
- Add language detection to `analyze-job-posting.ts`; persist `missions.language`

**Phase 3 — Prompt injection**
- Add `{{language}}` to DB prompts for CV extraction branches and job posting analysis
- Verify `resolveLlmTask` context pass-through for all affected branches

**Phase 4 — Positioning language propagation**
- Update `positioning-analyze.ts` and `positioning-generate.ts` to read and forward `missions.language`
- Update `buildAnalysisUserContent` and related service functions

**Phase 5 — PDF language rendering**
- Wire `candidates.language` → `generateCvPdf` in PDF export API routes
- Test PDF output with EN label set

**Phase 6 — Manual override UI**
- Language selector in CV review and mission edit pages
- API routes accept explicit language override and persist to DB

---

## Key constraints

**`@workflow/next` beta writable scope.** `getWritable()` must return the same writable instance across sequential steps within one workflow run. If it creates a new writable per step, splitting `parallelExtractAndStream` into two `'use step'` functions breaks the NDJSON stream. Verify before committing. The fallback (sequential-then-parallel within one step) avoids this risk entirely.

**`extractionIdentitySchema` must include `language` field.** The identity branch output needs `language: z.enum(['fr','en'])` for the LLM to populate. The Zod schema change is a prerequisite for the workflow restructure to be useful.

**Null coercion is mandatory at every read site.** Both `candidates.language` and `missions.language` start as `null` in DB. Every read must apply `?? 'fr'`. Missing this in one call site produces broken EN prompts silently.

**Cross-language positioning rule must be enforced by convention.** When candidate is FR and mission is EN, all positioning artefacts must be in EN. This is enforced by always reading `missions.language` in positioning workflows, never `candidates.language`. Make this explicit in a comment at the read site to prevent future regressions.

**PDF chain has no DB access.** Language must be passed explicitly — it cannot be looked up inside `buildCvDossierLayoutSpec`. The caller (PDF API route) owns the DB read.

**Prompt `{{language}}` value must be human-readable for the LLM.** The context value should be `'French'` / `'English'` (not `'fr'` / `'en'`) if the prompts use natural language instructions. Decide on the convention before modifying prompts and apply it consistently.
