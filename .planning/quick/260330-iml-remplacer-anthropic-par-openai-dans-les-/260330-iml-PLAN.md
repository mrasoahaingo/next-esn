---
phase: quick-260330-iml
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/radar/collectors/boamp.ts
  - lib/radar/collectors/jobs.ts
autonomous: true
requirements: [IML-01]

must_haves:
  truths:
    - "Les deux collectors Stagehand utilisent gpt-4o-mini et OPENAI_API_KEY"
    - "OPENAI_API_KEY est documenté comme variable d'environnement requise"
  artifacts:
    - path: "lib/radar/collectors/boamp.ts"
      provides: "Stagehand config avec OpenAI"
      contains: "gpt-4o-mini"
    - path: "lib/radar/collectors/jobs.ts"
      provides: "Stagehand config avec OpenAI"
      contains: "gpt-4o-mini"
  key_links:
    - from: "lib/radar/collectors/boamp.ts"
      to: "process.env.OPENAI_API_KEY"
      via: "modelClientOptions.apiKey"
      pattern: "OPENAI_API_KEY"
    - from: "lib/radar/collectors/jobs.ts"
      to: "process.env.OPENAI_API_KEY"
      via: "modelClientOptions.apiKey"
      pattern: "OPENAI_API_KEY"
---

<objective>
Remplacer le modèle Anthropic par OpenAI dans les deux collectors Stagehand (boamp et jobs).

Purpose: Les collectors utilisaient claude-3-5-sonnet avec ANTHROPIC_API_KEY. Le changement passe sur gpt-4o-mini avec OPENAI_API_KEY pour réduire les coûts de scraping Stagehand.
Output: Les deux fichiers collectors mis à jour + note sur la variable d'environnement manquante.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remplacer Anthropic par OpenAI dans les deux collectors Stagehand</name>
  <files>lib/radar/collectors/boamp.ts, lib/radar/collectors/jobs.ts</files>
  <action>
    Dans les deux fichiers, remplacer la configuration Stagehand :

    AVANT :
    ```
    modelName: 'claude-3-5-sonnet-20241022',
    modelClientOptions: { apiKey: process.env.ANTHROPIC_API_KEY! },
    ```

    APRES :
    ```
    modelName: 'gpt-4o-mini',
    modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! },
    ```

    Dans boamp.ts : modification à la ligne ~82-83 dans le bloc `new Stagehand({...})` de `collectPublicMarkets`.
    Dans jobs.ts : modification à la ligne ~17-18 dans le bloc `new Stagehand({...})` de `createStagehand`.

    Ne pas toucher aux autres usages de modèles AI dans boamp.ts (le `createGatewayLanguageModel` pour l'extraction de budget utilise google/gemini-2.5-flash via la gateway — laisser intact).

    Note à laisser en commentaire inline dans les deux fichiers au-dessus de modelName :
    `// Stagehand model — requires OPENAI_API_KEY in env`
  </action>
  <verify>
    <automated>grep -n "modelName\|modelClientOptions\|ANTHROPIC_API_KEY" /Users/mrasoahaingo/Projects/perso/next-esn/lib/radar/collectors/boamp.ts /Users/mrasoahaingo/Projects/perso/next-esn/lib/radar/collectors/jobs.ts</automated>
  </verify>
  <done>
    - Les deux fichiers ont modelName: 'gpt-4o-mini'
    - Les deux fichiers ont modelClientOptions: { apiKey: process.env.OPENAI_API_KEY! }
    - Aucune référence à ANTHROPIC_API_KEY ne subsiste dans ces deux fichiers
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Remplacement Anthropic → OpenAI dans boamp.ts et jobs.ts. OPENAI_API_KEY est absent de .env.local (grep confirme 0 occurrence).
  </what-built>
  <how-to-verify>
    1. Vérifier que OPENAI_API_KEY est bien présent dans votre .env.local :
       `grep OPENAI_API_KEY .env.local`

    2. Si absent, ajouter dans .env.local :
       `OPENAI_API_KEY=sk-...votre-clé...`

    3. Pour tester un collector manuellement (optionnel) :
       S'assurer que BROWSERBASE_API_KEY et BROWSERBASE_PROJECT_ID sont aussi présents dans .env.local, puis déclencher un run radar depuis l'UI.
  </how-to-verify>
  <resume-signal>Tapez "ok" si OPENAI_API_KEY est configuré, ou décrivez le problème rencontré</resume-signal>
</task>

</tasks>

<verification>
grep -n "gpt-4o-mini\|OPENAI_API_KEY" lib/radar/collectors/boamp.ts lib/radar/collectors/jobs.ts
# Attendu : 2 occurrences de gpt-4o-mini (une par fichier), 2 occurrences de OPENAI_API_KEY (une par fichier)
grep -n "ANTHROPIC_API_KEY" lib/radar/collectors/boamp.ts lib/radar/collectors/jobs.ts
# Attendu : 0 occurrences
</verification>

<success_criteria>
- boamp.ts utilise modelName: 'gpt-4o-mini' et process.env.OPENAI_API_KEY
- jobs.ts utilise modelName: 'gpt-4o-mini' et process.env.OPENAI_API_KEY
- Aucune référence à ANTHROPIC_API_KEY dans ces deux collectors
- L'extraction de budget dans boamp.ts (createGatewayLanguageModel) reste inchangée
- OPENAI_API_KEY est présent dans .env.local (validé par le checkpoint)
</success_criteria>

<output>
After completion, create `.planning/quick/260330-iml-remplacer-anthropic-par-openai-dans-les-/260330-iml-SUMMARY.md`
</output>
