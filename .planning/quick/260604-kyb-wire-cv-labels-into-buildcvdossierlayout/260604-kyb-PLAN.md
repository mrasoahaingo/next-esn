---
phase: quick-260604-kyb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - templates/cv-dossier-layout.ts
autonomous: true
requirements: [LANG-PDF-01]

must_haves:
  truths:
    - "PDF preview shows English labels when data.language is 'en'"
    - "PDF preview shows French labels when data.language is 'fr' or undefined"
  artifacts:
    - path: "templates/cv-dossier-layout.ts"
      provides: "CV_LABELS fully populated, wired into all block builders"
      contains: "CV_LABELS['en']"
  key_links:
    - from: "buildCvDossierLayoutSpec"
      to: "block builder functions"
      via: "lang variable read from data.language ?? 'fr'"
      pattern: "CV_LABELS\\[lang\\]"
---

<objective>
Wire CV_LABELS into all block builder functions in templates/cv-dossier-layout.ts so the PDF preview renders labels in the document language (fr/en) instead of hardcoded French.

Purpose: Decision LANG states language is set at document level; the PDF pipeline must reflect it.
Output: templates/cv-dossier-layout.ts with expanded CV_LABELS and language-aware block builders.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Key decision from STATE.md:
- LANG: Langue unique par document source; artefacts positionnement cross-langue suivent la langue de la mission.
- Phase 06: CV_LABELS declared but not wired to PDF pipeline — Phase 8 responsibility (this quick task fulfills it).

The file to modify: templates/cv-dossier-layout.ts
- CV_LABELS already exists at lines 23-53 (fr/en) with: docTitle, summary, skills, experiences, education, strengths, availability, contact.
- BlockBuilder type (line 313): 6 params — elements, pageChildren, data, block, colors, theme. No type changes needed; read data.language inside builders.
- Hardcoded French strings to replace:
  - addProfileInfoBlock (line 333-338): 'Poste', "Années d'expérience", 'Localisation', 'Disponibilité', 'Email', 'Telephone'
  - addSummaryBlock (line 353): 'Synthese du profil'
  - addSkillsBlock (lines 384-388, 408): 'Technologies', 'Soft skills', 'Expertises', 'Methodologies', 'Competences'
  - addEducationBlock (line 428): 'Formations'
  - addExperiencesBlock (line 496): 'Experiences professionnelles'
</context>

<tasks>

<task type="auto">
  <name>Task 1: Expand CV_LABELS and wire language into block builders</name>
  <files>templates/cv-dossier-layout.ts</files>
  <action>
**Step 1 — Expand CV_LABELS** (lines 23-53) to include all hardcoded French strings:

Add these keys to both `fr` and `en` entries:
```typescript
// fr additions
poste: 'Poste',
yearsOfExperience: "Années d'expérience",
location: 'Localisation',
availability: 'Disponibilité',
email: 'Email',
phone: 'Téléphone',
summaryHeading: 'Synthèse du profil',
skillsHeading: 'Compétences',
educationHeading: 'Formations',
experiencesHeading: 'Expériences professionnelles',
technologies: 'Technologies',
softSkills: 'Soft skills',
expertises: 'Expertises',
methodologies: 'Méthodologies',

// en additions
poste: 'Position',
yearsOfExperience: 'Years of experience',
location: 'Location',
availability: 'Availability',
email: 'Email',
phone: 'Phone',
summaryHeading: 'Profile Summary',
skillsHeading: 'Skills',
educationHeading: 'Education',
experiencesHeading: 'Professional Experience',
technologies: 'Technologies',
softSkills: 'Soft skills',
expertises: 'Expertise',
methodologies: 'Methodologies',
```

Also update the existing keys in `en` that are already present (no change needed to `fr`):
- `summary: 'Profile'` → keep as is (this is the section heading alias; use new `summaryHeading` for the section title)
- Actually: drop the old `summary`/`skills`/`experiences`/`education` keys if they duplicate the new heading keys, OR just add the new keys alongside them. Simplest: add new specific keys, leave existing keys intact for backward compatibility.

**Step 2 — Wire language in each block builder** by reading `data.language ?? 'fr'` at the top of each function:

In `addProfileInfoBlock`:
```typescript
const lang = data.language ?? 'fr';
const L = CV_LABELS[lang];
// then replace hardcoded labels:
if (pi.title) rows.push({ label: L.poste, value: pi.title });
if (pi.yearsOfExperience) rows.push({ label: L.yearsOfExperience, value: pi.yearsOfExperience });
if (pi.location) rows.push({ label: L.location, value: pi.location });
if (pi.availability) rows.push({ label: L.availability, value: pi.availability });
if (pi.email && block.variant === 'detailed') rows.push({ label: L.email, value: pi.email });
if (pi.phone && block.variant === 'detailed') rows.push({ label: L.phone, value: pi.phone });
```

In `addSummaryBlock`:
```typescript
const lang = data.language ?? 'fr';
const L = CV_LABELS[lang];
addSectionHeading(elements, 'summary', L.summaryHeading, pageChildren, colors, theme);
```

In `addSkillsBlock`:
```typescript
const lang = data.language ?? 'fr';
const L = CV_LABELS[lang];
// replace cats array:
const cats: { key: keyof typeof skills; label: string }[] = [
  { key: 'technologies', label: L.technologies },
  { key: 'softSkills', label: L.softSkills },
  { key: 'expertises', label: L.expertises },
  { key: 'methodologies', label: L.methodologies },
];
// replace section heading:
addSectionHeading(elements, 'skills', L.skillsHeading, pageChildren, colors, theme);
```

In `addEducationBlock`:
```typescript
const lang = data.language ?? 'fr';
const L = CV_LABELS[lang];
addSectionHeading(elements, 'edu', L.educationHeading, pageChildren, colors, theme);
```

In `addExperiencesBlock`:
```typescript
const lang = data.language ?? 'fr';
const L = CV_LABELS[lang];
addSectionHeading(elements, 'exp', L.experiencesHeading, pageChildren, colors, theme);
```

No changes to BlockBuilder type signature. No new abstractions.
  </action>
  <verify>
    <automated>cd /Users/mrasoahaingo/Projects/perso/next-esn && npx tsc --noEmit --project tsconfig.json 2>&1 | head -30</automated>
  </verify>
  <done>
- CV_LABELS has fr/en translations for all formerly-hardcoded strings
- Each block builder reads `data.language ?? 'fr'` and looks up labels via CV_LABELS
- TypeScript compiles without errors
- French PDF unchanged when data.language is 'fr' or undefined
- English PDF uses English labels when data.language is 'en'
  </done>
</task>

</tasks>

<verification>
TypeScript compile passes: `npx tsc --noEmit` exits 0.
Spot-check: grep 'Synthese du profil\|Formations\|Competences\|Experiences professionnelles\|Poste' templates/cv-dossier-layout.ts returns no hardcoded French strings in builder functions.
</verification>

<success_criteria>
- No hardcoded French strings remain in addProfileInfoBlock, addSummaryBlock, addSkillsBlock, addEducationBlock, addExperiencesBlock
- CV_LABELS['en'] covers all label keys used in builders
- data.language = 'en' routes to English labels; data.language = 'fr' or undefined routes to French
</success_criteria>

<output>
After completion, create `.planning/quick/260604-kyb-wire-cv-labels-into-buildcvdossierlayout/260604-kyb-SUMMARY.md`
</output>
