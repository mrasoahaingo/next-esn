---
phase: quick-260604-ncx
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/review/components/PdfPreviewSync.tsx
autonomous: true
requirements:
  - NCX-01
must_haves:
  truths:
    - "Le PDF preview ne s'affiche pas pendant que l'extraction est en cours tant que la langue n'est pas détectée"
    - "Une fois la langue détectée (personalInfo présent), le preview se déclenche normalement"
    - "Pour un CV en anglais, le premier rendu PDF utilise 'en', jamais 'fr'"
  artifacts:
    - path: "app/review/components/PdfPreviewSync.tsx"
      provides: "Gate language-detection before triggering PDF preview"
  key_links:
    - from: "app/review/components/PdfPreviewSync.tsx"
      to: "lib/hooks/usePdfPreview.ts"
      via: "data prop — null until identity step complete"
      pattern: "data.*null.*language"
---

<objective>
Empêcher le blink fr→en dans la preview PDF en ne déclenchant le rendu qu'une fois la détection de langue complète.

Purpose: Pendant le streaming d'extraction, `language` a le défaut `'fr'` (schema Zod) avant que le step `identity` n'ait tourné. `usePdfPreview` déclenche immédiatement une requête PDF avec `language: 'fr'`, puis en redéclenche une avec `language: 'en'` quand les données arrivent — d'où le blink.
Output: `PdfPreviewSync` passe `null` au hook tant que l'identité n'est pas résolue (firstName ou lastName absent), bloquant toute requête prématurée.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Flux de données pertinent :
- `usePdfPreview` dans `lib/hooks/usePdfPreview.ts` : déclenche une requête PDF dès que `data !== null`, avec debounce 600ms.
- `PdfPreviewSync` dans `app/review/components/PdfPreviewSync.tsx` : passe `data` (le `cvData` du store) directement au hook sans vérification.
- `extractionSchema` dans `lib/schema.ts` : `language` est `.enum(['fr','en']).default('fr')` — présent dès le début avec valeur `'fr'`.
- `cvBranchSatisfied('identity', data)` dans `lib/workflow/compute-step-status.ts` : `!!(data.personalInfo?.firstName || data.personalInfo?.lastName) || !!data.summary` — indique que le step identity est terminé.

Contrat `usePdfPreview` : si `data` est `null`, le hook annule toute requête en cours et appelle `onResetPreview`. Si `data` est non-null, il déclenche la génération PDF.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Gate PDF preview on identity step completion</name>
  <files>app/review/components/PdfPreviewSync.tsx</files>
  <action>
Dans `PdfPreviewSync`, avant de passer `data` à `usePdfPreview`, calculer si le step identity est résolu.

Règle : le step identity est considéré résolu quand `data?.personalInfo?.firstName || data?.personalInfo?.lastName || data?.summary` est truthy. Jusqu'à là, passer `null` à `usePdfPreview` à la place de `data`.

Implémentation :

```tsx
const identityResolved = !!(
  data?.personalInfo?.firstName ||
  data?.personalInfo?.lastName ||
  data?.summary
);

usePdfPreview({
  data: identityResolved ? data : null,
  ...
});
```

Pourquoi cette condition : le LLM émet `personalInfo` et `language` dans le même step `identity`. Quand `firstName` ou `lastName` est présent, `language` a forcément sa valeur réelle (pas le défaut Zod). Le PDF généré utilisera donc les bons labels dès le premier rendu.

Ne pas toucher à `usePdfPreview` lui-même — le guard doit rester dans le composant consommateur pour ne pas affecter l'éditeur de templates qui utilise le même hook avec ses propres données.
  </action>
  <verify>
    <automated>npx tsc --noEmit 2>&1 | grep -E "PdfPreviewSync|error" | head -20</automated>
  </verify>
  <done>
- `PdfPreviewSync` passe `null` à `usePdfPreview` tant que `personalInfo.firstName/lastName` et `summary` sont absents
- La première requête PDF est faite avec la langue réelle du CV (fr ou en)
- TypeScript compile sans erreur
- L'éditeur de templates (`app/templates/[id]/page.tsx`) n'est pas impacté
  </done>
</task>

</tasks>

<verification>
Test manuel :
1. Uploader un CV en anglais
2. Observer la preview pendant l'extraction : aucun PDF ne doit apparaître avant que le nom/prénom soit visible dans le formulaire
3. Quand le nom apparaît, le preview se déclenche et affiche directement les labels anglais sans flash français
</verification>

<success_criteria>
- Pendant l'extraction d'un CV EN, la preview reste vide (placeholder "Le PDF apparaîtra ici") jusqu'à ce que l'identité soit détectée
- Le premier PDF généré pour un CV EN utilise les labels EN — zéro blink fr→en
</success_criteria>

<output>
After completion, create `.planning/quick/260604-ncx-n-affiche-pas-la-preview-du-cv-tant-qu-o/260604-ncx-SUMMARY.md`
</output>
