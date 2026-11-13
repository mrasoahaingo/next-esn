---
phase: quick
plan: 261113-3qy
subsystem: positioning-analysis
tags: [ai-gateway, decisions-api, shadow-mode, ai-usage-log, workflow, zod, vitest]

requires:
  - phase: quick-260921-jz1
    provides: journalisation ai_usage_log des branches d'analyse dans fetchAndAnalyze
provides:
  - Client HTTP de l'API Decisions de l'AI Gateway (lib/llm/decide.ts)
  - Fonctions pures questions / état / score par décision (lib/services/positioning-decision-score.ts)
  - Orchestration best-effort du mode ombre (lib/services/positioning-decision-shadow.ts)
  - Ligne ai_usage_log positioning.analysis.decisionShadow pour comparer score par décision et matchScore LLM
affects: [positioning-analyze, matching, ai-usage-log, admin-llm]

tech-stack:
  added: []
  patterns:
    - "Appel modèle hors SDK : fetch direct + validation Zod + erreurs typées aux messages sûrs par construction"
    - "Mode ombre : promesse lancée sans await, qui ne rejette jamais, attendue après la persistance"

key-files:
  created:
    - lib/llm/decide.ts
    - lib/llm/decide.test.ts
    - lib/services/positioning-decision-score.ts
    - lib/services/positioning-decision-score.test.ts
    - lib/services/positioning-decision-shadow.ts
    - lib/services/positioning-decision-shadow.test.ts
  modified:
    - lib/llm/constants.ts
    - lib/llm/task-keys.ts
    - lib/pricing.ts
    - workflows/positioning-analyze.ts
    - docs/MATCHING_RULES.md

key-decisions:
  - "Score null quand seuls des éliminatoires ont répondu : un oui/non seul ne fait pas un score sur 100 ; leurs échecs restent journalisés"
  - "Dans la confiance agrégée, chaque éliminatoire pèse la moyenne des poids effectifs des points à échelle (1 s'il n'y en a aucun)"
  - "T-3qy-09 mitigé (amendement) : la ligne ombre est écrite depuis le finally quand l'analyse principale échoue, avec llmMatchScore à null"
  - "Un échec de l'appel de décision lui-même (délai, HTTP, réponse invalide) n'écrit aucune ligne : seulement un console.warn"

requirements-completed: [D1, D2, D3, D4, D5, D6, D7, D8, D9, D10]

duration: 11min
completed: 2026-11-13
---

# Quick 261113-3qy : Mode ombre « score par décision » — Summary

**Score par décision (`openai/gpt-6-luna-decisions`, API Decisions en `fetch` direct) calculé en parallèle des branches de `fetchAndAnalyze` et journalisé dans `ai_usage_log` sous `positioning.analysis.decisionShadow`, sans aucun effet sur `positionings.analysis`, le flux NDJSON ni le `matchScore`.**

## Performance

- **Durée :** 11 min
- **Début :** 2026-11-13T01:59:06Z
- **Fin :** 2026-11-13T02:10:19Z
- **Tâches :** 3 / 3
- **Fichiers :** 11 (6 créés, 5 modifiés)

## Activation

Le mode ombre est **éteint par défaut**. Il s'active avec `POSITIONING_DECISION_SHADOW=1`
(`.env.local` en dev, variables d'environnement Vercel en prod) **et** seulement pour une mission
dotée d'au moins un point clé. Toute autre valeur (`0`, `true`, absente) : aucun appel, aucune ligne.

## Réalisé

- **Client `decide`** : `POST https://ai-gateway.vercel.sh/v1/decisions`, délai de 15 s
  (`AbortSignal.timeout`, envoi et lecture du corps), rétention zéro imposée, réponse validée par
  Zod. `provider_metadata` réduit à `gateway.cost` et `gateway.routing.finalProvider`.
  `DecisionApiError` typée (`missing_api_key`, `http`, `timeout`, `network`, `invalid_response`)
  dont le message ne porte ni le texte libre de l'API, ni le corps de la requête, ni la clé.
- **Fonctions pures** : `buildDecisionQuestions` (noms générés `kp_<i>` / `hc_<j>`, tri par
  `importanceRank`, plafond de 50, lecture défensive du barème brut), `computeDecisionScore`
  (D7), `decisionConfidenceBand`, `buildDecisionStateText` (CV préparé + réponses recruteur).
- **Orchestration** : `runPositioningDecisionShadow` et `logPositioningDecisionShadow`, qui ne
  rejettent jamais ; `console.warn` limité à `positioningId`, nom de l'erreur et, pour un
  `DecisionApiError` seulement, son type, son statut et son message.
- **Workflow** : trois insertions dans `workflows/positioning-analyze.ts` (45 lignes ajoutées,
  0 supprimée) — import, lancement sans `await` juste avant le `try`, journalisation après
  `persisted = true`, et journalisation de repli dans le `finally`.
- **Doc** : `docs/MATCHING_RULES.md` section 5 (ligne ombre) et section 6 (fichiers).

## Commits

| Tâche | Commit | Message |
|-------|--------|---------|
| 1 (RED) | `2bb019a` | test(quick-261113-3qy): tests du client de l'API Decisions |
| 1 (GREEN) | `88060c3` | feat(quick-261113-3qy): client de l'API Decisions, modèle, clé de tâche et tarif |
| 2 (RED) | `888aea9` | test(quick-261113-3qy): tests du score par décision |
| 2 (GREEN) | `8a55af9` | feat(quick-261113-3qy): questions, état et calcul du score par décision |
| 3 (RED) | `e8bbff8` | test(quick-261113-3qy): tests de l'orchestration du mode ombre |
| 3 (GREEN) | `660eec9` | feat(quick-261113-3qy): mode ombre du score par décision dans l'analyse de positionnement |

## Tests

**42 tests ajoutés** (149 → 191, tous au vert) :

| Fichier | Tests | Couvre |
|---------|-------|--------|
| `lib/llm/decide.test.ts` | 12 | D1, D2, D8, D9 — `fetch` simulé, aucun appel réseau |
| `lib/services/positioning-decision-score.test.ts` | 20 | D5 (Q1–Q6 + Q3 bis), D7 (S1–S10), D6 (E1–E3) |
| `lib/services/positioning-decision-shadow.test.ts` | 10 | D3, D4, D8 (O1–O9) + O10 (amendement) |

Chaque RED a été constaté franc (module introuvable) avant l'implémentation ; aucun fichier de
test n'a été modifié après son commit RED.

## Choix de discrétion (D7)

1. **Poids des éliminatoires dans la confiance.** Un éliminatoire n'a pas d'`importanceWeight`.
   Dans la moyenne pondérée de la confiance, chacun reçoit la moyenne des poids effectifs des
   points à échelle exploitables, ou 1 s'il n'y en a aucun : il compte comme un point « moyen »,
   sans écraser ni disparaître derrière les points pondérés.
2. **Score `null` quand seuls des éliminatoires ont répondu.** Sans point à échelle exploitable,
   `uncappedScore` et `decisionScore` valent `null` — un oui/non seul ne fait pas un score sur
   100. Les échecs restent listés dans `hardConstraintFailures`, et la confiance est calculée
   sur les éliminatoires.

Autres règles fixées à l'implémentation : un point à échelle sans `confidence` n'apporte aucun
terme à la confiance ; `hardConstraintFailures[].probability` est la valeur bornée à [0, 1].

## Écarts par rapport au plan

### Amendement de l'orchestrateur (appliqué tel quel)

T-3qy-09 passe de « accept » à « mitigate » : la promesse `decisionShadowRun` est lancée juste
avant le `try` de `fetchAndAnalyze` (et non en première instruction du `try`), un drapeau
`decisionShadowLogged` est posé après la journalisation nominale, et le `finally` écrit la ligne
avec `llmMatchScore: null` / `llmMatchScoreConfidence: null` si l'analyse a échoué avant. Test O10
ajouté ; `docs/MATCHING_RULES.md` dit que la ligne est écrite quand même.

### Ajouts mineurs (robustesse, sans changement de contrat)

1. **`provider_metadata` tolérant** — `.catch(undefined)` sur ce bloc du schéma : purement
   informatif, un changement de forme côté passerelle ne fait pas perdre les réponses
   (`gatewayCostUsd` et `finalProvider` valent alors `null`).
2. **Réponse 200 non JSON → `invalid_response`** — le corps est lu en texte dans le bloc protégé
   par le délai, puis analysé ensuite ; un corps 200 illisible n'est donc pas classé `network`.
3. **Filtre de jetons** — `type` / `code` / `param` de l'erreur API et le nom des erreurs ne sont
   repris que s'ils ressemblent à un identifiant ; sinon ils sont omis (`UnknownError`).
4. **Clé rognée** — une clé composée d'espaces est traitée comme absente.
5. **`buildDecisionQuestions`** accepte `null` / `undefined` ; `keyPointId` vaut `''` pour un point
   brut sans `id` ; `importanceWeight` est borné à [0, 1] à la lecture.

Aucune dépendance ajoutée, aucune migration, aucune modification d'interface. `lib/schema.ts`,
`lib/services/positioning.service.ts`, `lib/ai.ts`, `package.json` et `AGENTS.md` sont inchangés.

## Limites connues

- **Échec de l'appel de décision = aucune ligne.** Si `decide` échoue (délai de 15 s, erreur
  HTTP, réponse invalide), seul un `console.warn` est émis. Un appel interrompu par le délai ou
  dont la réponse est invalide a pu être facturé par la passerelle sans ligne `ai_usage_log`.
  Conforme au plan (O6), mais c'est un reliquat de T-3qy-09 que l'amendement ne couvre pas.
- **Rejeu de l'étape.** `fetchAndAnalyze.maxRetries = 1` : une tentative échouée écrit une ligne
  à `llmMatchScore: null`, la tentative suivante relance l'appel de décision et écrit la sienne.
  Pour comparer les scores, filtrer sur `llmMatchScore` non nul.
- **Erreur retardée.** Interrupteur allumé, si l'analyse échoue très tôt, le `finally` attend la
  fin de l'appel de décision avant de laisser remonter l'erreur : 0,4 à 0,5 s observé, 15 s au
  pire. Le statut `error` et le frame d'erreur NDJSON sont retardés d'autant.
- **T-3qy-08 (accepté).** Le texte du CV part tel quel dans l'état : une injection ne peut
  affecter que le score ombre, jamais ce qui est affiché ou persisté.

## Non vérifié

- **Compilation du bundle workflow** (`@workflow/next`) : `pnpm build` est interdit (son
  `postbuild` exécute les migrations). Seuls `tsc`, `eslint`, `vitest` et le contrôle d'ordre
  statique ont été passés.
- **Bout en bout contre la vraie API** : aucun appel réseau réel, par consigne. Le contrat est
  celui du CONTEXT ; l'orchestrateur fait cette vérification.
- **Intégration dans `fetchAndAnalyze`** : aucun test automatisé n'exécute l'étape (pas de
  banc de test pour les fichiers `workflows/`). Les garanties « ne retarde pas la persistance »
  et « ne masque pas l'erreur d'origine » reposent sur la lecture du code, le contrôle d'ordre et
  les tests O4 à O10 des deux fonctions appelées.

## Menaces

Aucune surface nouvelle hors du `<threat_model>` du plan : le seul point de sortie ajouté est
`/v1/decisions` (T-3qy-01 à T-3qy-07, mitigations en place et testées).

## Vérifications finales

- `npx vitest run` : 21 fichiers, 191 tests au vert.
- `npx tsc --noEmit` : propre.
- `npx eslint` sur les 10 fichiers TypeScript de la tâche : propre.
- `git diff 1a1ec0e HEAD --numstat -- workflows/positioning-analyze.ts` : `45 0` (ajouts seuls).
- Contrôle d'ordre du plan : lancement < premier `await Promise.all([` < `persisted = true` <
  premier `await logPositioningDecisionShadow(`.
- Fichiers commités : uniquement les 11 de la tâche.

## Self-Check: PASSED

- Les 6 fichiers créés et le présent résumé existent sur disque.
- Les 6 commits (`2bb019a`, `88060c3`, `888aea9`, `8a55af9`, `e8bbff8`, `660eec9`) existent.
- Aucun motif de bouchon (`TODO`, `FIXME`, texte provisoire) dans les trois modules créés.
- `STATE.md`, `ROADMAP.md` et les artefacts de planification ne sont ni modifiés ni commités :
  ils reviennent à l'orchestrateur.

## Vérification de l'orchestrateur (2026-11-13)

Faite après le retour de l'exécutant, contre la vraie API Decisions, avec un CV et un barème
entièrement fictifs et un client Supabase factice (aucune écriture en base).

- **Bout en bout réel** (`runPositioningDecisionShadow` puis `logPositioningDecisionShadow`) :
  5 à 6 questions, 0,3 à 0,6 s, environ 1 700 à 1 900 tokens, 0,0002 $ par appel.
  Score recalculé à la main et conforme (0,4 × 0,615 + 0,3 × 0,56 + 0,2 × 0,06 + 0,1 × 0,98 → 52).
  Éliminatoire non établi → plafond à 39, `uncappedScore` conservé.
- **Ligne `ai_usage_log`** : 13 clés dans `output_payload`, ni nom du candidat ni clé d'API dans
  les payloads.
- **Chemins d'erreur réels** : modèle inexistant → `DecisionApiError` `http` 404 au message sûr ;
  clé absente → `null` avec un `console.warn` ; interrupteur éteint → `null` sans appel.
- **Bundle workflow** : le serveur de dev en cours (`next-esn-dev`) a régénéré
  `app/.well-known/workflow/v1/step/route.js` avec le code ombre (lancement, appel nominal, appel
  du `finally`). `pnpm build` n'a pas été lancé.
- **Correctif `eac1be6`** : l'état envoyé commence désormais par la date de référence. Sans elle,
  un poste en cours n'a pas de durée évaluable ; sur le CV fictif, « React confirmé 3+ ans » passe
  de 1,35 à 1,60 sur 2 en appel isolé. Suite complète : 192 tests au vert, `tsc` et `eslint` propres.

### Non vérifié

- Aucune exécution réelle de l'étape `fetchAndAnalyze` avec l'interrupteur allumé (il faut une
  analyse de positionnement lancée depuis l'application avec `POSITIONING_DECISION_SHADOW=1`).
- Aucune écriture réelle dans `ai_usage_log`.

### À savoir pour la comparaison

- Sur le CV fictif, le modèle reste hésitant sur un critère pourtant bien couvert (React : 1,44
  sur 2, confiance 0,16). La formulation des questions est à ajuster à partir des données réelles
  avant d'envisager de remplacer le score affiché.
- Pour comparer, filtrer les lignes où `output_payload.llmMatchScore` n'est pas `null`
  (une tentative d'étape échouée écrit une ligne sans score LLM).
