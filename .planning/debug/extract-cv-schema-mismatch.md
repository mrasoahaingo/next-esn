---
status: awaiting_human_verify
trigger: "Step //./workflows/extract-cv//parallelExtractAndStream fails after 3 retries with No object generated: response did not match schema"
created: 2026-03-27T00:00:00Z
updated: 2026-03-27T00:03:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED (new root cause) — The `z.preprocess` fix from the previous session introduced a second bug: `z.preprocess((v) => ..., z.string().email().optional())` creates a `ZodPipe`. Zod v4's `toJSONSchema({ io: "input" })` treats the outer ZodPipe as required, adding `email` to the JSON schema `required` array. The model receives a schema demanding a required email field, can't produce one for CVs without email, and returns no output → `AI_NoOutputGeneratedError: No output generated` at stream flush.
test: Verified with node script: `z.toJSONSchema(z.object({ email: z.preprocess(..., z.string().email().optional()) }), { io: 'input' }).required` includes `email`. With `z.string().email().optional().catch(undefined)`, `required` is empty.
expecting: Fix with `z.string().email().optional().catch(undefined)` — keeps email optional in JSON schema (correct model guidance), accepts "" at runtime (catches validation error → undefined)
next_action: Await human verification — upload a CV without email address and confirm extraction succeeds

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Extract CV data from uploaded document and stream partial results back to the client in real-time
actual: The parallelExtractAndStream step fails after 3 retries with "No object generated: response did not match schema"
errors: Step "step//./workflows/extract-cv//parallelExtractAndStream" failed after 3 retries: No object generated: response did not match schema.
reproduction: Happens with specific document formats (unsure which), started recently with no obvious code change
started: Recently, has worked before

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Schema required fields are missing (experience, education, skills are required arrays)
  evidence: All required fields use z.array() which defaults fine; only the email field uses .email() validator that rejects empty strings
  timestamp: 2026-03-27T00:01:00Z

- hypothesis: z.preprocess fix fully resolves the issue
  evidence: z.preprocess creates ZodPipe; Zod v4 toJSONSchema({ io:'input' }) adds the outer pipe to required[], making email required in JSON schema sent to model; model can't satisfy required email constraint on CVs without email → AI_NoOutputGeneratedError at stream flush
  timestamp: 2026-03-27T00:03:00Z

- hypothesis: AI_NoOutputGeneratedError is caused by network/rate-limit/model refusal (transient)
  evidence: Error is reproducible after z.preprocess fix; the JSON schema change (email in required[]) explains consistent failure; not a transient issue
  timestamp: 2026-03-27T00:03:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-27T00:00:30Z
  checked: Zod v4.3.6 behavior of z.string().email().optional()
  found: In Zod v4, .optional() means "undefined is ok" but empty string "" still fails .email() validation
  implication: LLMs routinely output empty string "" for missing optional fields, causing all schema validation to fail

- timestamp: 2026-03-27T00:00:45Z
  checked: extractionIdentitySchema using personalInfo.email
  found: Line 67: `email: z.string().email().optional()` — the identity branch uses this schema, which contains the email field
  implication: Every CV without an email address in the document (or where LLM outputs "" instead of undefined) triggers AI_NoObjectGeneratedError, causing the step to fail all 3 retries

- timestamp: 2026-03-27T00:00:50Z
  checked: git log -- lib/schema.ts
  found: The `spacingAfter` field (optional z.number()) was added recently (fceb8b6) — but that's fine. The email issue is from Zod v4 behavior.
  implication: The project migrated to Zod 4.3.6 and .email().optional() behavior changed from v3 where empty string might have been coerced.

- timestamp: 2026-03-27T00:01:00Z
  checked: Similar fix pattern in the codebase (commit 639e6ed)
  found: Project already uses normalizeJobPostingKeyPointAspect and z.preprocess pattern to tolerate LLM outputs for enum fields
  implication: The fix pattern is established: use z.preprocess to normalize empty string to undefined before email validation

- timestamp: 2026-03-27T00:03:00Z
  checked: z.preprocess JSON schema output via z.toJSONSchema({ io:'input' }) and comparison before/after fix
  found: z.preprocess(fn, z.string().email().optional()) → ZodPipe → toJSONSchema adds email to required[]; z.string().email().optional().catch(undefined) → ZodCatch → toJSONSchema does NOT add email to required[]
  implication: z.preprocess is the wrong fix for Zod v4 AI SDK schemas; .catch(undefined) is correct — it fixes runtime behavior without changing the JSON schema structure

- timestamp: 2026-03-27T00:03:00Z
  checked: AI SDK flush behavior at recordedSteps.length === 0 (line 6692 in ai/dist/index.mjs)
  found: When LLM produces no steps (empty stream), flush throws AI_NoOutputGeneratedError. This happens when the model cannot satisfy the JSON schema constraints — required email field with no email in CV causes model to produce no valid structured output.
  implication: The z.preprocess fix directly caused AI_NoOutputGeneratedError by making email required in the JSON schema sent to the model.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Two-stage bug:
  1. Original: Zod v4.3.6 `z.string().email().optional()` rejects `""` at runtime. LLMs output `""` for absent email fields → `AI_NoObjectGeneratedError: response did not match schema`.
  2. Introduced by fix: `z.preprocess(fn, z.string().email().optional())` creates a `ZodPipe`. Zod v4's `toJSONSchema({ io:'input' })` adds `email` to the JSON schema `required[]` array (the ZodPipe input side has no `.optional()` marker). The model receives a JSON schema requiring `email`, but the CV has none → model produces no valid structured output → `AI_NoOutputGeneratedError: No output generated. Check the stream for errors.` at stream flush when `recordedSteps.length === 0`.

fix: Changed `email` field to `z.string().email().optional().catch(undefined)`.
  — `.catch(undefined)`: if `.email()` validation fails (e.g. for `""` or other invalid values), returns `undefined` instead of throwing.
  — Preserves correct JSON schema: email is NOT in required[], schema shows `{type: string, format: email, pattern: ...}` — model correctly guided to output optional valid email.
  — No `.optional()` is stripped from JSON schema (unlike with `z.preprocess`).

verification: Self-verified with node scripts:
  - `z.string().email().optional().catch(undefined).safeParse('')` → `{success: true, data: undefined}`
  - `z.string().email().optional().catch(undefined).safeParse('x@y.com')` → `{success: true, data: 'x@y.com'}`
  - JSON schema for field: NOT in required[], has format:email pattern
  Awaiting end-to-end confirmation.
files_changed: [lib/schema.ts]
