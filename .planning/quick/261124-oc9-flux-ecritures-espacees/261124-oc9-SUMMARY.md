---
phase: quick
plan: 261124-oc9
subsystem: workflows / streaming
tags: [workflow, streaming, ndjson, performance, throttle]
requires: []
provides:
  - lib/workflow/throttled-emitter.ts (createCoalescingEmitter)
affects:
  - workflows/positioning-analyze.ts
  - workflows/positioning-generate.ts
  - workflows/extract-cv.ts
  - workflows/analyze-job-posting.ts
tech-stack:
  added: []
  patterns:
    - "Émetteur coalescent : request() par partiel, flush() en fin de branche, close() avant releaseLock()"
key-files:
  created:
    - lib/workflow/throttled-emitter.ts
    - lib/workflow/throttled-emitter.test.ts
  modified:
    - workflows/positioning-analyze.ts
    - workflows/positioning-generate.ts
    - workflows/extract-cv.ts
    - workflows/analyze-job-posting.ts
decisions:
  - "Écritures du flux de workflow espacées à 300 ms max par run (émetteur partagé entre branches), flush() garanti en fin de branche : la cadence d'écriture ne dépend plus de la granularité des partiels du modèle"
  - "Une émission immédiate démarre de façon synchrone (instantané pris dans le verrou de l'appelant) ; une émission différée prend l'état au moment où elle part"
metrics:
  completed: 2026-11-24
  tasks: 2
  files: 6
---

# Quick 261124-oc9 : émissions de flux espacées — Summary

Les quatre workflows de streaming n'écrivent plus une ligne NDJSON par partiel du modèle : un émetteur
coalescent par run limite les écritures à une par fenêtre de 300 ms et garantit l'état complet par un
`flush()` en fin de branche. Une branche de 646 partiels en 8 s (mesure `gpt-6-luna`) produit désormais
**28 écritures** (27 en cours de flux + le flush final) au lieu de 646.

## Ce qui a été fait

### Task 1 — émetteur coalescent (TDD)
- `createCoalescingEmitter({ emit, intervalMs = 300, now?, schedule? })` → `{ request, flush, close }`.
  - `request()` : émission immédiate si aucune en cours et la précédente a démarré il y a ≥ `intervalMs`,
    sinon une seule émission différée à l'échéance (jamais deux en attente).
  - `flush()` : annule la différée, attend l'émission en cours, émet l'état courant.
  - `close()` : annule la différée, `request`/`flush` deviennent sans effet (writer libéré).
  - Émissions sérialisées (aucun chevauchement) ; erreur immédiate → rejet de l'appelant ; erreur
    différée → remontée au `request()` ou au `flush()` suivant, une seule fois. Jamais avalée.
- 15 tests vitest (horloge simulée) : 600 demandes / 7,8 s → ≤ 28 émissions et > 10 (progressif), cas
  646 partiels / 8 s, regroupement dans la fenêtre, état final au flush, rien après flush, pas de
  chevauchement sur écriture lente, ordre flush/différée en cours, propagation d'erreurs, `close()`,
  horloge et ordonnanceur injectés.

### Task 2 — branchement dans les workflows
- `positioning-analyze` (4 branches + synthèse), `positioning-generate` (5 branches + CV adapté finalisé),
  `extract-cv` (4 branches), `analyze-job-posting` (2 branches) : la fusion du partiel reste faite sous
  le verrou à chaque itération, `emit()` remplacé par `emitter.request()` ; `emitter.flush()` à la fin de
  chaque branche (retrait des actives) et pour le dernier frame du CV adapté (`finalizeTailoredCv`) ;
  `emitter.close()` dans le `finally` avant `writer.releaseLock()`.
- `analyze-job-posting` : `emitter.close()` juste avant la ligne terminale `finalizing` (rien ne peut
  s'intercaler après elle).
- `extract-cv` / transcription PDF : le seuil « 96 caractères ou 320 ms » (qui écrivait presque à chaque
  delta sur un flux rapide) est remplacé par le même émetteur, avec flush du compteur final.
- Format `{ index, data, meta }`, index séquentiel (incrémenté dans `emit`, émissions sérialisées), `meta`
  et ordre des écritures terminales inchangés ; une ligne = un objet JSON. Timeouts de branche inchangés.

## Vérification
- `vitest run` : 28 fichiers, 233 tests verts.
- `tsc --noEmit` : OK.
- `eslint` sur les fichiers touchés : 0 erreur (1 warning préexistant : `logAiUsage` inutilisé dans `extract-cv.ts`).
- `next build --webpack` : OK.
- À faire après déploiement (orchestrateur) : durées `ai_usage_log` des branches `positioning.analysis.*` et
  `positioning.generate.tailoredCv` sur le même positionnement (avant : 150–380 s et 190 s).

## Commits
- `dd7ff3b` test(261124-oc9): tests en échec pour l'émetteur coalescent du flux
- `7cdaf0b` feat(261124-oc9): émetteur coalescent pour les écritures du flux de workflow
- `5e137ca` perf(261124-oc9): écritures espacées dans les flux des workflows de streaming

## Deviations from Plan

1. **[Rule 1 - Bug] Émission « immédiate » différée d'une microtâche** — trouvé pendant le GREEN de la
   Task 1 : la première version enchaînait toujours sur la file (`chain.then`), si bien que l'instantané
   était pris après le retour de `request()` et pouvait voir un état modifié entre-temps. Corrigé : file
   vide → `emit()` démarre de façon synchrone. Commit `7cdaf0b`.
2. **`close()` ajouté à l'API** (non prévu au plan) — nécessaire pour qu'aucune émission différée ne
   parte après `writer.releaseLock()` (chemin d'erreur où une branche échoue pendant que d'autres
   streament encore) ni après la ligne terminale de l'analyse de fiche.
3. **`lib/services/job-posting-text-extract.service.ts` non modifié** — sa boucle `textStream` ne fait
   qu'accumuler le texte, sans aucune écriture par delta : rien à espacer.
4. **Chemins d'erreur** : aucun chemin d'erreur n'émettait d'état hors des fins de branche (le timeout
   d'une branche d'extraction de CV passe par la fin de branche, donc par `flush()`). Aucun test existant
   ne comptait les émissions.

## Notes de comportement
- Lignes en plus possibles par rapport au strict minimum : un `flush()` par fin de branche (état complet
  garanti) et, pour la transcription, un premier compteur immédiat juste après la ligne `transcriptionChars: 0`
  ainsi qu'un compteur final. Le client (reprise par comptage de lignes dans
  `lib/workflow/follow-workflow-run.ts`) n'est pas affecté : une ligne reste un objet complet indexé.

## Self-Check: PASSED
- FOUND: lib/workflow/throttled-emitter.ts, lib/workflow/throttled-emitter.test.ts
- FOUND: dd7ff3b, 7cdaf0b, 5e137ca
