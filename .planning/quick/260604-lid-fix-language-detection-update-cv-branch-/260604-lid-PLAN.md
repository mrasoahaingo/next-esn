---
phase: quick-260604-lid
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/20260604152955_fix_identity_prompt_language_detection.sql
  - workflows/extract-cv.ts
autonomous: true
requirements: [LID-01, LID-02]

must_haves:
  truths:
    - "When an English CV is uploaded, candidates.language is set to 'en'"
    - "When a French CV is uploaded, candidates.language stays 'fr'"
    - "The identity prompt instructs the LLM to detect and return the source document language"
  artifacts:
    - path: "supabase/migrations/20260604152955_fix_identity_prompt_language_detection.sql"
      provides: "Updated cv.branch.identity system_prompt_template with language detection instruction"
    - path: "workflows/extract-cv.ts"
      provides: "saveResult writes detected language to candidates.language column"
  key_links:
    - from: "llm_tasks cv.branch.identity"
      to: "extractionIdentitySchema.language"
      via: "LLM outputs language field per prompt instruction"
    - from: "workflows/extract-cv.ts saveResult"
      to: "candidates.language"
      via: "supabase .update() with language field"
---

<objective>
Fix language detection so English CVs are correctly flagged as 'en' in the database.

Purpose: The cv.branch.identity prompt never instructs the LLM to output a language field, so Zod defaults to 'fr'. Additionally, saveResult never writes the language to candidates.language even when detected. Both gaps must be fixed together.
Output: Migration SQL + workflow patch enabling correct language persistence.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add language detection instruction to cv.branch.identity prompt</name>
  <files>supabase/migrations/20260604152955_fix_identity_prompt_language_detection.sql</files>
  <action>
Create a new idempotent migration that UPDATEs the system_prompt_template for task_key = 'cv.branch.identity' in llm_tasks.

The updated prompt must:
1. Keep "Langue : français pour tous les champs texte" — output language stays French
2. Change "Extrais uniquement : informations personnelles (personalInfo) et synthèse professionnelle (summary)." to include "et la langue du document (language)"
3. Add a new "Pour language" paragraph at the end (before the closing) explaining the field is the source document language, not output language

Full replacement value for system_prompt_template (escape single quotes as ''):

```
Tu es un expert en recrutement technique pour une ESN française.
Tu extrais et normalises les données à partir du texte du CV fourni.
Langue : français pour tous les champs texte.

Extrais uniquement : informations personnelles (personalInfo), synthèse professionnelle (summary), et la langue du document (language).

Pour personalInfo :
- yearsOfExperience : total à partir des durées / dates du CV (ex. "8 ans")
- availability : "Immédiate" par défaut sauf si préavis mentionné

Pour summary : 3-4 phrases. Utilise **double astérisques** autour des compétences clés, technologies et réalisations importantes.

Pour language : détecte la langue principale du CV source (''fr'' si français, ''en'' si anglais). Ce champ décrit la langue du document original, pas la langue de sortie des champs texte.
```

SQL structure:
```sql
UPDATE llm_tasks
SET system_prompt_template = '...'
WHERE task_key = 'cv.branch.identity';
```

No INSERT or CREATE — pure UPDATE, idempotent by nature (re-running overwrites with same value).
  </action>
  <verify>
    <automated>grep -c "détecte la langue principale" /Users/mrasoahaingo/Projects/perso/next-esn/supabase/migrations/20260604152955_fix_identity_prompt_language_detection.sql</automated>
  </verify>
  <done>Migration file exists, contains the language detection instruction, single quotes in the SQL string are escaped as '' (double single-quote)</done>
</task>

<task type="auto">
  <name>Task 2: Write detected language to candidates.language in saveResult</name>
  <files>workflows/extract-cv.ts</files>
  <action>
In the saveResult function (around line 448), before the supabase .update() call, extract the detected language from result.object and add it to the update payload.

Insert these two lines immediately before the `const { error: updateError }` line:

```ts
const lang = (result.object as Record<string, unknown>)?.language;
const detectedLanguage = lang === 'en' ? 'en' : 'fr';
```

Then add `language: detectedLanguage` to the update object alongside the existing fields:

```ts
.update({
  extracted_data: result.object,
  language: detectedLanguage,
  status: 'reviewing',
  ai_extraction_duration_ms: result.durationMs,
  ai_extraction_models: result.modelsSnapshot,
  workflow_run_id: null,
  workflow_last_error: null,
})
```

No new imports needed. The cast `(result.object as Record<string, unknown>)` uses only built-in TypeScript constructs. Keep the guard `lang === 'en' ? 'en' : 'fr'` to ensure only valid CHECK constraint values ('fr' | 'en') are written to the DB.
  </action>
  <verify>
    <automated>grep -n "detectedLanguage" /Users/mrasoahaingo/Projects/perso/next-esn/workflows/extract-cv.ts</automated>
  </verify>
  <done>saveResult contains detectedLanguage extraction and language field in the .update() call; TypeScript compilation passes (npx tsc --noEmit)</done>
</task>

</tasks>

<verification>
After both tasks:
1. `grep -c "détecte la langue principale" supabase/migrations/20260604152955_fix_identity_prompt_language_detection.sql` returns 1
2. `grep -n "language: detectedLanguage" workflows/extract-cv.ts` shows the field in the update payload
3. `npx tsc --noEmit` exits 0 (no type errors)
</verification>

<success_criteria>
- Migration file exists with correct language detection instruction in the identity prompt
- saveResult in extract-cv.ts extracts language from result.object and persists it to candidates.language
- DB constraint (CHECK IN ('fr','en')) is respected via the 'en'/'fr' guard
- An English CV re-extracted after applying the migration will have candidates.language = 'en'
</success_criteria>

<output>
After completion, create `.planning/quick/260604-lid-fix-language-detection-update-cv-branch-/260604-lid-SUMMARY.md`
</output>
