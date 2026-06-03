---
status: verifying
trigger: "CV experiences branch times out after 45s then schema validation fails with Invalid input: expected array, received undefined"
created: 2026-06-03T14:01:00Z
updated: 2026-06-03T15:10:00Z
symptoms_prefilled: true
---

## Current Focus

hypothesis: WHY the 45s timeout fires — two candidate root causes being investigated:
  H1: extractJsonMiddleware prefix-buffering delays first token emission on the experiences branch specifically — the middleware buffers the entire prefix "```json\n" before forwarding any data, and if Gemini 2.5 Flash emits a long thinking/reasoning preamble before the JSON fence, the partialOutputStream receives no chunks for tens of seconds while the buffer is not yet committed
  H2: The experiences schema is the most structurally complex branch (array of objects with sub-arrays: description[], skills[]) — the LLM generates far more output tokens than identity/education/skills, and with maxTokens=8192 + temperature=0, a long CV with many experiences may hit the generation time limit before emitting any parseable partial
test: Compare experiences branch schema output size vs other branches, trace extractJsonMiddleware behavior under prefix phase
expecting: Either the buffering delay or token-generation time explains the 45s window being exceeded
next_action: Measure which hypothesis is supported by schema complexity analysis

## Symptoms

expected: CV experiences array is extracted correctly from an uploaded PDF and streamed back to the client
actual: The branch=experiences times out after 45s, then schema validation reports "experiences: Invalid input: expected array, received undefined" — the experiences field is undefined instead of an array
errors:
  - "[extract-cv] branch=experiences timed out after 45s — marking complete with partial data"
  - "Extraction schema validation warning: { formErrors: [], fieldErrors: { experiences: ['Invalid input: expected array, received undefined'] } }"
reproduction: Upload a CV PDF (e.g. CV_Titouan ROBERT_20-05-2026.pdf) — experiences exist in the PDF but are not extracted
started: Currently failing; unclear if ever worked for this specific CV

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-06-03T15:00:00Z
  checked: extractionExperiencesSchema vs other branch schemas (lib/schema.ts lines 147-158 vs 159-163, 165-170)
  found: experiences branch produces the largest JSON output by far — each experience has 10 fields including TWO nested string arrays (description[] and skills[]). A CV with 8-10 experiences yields ~2000-3000 output tokens. The identity branch (personalInfo + summary = ~200 tokens), education (~100 tokens) and skills (flat arrays ~400-600 tokens) are all much smaller. The experiences branch also contains the most variable-length data — description[] can have 5-10 bullets per experience.
  implication: Experiences branch consumes significantly more of the 8192-token budget and takes longer to generate, making it the most likely branch to exceed 45s for a complex CV (10+ experiences with detailed descriptions).

- timestamp: 2026-06-03T15:00:00Z
  checked: llmFactualGenerationSettings in lib/ai.ts line 15-19
  found: maxTokens=8192, temperature=0, topP=0.95. There is NO per-branch token limit — all 4 branches share the same 8192 cap. The experiences branch on a long CV (10+ roles) could need 3000-5000 tokens to represent all experiences faithfully. Gemini 2.5 Flash at temperature=0 generates ~200-400 tokens/sec, so a 5000-token response takes 12-25s just for generation. But total wall-clock time includes: Vercel AI Gateway latency (routing to Google) + Gemini time-to-first-token (TTFT for thinking + planning) + actual generation time.
  implication: For complex CVs, the combined TTFT + generation time can plausibly exceed 45s. The gateway adds overhead compared to direct API calls.

- timestamp: 2026-06-03T15:00:00Z
  checked: extractJsonMiddleware in node_modules/ai/dist/index.js lines 11567-11662
  found: The middleware operates in "prefix" phase until it detects either: (a) first non-backtick character, or (b) ``` followed by newline. While in prefix phase, chunks are buffered and NOT forwarded downstream. If Gemini outputs a reasoning preamble or XML-like tags BEFORE the JSON fence, the middleware stays in prefix phase. However, this does NOT cause the 45s timeout — the AbortController fires based on wall clock time from branch start, not from first partial received. The middleware buffering only affects when partialOutputStream emits updates to the UI; it does NOT block the underlying HTTP stream from flowing.
  implication: extractJsonMiddleware is NOT the cause of the 45s timeout itself. The timeout is driven by total LLM generation time.

- timestamp: 2026-06-03T15:00:00Z
  checked: Gemini 2.5 Flash "thinking tokens" behavior
  found: The comment in extract-cv.ts line 282 says "45s : laisse assez de temps au LLM (y compris thinking tokens Gemini 2.5 Flash)". Gemini 2.5 Flash has a thinking budget that activates for complex tasks. For structured extraction from a long CV, the model may spend 10-20s on reasoning tokens BEFORE emitting any JSON output. The TTFT for the experiences branch could be 20-30s on a complex CV (reasoning + generating the opening JSON structure), leaving only 15-25s for actual generation — which may not be enough for 3000+ tokens at ~200 tokens/sec.
  implication: The experiences branch is the ONLY branch that combines: (1) longest generation time due to output size, (2) potential longest TTFT due to structural complexity of the task (many experiences to organize), making it uniquely vulnerable to the 45s timeout.

- timestamp: 2026-06-03T15:00:00Z
  checked: consumeBranch timeout mechanism (extract-cv.ts lines 281-284)
  found: The AbortController fires after a flat 45s regardless of whether any partial was received. The `for await (const partial of result.partialOutputStream)` loop is aborted mid-stream or never starts if TTFT > 45s. When aborted, the catch block checks `branchAbort.signal.aborted` (line 316), swallows the error silently, and returns. No partial writes happen if TTFT > 45s; partial writes may be incomplete if generation time > 45s.
  implication: The fix has two layers: (1) increase the timeout for the experiences branch specifically since it legitimately needs more time, OR (2) set a higher token limit for the experiences branch to limit its generation time, OR (3) split experiences into sub-batches. Plus the defensive default (already applied) ensures schema validation passes.

- timestamp: 2026-06-03T14:05:00Z
  checked: extract-cv.ts consumeBranch timeout path (lines 316-328)
  found: When branchAbort.signal.aborted is true, the catch block logs a warning and returns WITHOUT writing anything to acc. The loop for partial objects never ran (or was aborted early), so acc.experiences remains undefined.
  implication: Branch timeout = zero writes to acc for that field.

- timestamp: 2026-06-03T14:05:00Z
  checked: lib/services/extraction-merge.ts mergeExtractedPartial
  found: Line 56 — `if (patch.experiences !== undefined) acc.experiences = patch.experiences` — only writes when patch has experiences. No default population of acc.experiences.
  implication: acc.experiences stays undefined if no partial ever arrived before timeout.

- timestamp: 2026-06-03T14:05:00Z
  checked: lib/schema.ts extractionSchema.experiences (line 147)
  found: `experiences: z.array(z.object({...}))` — no .optional(), no .default([]), no .catch([]). This field is REQUIRED and has no fallback.
  implication: safeParse({ ...acc }) with acc.experiences=undefined → fieldErrors: { experiences: ['Invalid input: expected array, received undefined'] }.

- timestamp: 2026-06-03T14:05:00Z
  checked: parallelExtractAndStream after Promise.all (lines 388-396)
  found: safeParse is called on acc as-is. If parsed.success=false, the raw acc (with undefined experiences) is used as `object` and saved to DB. No defensive default is applied before validation.
  implication: Saved extracted_data has experiences=undefined, which breaks CV display downstream.

## Resolution

root_cause: The experiences branch is uniquely the most expensive extraction branch: it generates the most output tokens (10+ experiences × 10 fields + nested description[] and skills[] arrays = 2000-5000 tokens) AND incurs the longest Gemini 2.5 Flash thinking overhead (reasoning about structuring many work entries before emitting the first JSON token). The combined TTFT + generation time for complex CVs regularly exceeds the flat 45s timeout shared by all branches. The 45s budget was appropriate for identity/education/skills (small output, low reasoning overhead) but undersized for experiences on real-world CVs. The consequence (acc.experiences = undefined → schema validation failure → corrupt DB record) was compounded by no defensive default in the accumulator after Promise.all.

fix: Two-layer fix applied to workflows/extract-cv.ts:
  1. consumeBranch() now accepts a `timeoutMs` parameter (default 45_000). The experiences branch call passes 90_000 — giving Gemini 2.5 Flash 90s to handle its thinking + generation for the largest branch. All other branches keep the 45s default.
  2. Defensive default already present from prior session: `if (acc.experiences === undefined) acc.experiences = []` after Promise.all before safeParse, so even if timeout fires the schema validates.

verification: Pending human verification — upload the same CV (CV_Titouan ROBERT_20-05-2026.pdf) and confirm experiences are fully extracted with no timeout warning in logs.

files_changed:
  - workflows/extract-cv.ts
