---
phase: quick-260604-miq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/utils/detect-cv-language.ts
  - workflows/extract-cv.ts
  - supabase/migrations/20260604161354_cv_branch_prompts_language_output.sql
autonomous: true
requirements: []
must_haves:
  truths:
    - "Uploading an English CV produces extracted text (summary, experience descriptions, skill names) in English"
    - "Uploading a French CV produces extracted text in French (no regression)"
    - "The language field in candidates.language is still correctly set to en or fr"
  artifacts:
    - path: "lib/utils/detect-cv-language.ts"
      provides: "Pure function detectCvLanguage(text) returning 'fr' | 'en'"
    - path: "supabase/migrations/20260604161354_cv_branch_prompts_language_output.sql"
      provides: "Replaces hardcoded 'français' instruction with {{language_label}} placeholder in all 4 cv.branch.* prompts"
  key_links:
    - from: "workflows/extract-cv.ts (parallelExtractAndStream)"
      to: "resolveLlmTask context"
      via: "{ language: detectedLang, language_label: 'French' | 'Anglais' }"
      pattern: "resolveLlmTask.*context.*language"
---

<objective>
Inject the detected CV language into the extraction LLM prompts so the model outputs text in the source CV language instead of always defaulting to French.

Purpose: English CVs produce French extracted text because all four cv.branch.* prompts hardcode "Langue : français pour tous les champs texte." and no language context is passed to resolveLlmTask.
Output: A language detection utility, a DB migration replacing the hardcoded French instruction with a {{language_label}} placeholder, and the workflow wired to pass language context before the parallel extraction branches run.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260604-miq-les-textes-extraits-par-le-llm-sont-touj/260604-miq-PLAN.md

<!-- Key decision from STATE.md: PROMPT — Un seul row par task_key avec {{language}} injecté — pas de doublons de prompts par langue. -->
<!-- Key decision from STATE.md: LANG — langue du document source détermine la langue de sortie des artefacts CV. -->
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add detectCvLanguage utility</name>
  <files>lib/utils/detect-cv-language.ts, lib/utils/detect-cv-language.test.ts</files>
  <behavior>
    - detectCvLanguage("Bonjour, voici mon expérience professionnelle") → 'fr'
    - detectCvLanguage("Hello, here is my professional experience") → 'en'
    - detectCvLanguage("") → 'fr' (safe default)
    - detectCvLanguage(textWithMostlyEnglishWords) → 'en'
    - detectCvLanguage(textWithMostlyFrenchWords) → 'fr'
  </behavior>
  <action>
Create `lib/utils/detect-cv-language.ts` exporting:

```ts
export type CvLanguage = 'fr' | 'en';

/**
 * Détecte la langue principale d'un CV à partir de son texte brut.
 * Heuristique légère : compte les mots-clés FR et EN les plus fréquents
 * dans les CVs, retourne 'fr' par défaut si aucun signal clair.
 */
export function detectCvLanguage(text: string): CvLanguage { ... }
```

Implementation strategy — word frequency heuristic (no external package):
- Lowercase the text.
- Count occurrences of high-frequency French CV words: ['expérience', 'formation', 'compétences', 'entreprise', 'poste', 'responsable', 'développeur', 'chef', 'gestion', 'équipe', 'projet', 'stage', 'diplôme', 'niveau', 'français', 'notre', 'pour', 'avec', 'dans']
- Count occurrences of high-frequency English CV words: ['experience', 'education', 'skills', 'company', 'position', 'manager', 'developer', 'team', 'project', 'responsible', 'degree', 'level', 'english', 'our', 'with', 'and', 'the', 'for']
- If englishScore > frenchScore * 1.2 → return 'en', else return 'fr'.
- The 1.2 threshold avoids flipping to 'en' on ambiguous bilingual CVs.

Write the test file first (RED), then implement (GREEN).
  </action>
  <verify>
    <automated>npx vitest run lib/utils/detect-cv-language.test.ts</automated>
  </verify>
  <done>All behavior cases pass. detectCvLanguage('Hello, here is my professional experience') returns 'en'. detectCvLanguage('Bonjour, voici mon expérience') returns 'fr'. Empty string returns 'fr'.</done>
</task>

<task type="auto">
  <name>Task 2: Wire language context into extraction branches + DB migration</name>
  <files>workflows/extract-cv.ts, supabase/migrations/20260604161354_cv_branch_prompts_language_output.sql</files>
  <action>
**Part A — DB migration**

Create `supabase/migrations/20260604161354_cv_branch_prompts_language_output.sql`.

For each of the 4 cv.branch.* task_keys (identity, experiences, education, skills), run an UPDATE that replaces the hardcoded French language instruction line:

  `Langue : français pour tous les champs texte.`

with the templated instruction:

  `Langue de sortie : {{language_label}} — respecte scrupuleusement la langue du CV source pour tous les champs texte extraits.`

The identity branch prompt also still needs "Pour language : détecte la langue principale du CV source..." — keep that instruction unchanged, only replace the output language line.

Use individual UPDATE statements per task_key. Replace via string manipulation in SQL (replace() function):

```sql
UPDATE llm_tasks
SET system_prompt_template = replace(
  system_prompt_template,
  'Langue : français pour tous les champs texte.',
  'Langue de sortie : {{language_label}} — respecte scrupuleusement la langue du CV source pour tous les champs texte extraits.'
)
WHERE task_key IN (
  'cv.branch.identity',
  'cv.branch.experiences',
  'cv.branch.education',
  'cv.branch.skills'
);
```

Run the migration via Supabase CLI: `npx supabase db push` (or note it for manual apply if CLI unavailable).

**Part B — Workflow wiring**

In `workflows/extract-cv.ts`, update `parallelExtractAndStream`:

1. Import `detectCvLanguage` from `@/lib/utils/detect-cv-language`.
2. Add at the top of `parallelExtractAndStream` (before the `resolveLlmTask` calls):

```ts
const detectedLang = detectCvLanguage(cvText);
const languageLabel = detectedLang === 'en' ? 'English' : 'Français';
const langContext = { language: detectedLang, language_label: languageLabel };
```

3. Pass `langContext` as `context` in all 4 `resolveLlmTask` calls (replace `context: {}`):

```ts
resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_IDENTITY, orgId, context: langContext }),
resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_EXPERIENCES, orgId, context: langContext }),
resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_EDUCATION, orgId, context: langContext }),
resolveLlmTask(supabase, { taskKey: TASK_KEY.CV_BRANCH_SKILLS, orgId, context: langContext }),
```

Note: The identity branch also detects language via the `language` field in extractionSchema — that separate mechanism for DB persistence is unchanged (saveResult still reads `result.object.language`). The `detectCvLanguage` here is the prompt-time heuristic that fires before the LLM runs, ensuring the right output language instruction reaches all branches simultaneously.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | head -20</automated>
  </verify>
  <done>TypeScript compiles clean. Migration file exists with the replace() UPDATE. workflows/extract-cv.ts imports detectCvLanguage and passes langContext to all 4 resolveLlmTask calls. The console.warn in resolveLlmTask for unresolved {{}} placeholders is silent when language_label is in context.</done>
</task>

</tasks>

<verification>
- `npx vitest run lib/utils/detect-cv-language.test.ts` — all tests green
- `npx tsc --noEmit` — no type errors
- Grep check: `grep -n "language_label\|langContext" workflows/extract-cv.ts` shows wiring present
- Migration exists: `ls supabase/migrations/20260604161354_cv_branch_prompts_language_output.sql`
</verification>

<success_criteria>
- Uploading an English CV → extracted summary and experience descriptions are in English
- Uploading a French CV → extracted text remains in French (no regression)
- candidates.language field still saved correctly (saveResult logic unchanged)
- No TypeScript errors, no new console.warn about unresolved placeholders
</success_criteria>

<output>
After completion, create `.planning/quick/260604-miq-les-textes-extraits-par-le-llm-sont-touj/260604-miq-SUMMARY.md`
</output>
