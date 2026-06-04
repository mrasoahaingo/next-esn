# Features Research: Multilingual LLM Content

**Domain:** Multilingual LLM-driven content generation in a B2B ESN SaaS
**Researched:** 2026-06-04
**Milestone:** v1.2 Multi-langue
**Overall confidence:** HIGH (architecture / detection patterns) / MEDIUM (prompt phrasing)

---

## Table stakes (must-have)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Language auto-detection at CV identity extraction | Without it every downstream artifact defaults to wrong language — user gets French output for an English CV | Low | Detect in `cv.branch.identity`, emit `personalInfo.language`, persist to `candidates.language` |
| Language auto-detection at mission analysis | Mission artifacts (tailored CV, emails) inherit mission language; no detection = no cross-language rule | Low | Detect inline in job posting analysis identity step, persist to `missions.language` |
| `{{language}}` directive in all LLM prompts | Single control point; avoids duplicate prompt versions in `llm_tasks` | Low | Template renderer already supports `{{var}}`; replace hardcoded "Langue : français" in all 4 CV branches + analysis + positioning prompts |
| Cross-language positioning rule applied | FR CV × EN mission → EN artifacts; audience is the client, not the candidate | Low | Inject `mission.language` (not `candidate.language`) into positioning-generate workflow |
| Manual language override | LLM detection has edge cases (bilingual CVs, template boilerplate in wrong language); user must be able to correct without re-running extraction | Low | Editable field on CV review form + mission edit form; triggers no automatic re-extraction |
| PDF section label localisation | English PDF with "Expériences" heading is broken UX; unacceptable in a client-facing document | Low | `CV_LABELS` map `{ fr: {...}, en: {...} }` in `templates/cv-dossier-layout.ts`; already planned in PROJECT.md |

---

## Differentiators (nice-to-have)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Language mismatch warning in positioning UI | "This CV is in French, the mission is in English — output will be generated in English" — reduces recruiter surprise | Low | Single banner in positioning page when `candidate.language !== mission.language`; good signal with minimal effort |
| Detection confidence exposed in review UI | "Detected: English (high confidence)" — recruiter only acts when uncertain | Medium | Requires an additional schema field (e.g. `language_confidence: 'high' | 'low'`); skip for v1.2 unless detection proves unreliable in QA |
| Per-section language detection | Some CVs have a French header with English experience content; detect dominant language per section | High | Overkill — `fr|en` single-value detection is sufficient for the ESN use case; revisit if multi-lingual consultant profiles become common |

---

## Anti-features (explicitly avoid)

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Translating company names and proper nouns | "Société Générale" must stay "Société Générale" in an English artifact; LLM silently translates unless explicitly forbidden | Add verbatim anchor rule to every prompt using `{{language}}`: "Keep company names, product names, and proper nouns verbatim — do not translate them" |
| Translating degree and credential names | "Diplôme d'Ingénieur" is a credential, not prose — translating it misrepresents qualification to the client | List credential fields explicitly as verbatim in the prompt rule above |
| Translating the `cv.transcription` step | Transcription is a faithful copy task; forcing a language here corrupts source fidelity that all downstream branches depend on | No `{{language}}` in `cv.transcription` prompt — language directive applies only to extraction and generation branches |
| Dual-language output in a single artifact | Mixing "Skills / Compétences" looks unpolished and breaks downstream PDF layout | Single language per artifact, resolved at generation time |
| Re-triggering full extraction on language change | Expensive workflow run just to change a metadata field; terrible UX for a correction | `language` column is directly writable; only re-generate downstream artifacts when user explicitly triggers regeneration |
| UI locale change (Clerk, nav labels, app text) | Out of scope for v1.2 per PROJECT.md; large i18n surface area with its own framework requirements | Keep app UI in French; `{{language}}` directive governs AI-generated content only |
| Radar/brief prompts (`lib/radar/brief.ts`) | Explicitly out of scope in PROJECT.md — "prompt hardcodé en code, domaine séparé, hors v1.2" | Leave radar as-is; address in a future dedicated milestone |

---

## Prompt phrasing recommendations

### Language detection — inline at identity branch (not a separate step)

**Architecture verdict:** Detect inline at `cv.branch.identity`, not in a dedicated pre-step.

Ada CX research across 367k examples (55 languages) shows tool-call recall improved from 78.6% to 97.9% with two changes:
1. Detection instruction placed *before* the main extraction output, not after. LLMs skip trailing instructions after generating long responses.
2. Rules based on observable surface features ("majority of content sections in English"), not confidence-based gating ("if you are sure"). Observable rules fire consistently; confidence-gating causes systematic under-detection.

**Recommended addition to `cv.branch.identity` system prompt:**
```
Détecte la langue principale du CV avant d'extraire les données.
Règle : si la majorité des sections de contenu (expériences, résumé, compétences) sont rédigées
en anglais → langue = "en". Sinon → langue = "fr".
Inclus ce champ dans personalInfo.language en premier dans ta réponse JSON.
```

Place this block at the top of the identity prompt, before the personalInfo/summary extraction instructions.

### `{{language}}` directive — replacement for hardcoded "Langue : français"

For **extraction branches** (`cv.branch.identity`, `cv.branch.experiences`, `cv.branch.education`, `cv.branch.skills`):
```
Langue de sortie : {{language}}.
Règle verbatim : conserve tel quel les noms d'entreprises, noms de produits, diplômes et noms propres — ne les traduis jamais.
```

For **generation branches** (positioning, tailored CV, emails) where cross-language translation is the explicit goal:
```
Langue de sortie : {{language}}.
Le document source peut être dans une langue différente. Génère l'intégralité du contenu en {{language}}.
Règle verbatim : conserve exactement les noms d'entreprises, technologies (ex. "React", "Azure", "TypeScript"),
et diplômes — ne les traduis pas même s'il existe un équivalent dans la langue cible.
```

**Why list concrete technology examples:** Gemini Flash and Claude will silently translate technology names ("TypeScript" → "TypeEcrit" has been observed) and credential names unless shown concrete counterexamples. Instruction-only is less reliable than few-shot anchoring for this constraint class. Including 2-3 real examples from the domain substantially reduces silent translation.

**Why "Langue de sortie" over just "Langue":** The former is unambiguous — it scopes the instruction to output only. "Langue : {{language}}" could be read as describing the input language, causing the model to respond in the input document's language instead of the target.

### Cross-language rule — implementation note

In `positioning-generate.ts`, `{{language}}` must resolve to `mission.language`, not `candidate.language`. The `missions` join at line 55 already exists (`missions(job_analysis, title, company)`); add `language` to the select and pass it into the template context at `buildGenerateUserContent` or the `resolveLlmTask` call. No new workflow branches needed.

### Mission language detection

Same inline pattern as CV: detect as part of the job posting analysis identity/extraction step, persist to `missions.language`. A dedicated detect-only workflow branch would add one LLM round-trip and one failure surface with no reliability benefit — inline detection at the same model call is equally accurate and structurally simpler.

---

## Language detection reliability — pattern summary

| Pattern | Reliability | Notes |
|---------|-------------|-------|
| Dedicated detect-only step before extraction | Medium | +1 LLM call, two failure surfaces; no accuracy gain |
| Parallel detect step (alongside extraction) | High | Zero latency overhead but requires async result merging — unnecessary complexity for `fr|en` |
| Inline at last extraction branch (skills) | Medium | Skills branch may not run for sparse CVs; language stays null |
| Inline at identity branch (first branch) | HIGH | Fires earliest, observable-feature rule, persists before downstream branches start |

**Use inline at identity branch.**

---

## Sources

- [LLM Language Detection: Two Prompt Engineering Findings — Ada CX](https://www.ada.cx/labs/research/llm-powered-language-detection/) — HIGH confidence, empirical study, 367k examples, 55 languages
- [Best LLMs for Translation 2025 — Blend](https://www.getblend.com/blog/which-llm-is-best-for-translation/) — MEDIUM confidence
- [Beyond English: Prompt Translation Strategies — arXiv 2025](https://arxiv.org/html/2502.09331v1) — MEDIUM confidence
- Codebase: `supabase/migrations/20260401101600_seed_llm_tasks_data.sql` — HIGH confidence (direct source)
- Codebase: `workflows/positioning-generate.ts` lines 1–60 — HIGH confidence (direct source)
- Codebase: `workflows/extract-cv.ts` lines 100–150 — HIGH confidence (direct source)
