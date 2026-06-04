---
phase: quick-260604-pin
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/utils/cv-experience-time.ts
  - lib/utils/cv-experience-time.test.ts
autonomous: true
requirements:
  - QUICK-260604-pin
must_haves:
  truths:
    - "A French CV shows '8 ans' for yearsOfExperience in the PDF"
    - "An English CV shows '8 years' for yearsOfExperience in the PDF"
  artifacts:
    - path: lib/utils/cv-experience-time.ts
      provides: Language-aware formatTotalExperienceYears
      contains: "language"
  key_links:
    - from: lib/utils/cv-experience-time.ts
      to: personalInfo.yearsOfExperience
      via: prepareCvForMatchingPrompt stores the result
      pattern: "yearsOfExperience: years"
---

<objective>
Fix the hardcoded French label "ans" in `formatTotalExperienceYears` so it emits
"8 ans" for French CVs and "8 years" for English CVs.

Purpose: The "Years of experience" row in the PDF shows the raw value stored in
`personalInfo.yearsOfExperience`. That value is produced by `formatTotalExperienceYears`
which unconditionally appends " ans". English CVs therefore always display "8 ans"
instead of "8 years".

Output: `lib/utils/cv-experience-time.ts` updated, test updated.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Accept language in formatTotalExperienceYears and propagate from CV</name>
  <files>lib/utils/cv-experience-time.ts, lib/utils/cv-experience-time.test.ts</files>
  <behavior>
    - formatTotalExperienceYears(cv, ref, 'fr') → '8 ans'
    - formatTotalExperienceYears(cv, ref, 'en') → '8 years'
    - formatTotalExperienceYears(cv, ref) (no language, defaults to 'fr') → '8 ans'
    - prepareCvForMatchingPrompt with language:'en' CV → yearsOfExperience is '8 years'
    - prepareCvForMatchingPrompt with language:'fr' CV → yearsOfExperience is '8 ans' (existing test still passes)
  </behavior>
  <action>
In `lib/utils/cv-experience-time.ts`:

1. Change the signature of `formatTotalExperienceYears` to accept an optional third parameter:
   ```ts
   export function formatTotalExperienceYears(
     cv: ExtractedCV,
     referenceDate: Date,
     language: 'fr' | 'en' = 'fr',
   ): string | undefined {
   ```

2. On line 126, replace the hardcoded label with a conditional:
   ```ts
   const unit = language === 'en' ? 'years' : 'ans';
   return `${years} ${unit}`;
   ```

3. In `prepareCvForMatchingPrompt`, pass `cv.language ?? 'fr'` as the third argument to `formatTotalExperienceYears`:
   ```ts
   const years = formatTotalExperienceYears(out, referenceDate, out.language ?? 'fr');
   ```

In `lib/utils/cv-experience-time.test.ts`:

4. The existing `prepareCvForMatchingPrompt` test uses `baseCv` which sets `language: 'fr'` — it expects `'8 ans'`. Update the assertion comment but do NOT change the expected value.

5. Add a new test case inside `describe('prepareCvForMatchingPrompt')`:
   ```ts
   it('uses "years" label for an English CV', () => {
     const ref = new Date('2026-03-01T00:00:00Z');
     const cv = baseCv({
       language: 'en',
       personalInfo: {
         firstName: 'John',
         lastName: 'Doe',
         title: 'Developer',
         yearsOfExperience: '2 years',
       },
       experiences: [
         {
           role: 'Dev',
           company: 'Acme',
           startDate: '2018',
           isCurrent: false,
           description: [],
         },
       ],
     });
     const out = prepareCvForMatchingPrompt(cv, ref);
     expect(out.personalInfo.yearsOfExperience).toBe('8 years');
   });
   ```
  </action>
  <verify>
    <automated>npx vitest run lib/utils/cv-experience-time.test.ts</automated>
  </verify>
  <done>All tests pass. `formatTotalExperienceYears` returns "8 years" for English and "8 ans" for French. No TypeScript errors (`npx tsc --noEmit` clean on modified files).</done>
</task>

</tasks>

<verification>
npx vitest run lib/utils/cv-experience-time.test.ts
</verification>

<success_criteria>
- `formatTotalExperienceYears` returns `"N years"` when `language === 'en'`
- `formatTotalExperienceYears` returns `"N ans"` when `language === 'fr'` or omitted
- `prepareCvForMatchingPrompt` propagates the CV's `language` field to the label
- All existing tests still pass
- TypeScript compiles without errors on changed files
</success_criteria>

<output>
After completion, create `.planning/quick/260604-pin-le-label-ans-pour-l-information-years-of/260604-pin-SUMMARY.md`
</output>
