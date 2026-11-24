---
phase: quick-261124-nhq
plan: 01
subsystem: ai-gateway, cv-pdf, positioning-generate, cv-extraction
tags: [gpt-6-luna, reasoningEffort, pdf, logo, sanitize, yearsOfExperience]
requires: []
provides:
  - "reasoningEffort 'low' par défaut sur les modèles OpenAI de raisonnement (garde-fou lib/ai.ts)"
  - "logo Esneo par défaut rastérisé en PNG pour le PDF"
  - "sanitizeExtractedCv (null-like, markdown des compétences)"
  - "durée d'expérience au mois près, source de vérité unique"
affects:
  - lib/ai.ts
  - lib/utils/prepare-template-for-pdf.ts
  - templates/cv-dossier-layout.ts
  - workflows/extract-cv.ts
  - workflows/positioning-generate.ts
  - lib/stores/positioning.store.ts
  - lib/stores/cv-builder.store.ts
tech-stack:
  added: []
  patterns:
    - "défauts providerOptions posés avant les options de l'appelant (surchargeables)"
    - "normalisation déterministe des sorties LLM à 3 niveaux : prompt, écriture, lecture"
key-files:
  created:
    - lib/utils/esneo-wordmark-svg.ts
    - lib/utils/cv-sanitize.ts
    - lib/utils/cv-sanitize.test.ts
    - lib/utils/prepare-template-for-pdf.test.ts
    - lib/services/positioning.service.test.ts
    - templates/cv-dossier-layout.test.ts
  modified:
    - lib/ai.ts
    - lib/ai.test.ts
    - lib/schema.ts
    - lib/services/pdf.service.ts
    - lib/services/positioning.service.ts
    - lib/stores/cv-builder.store.ts
    - lib/stores/positioning.store.ts
    - lib/utils/cv-date-years.ts
    - lib/utils/cv-experience-time.ts
    - lib/utils/cv-experience-time.test.ts
    - lib/utils/prepare-template-for-pdf.ts
    - templates/cv-dossier-layout.ts
    - workflows/extract-cv.ts
    - workflows/positioning-generate.ts
decisions:
  - "reasoningEffort 'low' injecté par le garde-fou pour tous les modèles OpenAI de raisonnement, surchargeable par l'appelant"
  - "Années d'expérience : la valeur calculée par formatTotalExperienceYears (mois près, arrondi inférieur) est la source de vérité ; le LLM doit la reprendre telle quelle"
  - "Règles de sortie imposées côté code (message utilisateur de génération) : aucune migration de prompt"
metrics:
  duration: "~9 min"
  completed: 2026-11-24
  tasks: 3
  files: 20
---

# Quick 261124-nhq : raisonnement low par défaut, défauts du CV adapté, logo PDF — Summary

Garde-fou Gateway qui pose `reasoningEffort: 'low'` par défaut sur gpt-6-luna, normaliseur déterministe du CV (plus de « null » ni de `**` dans les compétences) branché au prompt, à l'écriture et au rendu, durée d'expérience calculée au mois près et imposée au CV adapté, et logo Esneo par défaut rastérisé en PNG pour le PDF.

**Aucune migration de données ni de prompt requise.**

## Causes racines

- **Logo PDF (ENOENT)** : `templates/cv-dossier-layout.ts` utilisait en repli `pathToFileURL(public/esneo-full.svg).href`. `@react-pdf/image` fait `path.resolve(src)` sur la chaîne brute, ce qui donne `/var/task/file:/var/task/public/esneo-full.svg`, d'où l'ENOENT. Deuxième problème, caché par le premier : react-pdf n'accepte que JPEG/PNG, donc un SVG aurait échoué de toute façon. En plus, `generateCvPdf` ne préparait le gabarit que si `templateConfig` était défini.
- **A — « null » affiché** : depuis `strictJsonSchema: false`, gpt-6-luna émet `null` ou la chaîne `"null"` pour les champs optionnels absents. `extractionSchema.safeParse` échouait (`phone: null`) et le `acc` brut était persisté sans `prepareCvForMatchingPrompt`. Ce CV était ensuite sérialisé dans le prompt de génération, et le modèle recopiait `"null"` dans le CV adapté.
- **B — `**` dans les compétences** : le schéma et le prompt identity demandent du gras dans `summary`. Rien n'interdisait le markdown dans `skills.*.name` ni dans `experiences[].skills`, le modèle a donc généralisé. Rien ne nettoyait non plus à l'écriture ni au rendu.
- **C — années incohérentes** : `formatTotalExperienceYears` travaillait à l'année (début en janvier, fin en décembre) avec un `Math.round`, ce qui surestimait la durée (« Sept 2019 – présent » au 11/2026 donnait 8 ans). Le tableau du PDF affiche ce champ, alors que le résumé LLM citait une autre valeur.

## Ce qui a été fait

### Task 1 — raisonnement + logo
- `lib/ai.ts` : `applyOpenAiDefaults(params, { reasoning })` pose `strictJsonSchema: false` et, pour les modèles de raisonnement, `reasoningEffort: DEFAULT_OPENAI_REASONING_EFFORT` (`'low'`). Ces défauts passent avant les options de l'appelant. `relaxOpenAiStrictJsonSchema` délègue à cette fonction. ZDR et UE restent inchangés (`applyGatewayCompliance` reste appliqué en premier).
- `lib/utils/esneo-wordmark-svg.ts` construit le SVG en mémoire depuis `PATH_D`, avec un fill `#ffffff` explicite.
- `prepareTemplateConfigForPdf` rastérise ce logo par défaut quand le gabarit n'a ni url ni svgInline. Si sharp échoue, il émet un `console.warn` et le PDF sort sans logo.
- `generateCvPdf` prépare désormais toujours le gabarit. Le layout ne crée plus de `header-logo` quand la src est vide, et ne contient plus de `node:path` ni de `node:url`.
- Vérifié à la main : un PDF généré sans gabarit sort sans erreur, et le PNG du logo est lisible (blanc sur fond primaire).

### Task 2 — A et B
- `lib/utils/cv-sanitize.ts` fournit `isNullLikeText`, `stripSkillMarkdown` et `sanitizeExtractedCv`. Le normaliseur est pur, idempotent et n'ajoute jamais de clé.
- Côté prompt :
  - des `describe()` dans le schéma ;
  - un bloc « ## Règles de sortie (CV adapté et emails) » ajouté au message de génération ;
  - `prepareCvForMatchingPrompt` nettoie d'abord le CV source.
- Côté écriture :
  - l'extraction normalise avant `safeParse` ;
  - la génération normalise `acc.tailoredCv` dans `finalizeTailoredCv()`, puis émet un dernier frame.
- Côté lecture : `buildCvDossierLayoutSpec`, `setTailoredCv` et `setCvData` normalisent. L'autosave existant réécrit ensuite la version propre en base.

### Task 3 — C
- `extractYearMonthFromDateString` / `extractYearMonthsFromDateString` lisent ces formats :
  - `MM/YYYY`, `MM-YYYY`, `YYYY-MM`, `YYYY/MM` ;
  - les noms de mois FR et EN, complets ou abrégés, avec ou sans accents.
- `formatTotalExperienceYears` compte au mois près quand le mois est connu et arrondit à l'année inférieure, avec « 1 an » / « 1 year » au singulier.
- `computeReferenceYearsOfExperience` renvoie la valeur calculée, ou `undefined`. Elle ne renvoie jamais la valeur écrite par le LLM.
- La règle de sortie cite la valeur exacte (« **7 ans** », `"7 ans"`).
- `finalizeTailoredCv()` écrase `tailoredCv.personalInfo.yearsOfExperience` avec cette valeur, et le prompt utilise le même `referenceDate`.

## Choix de la source de vérité (années)

La valeur calculée par `formatTotalExperienceYears` fait foi. Elle est déterministe et déjà utilisée à l'extraction et dans les prompts d'analyse. Le champ `personalInfo.yearsOfExperience` du CV adapté en est dérivé à l'écriture, et le LLM doit la reprendre telle quelle dans le résumé et les emails. Le résumé n'est pas réécrit par regex : « 3 ans d'expérience en React » est une phrase légitime. La valeur n'est pas non plus forcée au rendu ni dans l'éditeur, pour qu'une correction manuelle du recruteur reste prioritaire.

## Deviations from Plan

### Auto-fixed / ajustements

1. **[Rule 2] Normaliseur un peu plus large que la liste du plan** : il retire aussi les puces `description` null-like, supprime `spacingAfter`, `language`, `strengths`, `sectionSpacing` et `experiences[].skills` quand ils valent `null`, et retire une paire de backticks qui encadre un nom de compétence. Sans cela, ces mêmes sorties non strictes feraient encore échouer `safeParse` ou afficheraient « null ». Commit 34c768f.
2. **Signature de `buildGenerateOutputRulesBlock`** : `({ yearsOfExperience?: string } = {})` au lieu de `({ cvPrepared, yearsOfExperience })`. `cvPrepared` n'était pas utilisé par le bloc, et le paramètre inutile aurait déclenché `no-unused-vars`. Commits 34c768f et e1abc6c.
3. **Description `availability`** : le texte « omettre si absent » est fusionné dans le describe existant. Un second `.describe()` aurait écrasé le premier.
4. **Fin d'une expérience sans `endDate` et non en cours** : le comportement d'origine est conservé (décembre de l'année de début), pour ne pas raccourcir des périodes historiques.
5. **Outillage** : `npx vitest` est réécrit vers pnpm par le hook rtk et échoue (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). Les binaires ont donc été lancés directement (`./node_modules/.bin/vitest|tsc|eslint|next`).

## Hors périmètre (signalé, non traité)

- **Résumé du CV CANDIDAT** : la branche d'extraction identity tourne en parallèle de la branche experiences et n'a donc pas accès à la valeur calculée. Ce résumé peut encore citer une durée différente de `yearsOfExperience`.
- **Changement de valeur affichée** : avec le calcul au mois près et l'arrondi inférieur, la durée affichée change pour les prochaines extractions et générations (souvent un an de moins). Les CV déjà en base gardent leur valeur tant qu'ils ne sont pas régénérés ou réextraits.
- **Langue de la durée** : `yearsOfExperience` du CV adapté suit la langue du CV source (« ans » / « years »), même si le CV adapté était produit dans l'autre langue.
- **Avertissement eslint préexistant** : `workflows/extract-cv.ts` importe `logAiUsage` sans l'utiliser. La ligne n'a pas été touchée.

## Vérifications

- `vitest run` (suite complète) : 22 fichiers, 181 tests, tous verts.
- `tsc --noEmit` : 0 erreur.
- `eslint` sur tous les fichiers touchés : 0 erreur, 1 warning préexistant (voir plus haut).
- `next build --webpack` : succès, sans warning.
- `grep pathToFileURL templates lib` : aucun résultat. Aucun `.env*`, `node_modules` ni SQL dans le diff.

## Contrôles à faire en prod après déploiement

1. **Latence** : comparer `ai_usage_log.duration_ms` avant et après pour les branches d'analyse (surtout skills, ≈ 305 s avant) et pour la branche tailoredCv de la génération (≈ 188 s avant). On attend une nette baisse et plus aucun run au-delà de 300 s.
2. **Logo PDF** : exporter un PDF de positionnement et un aperçu avec un gabarit sans logo. Le logo Esneo blanc doit apparaître dans le bandeau, et les logs Vercel ne doivent plus montrer d'ENOENT `file:`.
3. **CV adapté** : régénérer un positionnement dont le candidat n'a pas de téléphone ou d'email. Vérifier :
   - qu'aucun « null » n'apparaît dans l'éditeur ni dans le PDF ;
   - que les compétences n'ont pas de `**` ;
   - que la durée du tableau est identique à celle du résumé et des emails.
4. **Extraction** : réextraire un CV et vérifier dans les logs l'absence de « Extraction schema validation warning » sur un champ optionnel `null`.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 RED | 30bca17 | test(quick-261124-nhq): tests en échec pour reasoningEffort low par défaut et logo PDF |
| 1 GREEN | 6a1c6c2 | feat(quick-261124-nhq): raisonnement low par défaut et logo PDF rastérisé |
| 2 RED | 71550d2 | test(quick-261124-nhq): tests en échec pour le normaliseur de CV (null, markdown des compétences) |
| 2 GREEN | 34c768f | fix(quick-261124-nhq): plus de « null » ni de markdown dans les compétences du CV |
| 3 RED | 6367807 | test(quick-261124-nhq): tests en échec pour la durée d'expérience au mois près |
| 3 GREEN | e1abc6c | fix(quick-261124-nhq): une seule source de vérité pour les années d'expérience |

## TDD Gate Compliance

Les trois tâches ont chacune un commit `test(...)` qui échoue, suivi d'un commit `feat`/`fix` qui le fait passer.

## Self-Check: PASSED

- Les fichiers créés existent : esneo-wordmark-svg.ts, cv-sanitize.ts, cv-sanitize.test.ts, prepare-template-for-pdf.test.ts, positioning.service.test.ts, cv-dossier-layout.test.ts.
- Les commits 30bca17, 6a1c6c2, 71550d2, 34c768f, 6367807 et e1abc6c sont présents sur `luna-low-defauts-cv`.
