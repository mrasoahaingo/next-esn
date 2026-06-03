---
phase: 260603-gew
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/review/components/ExtractionProgress.tsx
  - app/review/components/Education.tsx
autonomous: true
requirements: []

must_haves:
  truths:
    - "Quand l'extraction est terminée sans formations, la barre de progression affiche 5/5 (100%)"
    - "Le titre de la section formations est 'Formations' en français"
    - "Le bouton d'ajout de formation affiche 'Ajouter une formation'"
  artifacts:
    - path: "app/review/components/ExtractionProgress.tsx"
      provides: "Barre de progression corrigée pour complétion sans formations"
    - path: "app/review/components/Education.tsx"
      provides: "Labels français pour le titre et le bouton d'ajout"
  key_links:
    - from: "ExtractionProgress.tsx"
      to: "completedCount"
      via: "condition !isStreaming ? steps.length : steps.filter(...)"
      pattern: "!isStreaming"
---

<objective>
Corriger deux bugs visuels sur la page de revue CV : la barre de progression bloquée à 4/5 quand aucune formation n'est trouvée, et les labels anglais dans le composant Education.

Purpose: UX fiable — l'utilisateur voit une progression complète quand l'extraction est terminée, et navigue dans une interface entièrement en français.
Output: ExtractionProgress.tsx et Education.tsx corrigés.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Corriger la barre de progression ExtractionProgress</name>
  <files>app/review/components/ExtractionProgress.tsx</files>
  <action>
    Ligne 105, remplacer :
    ```typescript
    const completedCount = steps.filter((s) => s.check(data)).length;
    ```
    par :
    ```typescript
    const completedCount = !isStreaming ? steps.length : steps.filter((s) => s.check(data)).length;
    ```

    Ligne 108, la variable `activeStep` utilise déjà `isStreaming` comme garde — pas de changement nécessaire là. La logique est : quand le streaming est terminé (`isStreaming=false`), tous les steps sont considérés complétés indépendamment de leur `check`, ce qui reflète la réalité : l'extraction est finie, même si aucune formation n'était dans le document.
  </action>
  <verify>
    <automated>npx tsc --noEmit --project tsconfig.json 2>&1 | grep ExtractionProgress || echo "OK"</automated>
  </verify>
  <done>Quand isStreaming=false, completedCount vaut toujours steps.length (5/5), quelle que soit la présence de formations dans data.</done>
</task>

<task type="auto">
  <name>Task 2: Traduire les labels anglais dans Education</name>
  <files>app/review/components/Education.tsx</files>
  <action>
    Deux changements dans le JSX :

    1. Ligne ~46 : remplacer le contenu du `<h2>` :
       - De : `Education`
       - À : `Formations`

    2. Ligne ~51 : remplacer le texte du bouton `Add Education` :
       - De : `Add Education`
       - À : `Ajouter une formation`

    Ne pas toucher aux `placeholder` anglais des `<Input>` (degree, school, year) ni aux `aria-label` — hors scope de ce fix.
  </action>
  <verify>
    <automated>npx tsc --noEmit --project tsconfig.json 2>&1 | grep Education || echo "OK"</automated>
  </verify>
  <done>Le composant Education affiche "Formations" en titre et "Ajouter une formation" sur le bouton d'ajout.</done>
</task>

</tasks>

<verification>
Les deux fichiers compilent sans erreurs TypeScript. Les labels français sont présents dans Education.tsx. La logique `!isStreaming` est présente dans ExtractionProgress.tsx.
</verification>

<success_criteria>
- `ExtractionProgress` : `completedCount` vaut `steps.length` quand `isStreaming=false`
- `Education` : titre "Formations", bouton "Ajouter une formation"
- Aucune régression TypeScript
</success_criteria>

<output>
Après complétion, créer `.planning/quick/260603-gew-fix-cv-extraction-progress-bar-and-educa/260603-gew-SUMMARY.md`
</output>
