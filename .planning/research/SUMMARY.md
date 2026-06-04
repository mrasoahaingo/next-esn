# Research Summary: v1.2 Multi-langue

**Project:** Next-ESN
**Researched:** 2026-06-04
**Confidence:** HIGH

---

## Stack additions

**Zero new npm dependencies.** All four concerns (DB column, LLM detection, PDF labels, Zod schema) are solved with existing stack.

- `z.enum(['fr', 'en'])` — canonical `Language` type, single source of truth in `lib/schema.ts`
- `CV_LABELS: Record<Language, {...}>` — TypeScript enforces exhaustive coverage; compile error if a new language is added without updating labels
- `VARCHAR(2) CHECK (language IN ('fr', 'en'))` — simpler and more idempotent than Postgres ENUM; consistent with existing `status` constraint pattern
- Helvetica already covers full Latin Extended — no font registration needed for FR + EN PDFs

---

## Feature table stakes

- Language auto-detection at CV identity branch — persist to `candidates.language`
- Language auto-detection at mission analysis — persist to `missions.language`
- `{{language}}` directive injected into all CV extraction + positioning prompts (replace hardcoded "Langue : français")
- Cross-language positioning rule: artifacts follow `missions.language`, never `candidates.language`
- PDF section labels localised via `CV_LABELS[language]` (4 hardcoded strings in `cv-dossier-layout.ts`)
- Manual language override on CV review form and mission edit form — no re-extraction triggered

---

## Feature differentiators

- Language mismatch banner in positioning UI ("CV is FR, mission is EN — output will be in EN") — low effort, reduces recruiter surprise

---

## Anti-features

- No UI locale change — app stays French; `{{language}}` governs AI-generated content only
- No translation during `cv.transcription` branch — source fidelity must be preserved; language directive applies only to extraction and generation branches
- No translating company names, product names, or credentials — add verbatim anchor rule to every `{{language}}` prompt
- No re-triggering full extraction on language field change — `language` column is directly writable
- No separate `llm_tasks` rows per language — use `{{language}}` injection in existing rows
- No `next-intl`, `react-i18next`, or language detection libraries

---

## Architecture insights

**Build order (phases are additive, each independently deployable):**

1. **DB + schema foundation** — migration with `NOT NULL DEFAULT 'fr'` backfills existing rows; `CV_LABELS` map + `language?` param threaded through full PDF chain with `?? 'fr'` fallback; `extractionIdentitySchema` gains `language` field
2. **Workflow detection** — sequence identity branch before `Promise.all` in `extract-cv.ts`; persist `candidates.language` in `saveResult`; same inline detection in `analyze-job-posting.ts`
3. **Prompt injection** — add `{{language}}` to DB prompts; verify context pass-through in all `resolveLlmTask` calls
4. **Positioning propagation** — read `missions.language` from existing join; forward to `buildAnalysisUserContent` and all positioning branches
5. **PDF wiring** — PDF API routes read `candidates.language` from DB and pass to `generateCvPdf`
6. **Manual override UI** — language selector on CV review and mission edit pages

---

## Watch out for

1. **`context: {}` propagation gap** — `renderTemplate` silently leaves `{{language}}` as a literal string if context is empty. Identity branch must complete before siblings start — cannot detect and use language in the same `Promise.all`. Sequence identity first; add a warning log when rendered prompt still contains `{{`.

2. **`@workflow/next` beta writable scope** — splitting `parallelExtractAndStream` into two `'use step'` functions requires `getWritable()` to return the same writable across steps. Verify before committing to the split; fallback is sequential-then-parallel within one step boundary.

3. **Cross-language positioning regression** — always read `missions.language` in positioning workflows, never `candidates.language`. Add an explicit comment at the read site. Fallback chain: `mission.language ?? org.default_language ?? 'fr'`.

4. **Silent `{{language}}` in org prompt overrides** — if an org has a custom prompt without `{{language}}`, language is silently ignored. Log `console.warn` in `resolveLlmTask` when rendered prompt still contains `{{`. Add validation in admin prompt editor.

5. **`{{language}}` value format in prompts** — decide before touching any prompt: `'fr'`/`'en'` (ISO) vs. `'French'`/`'English'` (natural language). The LLM instruction style determines which reads unambiguously. Pick one and apply consistently across all 8+ affected prompt templates.

---

## Open questions

- **`{{language}}` value format** — ISO codes (`fr`/`en`) or natural language (`French`/`English`) in prompt text? Must be decided before any prompt is modified.
- **`getWritable()` scope across steps** — does `@workflow/next` beta support the same writable across sequential `'use step'` calls? Validate with a minimal test before restructuring `extract-cv.ts`.
- **`{{language}}` in `cv.branch.experiences`** — scope only to output format (dates, structure) or also ask for English-language descriptions when `language=en`? Extraction should preserve source; translation is a generation concern. Define the boundary explicitly in the prompt.

---

*Research completed: 2026-06-04 — Ready for roadmap: yes*
