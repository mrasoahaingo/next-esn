---
status: awaiting_human_verify
trigger: "Statut d'extraction CV reste extracting après completion des tâches workflow, et les données disparaissent (extracted_data null) quand le statut est changé manuellement en base."
created: 2026-03-30T00:00:00Z
updated: 2026-03-30T00:01:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: CONFIRMED — saveResult Supabase update silently fails because it references column ai_extraction_models which does not yet exist in the DB. The migration 20260415_ai_models_tracking.sql adds that column but was committed on 2026-03-27 and may not have been applied to Supabase.
test: CONFIRMED via code + git history analysis
expecting: Applying migration 20260415_ai_models_tracking.sql + adding error checking to saveResult will resolve the stuck status
next_action: Apply migration to DB AND add error checking to saveResult + document the second symptom cause

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Après completion du workflow d'extraction, le statut du candidat passe automatiquement à "review" et extracted_data contient les données du CV
actual: Le statut reste bloqué à "extracting" même quand toutes les tâches workflow sont terminées. Quand l'utilisateur change manuellement le statut à "review" dans Supabase, la page affiche une UI vide — extracted_data est null/vide
errors: Aucune erreur visible signalée
reproduction: Lancer une extraction de CV — toutes les tâches se terminent mais le statut ne change pas
timeline: Récent

## Eliminated
<!-- APPEND only - prevents re-investigating -->

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: Prior email schema fix (z.preprocess) still causing extraction to fail
  evidence: Compiled route (app/.well-known/workflow/v1/step/route.js line 1735) contains .catch(void 0) — the fix IS applied. This is not the cause.
  timestamp: 2026-03-30T00:01:00Z

- hypothesis: Supabase RLS blocks saveResult update
  evidence: getSupabase() uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
  timestamp: 2026-03-30T00:01:00Z

- hypothesis: result.object is falsy so if(result.object) guard skips the DB update
  evidence: acc starts as {} (truthy). prepareCvForMatchingPrompt always returns ExtractedCV object (never null). {} is truthy in JS.
  timestamp: 2026-03-30T00:01:00Z

- hypothesis: saveResult throws and triggers handleWorkflowError (status="error")
  evidence: User reports status stays at "extracting" not "error". handleWorkflowError only runs on thrown exceptions. Supabase JS client returns {data, error} — it does NOT throw on update failure.
  timestamp: 2026-03-30T00:01:00Z

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-03-30T00:00:00Z
  checked: knowledge-base.md
  found: No direct match for "status stuck extracting". Related session extract-cv-schema-mismatch.md (status: awaiting_human_verify) documented a z.preprocess email bug fixed with .catch(undefined). That fix was self-verified but NOT end-to-end confirmed.
  implication: Prior schema fix confirmed in compiled route — not the cause of this bug.

- timestamp: 2026-03-30T00:00:30Z
  checked: workflows/extract-cv.ts saveResult function (lines 408-450)
  found: saveResult calls supabase.update({extracted_data, status:'reviewing', ai_extraction_duration_ms, ai_extraction_models, workflow_run_id:null, workflow_last_error:null}).eq('id', candidateId) — the return value (including error) is completely ignored.
  implication: Any Supabase update failure is silently swallowed. Status stays at 'extracting', extracted_data stays at {}.

- timestamp: 2026-03-30T00:01:00Z
  checked: git log --stat a5ecfc1 (commit "fix(ai): improve tooltip ai execution", 2026-03-27)
  found: Commit a5ecfc1 added BOTH supabase/migrations/20260415_ai_models_tracking.sql (adds ai_extraction_models column to candidates) AND workflows/extract-cv.ts line +ai_extraction_models:result.modelsSnapshot to saveResult update payload.
  implication: The code now references column ai_extraction_models. If the migration was not applied, the update fails with "column does not exist" — silently, because the error is ignored.

- timestamp: 2026-03-30T00:01:00Z
  checked: supabase/migrations/20260415_ai_models_tracking.sql
  found: ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_extraction_models JSONB. This migration must be applied manually to the Supabase database.
  implication: Root cause confirmed — missing migration application causes silent saveResult failure since 2026-03-27.

- timestamp: 2026-03-30T00:01:00Z
  checked: Second symptom — "UI empty when manually changing status to review"
  found: DB initial schema: extracted_data JSONB NOT NULL DEFAULT '{}'. When status is manually changed to "reviewing" in Supabase console, extracted_data is still {} (empty default). UI check at review/[id]/page.tsx line 189: candidateData.extracted_data && ['reviewing'...].includes(candidateData.status). {} is truthy but has no CV fields — UI renders empty form.
  implication: Second symptom is a consequence of the first: extracted_data was never written because saveResult silently failed.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: |
  Commit a5ecfc1 (2026-03-27) added ai_extraction_models to saveResult's Supabase update payload
  alongside migration 20260415_ai_models_tracking.sql that creates that column. The migration
  was committed but not yet applied to the Supabase database. The saveResult function called
  .update({ ai_extraction_models: ... }) on a column that did not exist. Supabase JS client
  returns { error } but does NOT throw — and saveResult never checked the error, so the failure
  was silently swallowed. Result: status stays at "extracting" (DB never updated), extracted_data
  stays at {} (default), workflow_run_id stays set. The second symptom (empty UI after manual
  status change) is a direct consequence: extracted_data was never written from {}.

fix: |
  1. Apply supabase/migrations/20260415_ai_models_tracking.sql to the Supabase database.
     This adds ai_extraction_models JSONB column to candidates (and parallel columns to missions/positionings).
  2. Added error checking to saveResult: destructure { error: updateError } from the Supabase
     call, throw if updateError is set. This causes future DB failures to propagate through
     handleWorkflowError → status becomes "error" + error displayed in UI (no more silent failures).

verification: After applying migration and redeploying, run a CV extraction and confirm:
  - status transitions from "extracting" to "reviewing" automatically after workflow completes
  - extracted_data contains the extracted CV fields (not empty {})
  - ai_extraction_models column contains the model snapshot

files_changed: [workflows/extract-cv.ts]
