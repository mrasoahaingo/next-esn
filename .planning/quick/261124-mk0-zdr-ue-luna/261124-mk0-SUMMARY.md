---
phase: quick-261124-mk0
plan: 01
subsystem: llm
tags: [ai-gateway, zdr, rgpd, inference-ue, openai, gpt-6-luna, migration]
requires: []
provides:
  - "Garde-fou central ZDR + inférence UE (lib/ai.ts) sur tous les appels LLM"
  - "Verrou ESLint no-restricted-imports + test de scan lib/ai-guard.test.ts"
  - "Modèle par défaut openai/gpt-6-luna (code + migration)"
  - "Tarifs zone UE luna et luna-decisions"
affects: [workflows/extract-cv.ts, workflows/positioning-analyze.ts, workflows/positioning-generate.ts, workflows/analyze-job-posting.ts, lib/services/job-posting-text-extract.service.ts, app/api/missions/[id]/key-points/[pointId]/explain/route.ts]
tech-stack:
  added: []
  patterns:
    - "Middleware LanguageModel le plus interne pour imposer des providerOptions non surchargeables"
    - "Verrou d'import double : ESLint + test de scan vitest"
key-files:
  created:
    - lib/ai.test.ts
    - lib/ai-guard.test.ts
    - lib/pricing.test.ts
    - lib/llm/gpt6-luna-migration.test.ts
    - supabase/migrations/20261124162405_llm_models_gpt6_luna.sql
  modified:
    - lib/ai.ts
    - eslint.config.mjs
    - lib/llm/constants.ts
    - lib/pricing.ts
    - workflows/extract-cv.ts
    - AGENTS.md
    - DESIGN.md
    - components/landing/landing.tsx
    - components/landing/landing-faq.tsx
    - components/admin/llm-settings-tabs.tsx
    - components/ai/ai-generation-info.tsx
    - lib/types/positioning-analysis-models.ts
decisions:
  - "ZDR + inférence UE imposés par un middleware le plus interne, sans repli : l'appel échoue si le Gateway ne peut pas les honorer"
  - "reasoningEffort 'low' pour l'extraction : le catalogue Gateway ne liste pas 'minimal' pour gpt-6-luna, test de fumée non exécuté"
  - "temperature/topP retirés par le garde-fou pour openai/(o*, gpt-5..9) hors -chat"
  - "maxTokens laissé tel quel (ignoré par ai 6), pas renommé en maxOutputTokens"
  - "Tarif openai/gpt-6-luna-decisions pris dans le catalogue public du Gateway (zone UE : 0,11 entrée, 0 sortie, 0,011 cache)"
metrics:
  duration: "~12 min"
  completed: 2026-11-24
  tasks: 3
  files: 17
---

# Quick 261124-mk0 : ZDR forcé + inférence UE + passage à openai/gpt-6-luna

Tous les appels LLM passent par un middleware placé au plus près de `gateway(id)`. Il impose `providerOptions.gateway.zeroDataRetention = true` et `inferenceRegion = { scope: 'zone', geoRegion: 'eu' }`, sans qu'un appelant puisse les changer. Un verrou ESLint et un test de scan statique bloquent tout autre chemin vers le Gateway. Toutes les tâches passent sur `openai/gpt-6-luna` : code, tarifs et migration idempotente (vérifiée deux fois sur un Postgres 17 jetable).

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 (RED) | 7330e3e | test(quick-261124-mk0): tests du garde-fou ZDR/UE |
| 1 (GREEN) | 1cdbc3c | feat(quick-261124-mk0): garde-fou ZDR + inférence UE sur tous les appels LLM |
| 2 (RED) | 0121977 | test(quick-261124-mk0): tests du modèle openai/gpt-6-luna et de ses tarifs |
| 2 (GREEN) | a7839fc | feat(quick-261124-mk0): modèle par défaut openai/gpt-6-luna et tarifs zone UE |
| 3 | 68a65a9 | feat(quick-261124-mk0): migration llm vers openai/gpt-6-luna et docs ZDR/UE |

## Ce qui a été fait

### Tâche 1 : garde-fou (lib/ai.ts)
- `GATEWAY_COMPLIANCE_OPTIONS` (gelé en profondeur), `applyGatewayCompliance` (pure : les clés de conformité sont étalées en dernier, avec une copie fraîche de la région), `isOpenAiReasoningGatewayModel`, `createGatewayGuardMiddleware`, `guardLanguageModel`, type `GatewayCallParams`.
- `createGatewayLanguageModel`, `model` et `extractionModel` passent tous par `guardLanguageModel`. Plus aucun chemin du module ne renvoie `gateway(...)` sans garde-fou. Les signatures publiques sont inchangées et aucun site d'appel n'a été modifié.
- `eslint.config.mjs` : nouvel objet de config `gatewayGuardRule` (`no-restricted-imports` : `createGateway`/`gateway` de `ai`, `@ai-sdk/*` sauf `@ai-sdk/react`), distinct de `supabaseWriteResultRule`.
- Contrôle négatif : un fichier sonde `lib/__guard_probe.ts` (`import { gateway } from 'ai'` + `@ai-sdk/openai` + `@ai-sdk/react`) donne 2 erreurs `no-restricted-imports` (gateway et @ai-sdk/openai), `@ai-sdk/react` reste autorisé. La sonde a été supprimée et n'a pas été committée.
- `eslint .` sur tout le dépôt : 0 violation `no-restricted-imports`.

### Tâche 2 : modèle et tarifs
- `modelName` = `DEFAULT_GATEWAY_MODEL_ID` = `openai/gpt-6-luna` (`usageModelIds` suit).
- `llmExtractionSettings.providerOptions` = `{ openai: { reasoningEffort: 'low' } }` (plus d'option Gemini).
- `lib/pricing.ts` : `openai/gpt-6-luna` 0,11 / 0,55 / 0,011 et `openai/gpt-6-luna-decisions` 0,11 / 0 / 0,011 (zone UE, catalogue public `https://ai-gateway.vercel.sh/v1/models/openai/<id>/endpoints`, consulté le 2026-11-24). `google/gemini-2.5-flash` est conservé pour l'historique de `ai_usage_log`.
- `workflows/extract-cv.ts` : seul le commentaire du timeout de la branche experiences change (plus de mention de Gemini).

### Tâche 3 : migration, test de contrat, docs
- Migration : **`supabase/migrations/20261124162405_llm_models_gpt6_luna.sql`** (INSERT … ON CONFLICT DO NOTHING, UPDATE llm_tasks et UPDATE llm_task_org_overrides avec IS DISTINCT FROM ; aucun DELETE/DROP, prompts intacts).
- Test de contrat : `lib/llm/gpt6-luna-migration.test.ts`.

## Option de raisonnement retenue

**`reasoningEffort: 'low'`** pour l'extraction (transcription PDF + 4 branches d'extraction CV).
- Pas de test de fumée réel : `AI_GATEWAY_API_KEY` n'est pas exporté dans le shell et `.env.local` n'a pas été lu (politique).
- Le catalogue public du Gateway indique `reasoning.supported_efforts = ["none","low","medium","high","xhigh","max"]` pour `openai/gpt-6-luna` : `minimal` n'y figure **pas**. Le plan ne prévoyait de passer à `minimal` que sur preuve : on reste donc à `low`.
- `none` est listé par le catalogue et serait le plus rapide pour une copie structurée. Ce n'est pas appliqué (hors plan, non testé). Piste à tester avec une vraie clé.
- Les autres tâches (analyse et génération de positionnement, analyse de mission, explication de point clé, extraction de texte de fiche de poste) ne passent pas de `reasoningEffort` : l'effort par défaut du fournisseur s'applique (medium d'après la doc du provider OpenAI). **Latence à surveiller** sur ces workflows.

## Retrait de temperature/topP
Le garde-fou met `temperature` et `topP` à `undefined` pour les modèles qui correspondent à `/^openai\/(o\d|gpt-[5-9])/` sans `-chat`, et les conserve pour les autres (par exemple un override admin vers un modèle non-raisonnement). Raison : `@ai-sdk/openai` 3.0.41 ne reconnaît pas `gpt-6-luna` comme modèle de raisonnement, et l'API OpenAI refuse une temperature non par défaut sur ces modèles. NB : le catalogue liste `temperature` parmi les paramètres acceptés de luna, donc ce retrait est peut-être trop prudent, mais il est sans risque.

## maxTokens
`maxTokens: 8192` dans `llmFactualGenerationSettings` / `llmExtractionSettings` n'est pas un paramètre d'ai 6 (seul `maxOutputTokens` existe) : il est **ignoré**, aujourd'hui comme avant. Il n'a pas été renommé, volontairement : sur un modèle de raisonnement, `maxOutputTokens` compte aussi les tokens de raisonnement et tronquerait les JSON longs. C'est documenté dans le JSDoc.

## Copie de la landing modifiée (à relire)

Seule la mention factuelle du modèle et du fournisseur change ; balises et composants sont identiques.

**components/landing/landing.tsx** (fait « Le chemin vers l'IA »)
- Avant : `Pour l’extraction, l’analyse et la rédaction, le CV est envoyé à Gemini 2.5 Flash (Google), via la passerelle de Vercel. C’est le modèle par défaut ; Esneo le règle tâche par tâche.`
- Après : `Pour l’extraction, l’analyse et la rédaction, le CV est envoyé à GPT-6 Luna (OpenAI), via la passerelle de Vercel, avec inférence en Europe et sans conservation des données par le fournisseur. C’est le modèle par défaut ; Esneo le règle tâche par tâche.`
- Commentaire des faits vérifiés : `lib/ai.ts:3 (passerelle de Vercel), lib/llm/constants.ts:2 (Gemini 2.5 Flash) ;` devient `lib/ai.ts (passerelle de Vercel, garde-fou ZDR + inférence UE sur chaque appel), lib/llm/constants.ts:2 (GPT-6 Luna) ;`

**components/landing/landing-faq.tsx** (question « Où vont les CV de nos candidats et consultants ? »)
- Avant : `… Pour l’extraction, l’analyse et la rédaction, le CV est envoyé à Gemini 2.5 Flash (Google), via la passerelle de Vercel ; c’est le modèle par défaut, qu’Esneo règle tâche par tâche. …`
- Après : `… Pour l’extraction, l’analyse et la rédaction, le CV est envoyé à GPT-6 Luna (OpenAI), via la passerelle de Vercel, avec inférence en Europe et sans conservation des données par le fournisseur ; c’est le modèle par défaut, qu’Esneo règle tâche par tâche. …`
- Commentaire : `envoi à Gemini via la passerelle de Vercel,` devient `envoi à GPT-6 Luna via la passerelle de Vercel (inférence UE, sans conservation : lib/ai.ts),`

Remarque : « Esneo le règle tâche par tâche » reste vrai, et la promesse « Europe + sans conservation » tient même si un admin change de modèle, puisque le garde-fou s'applique à tous les modèles. En revanche, le nom du modèle affiché sur la landing deviendrait faux.

Autres textes : AGENTS.md (variables d'env, Stack, et une phrase ajoutée sous « AI model config » qui décrit le garde-fou et le verrou), DESIGN.md l.250 (`Gemini 2.5 Flash via la passerelle de Vercel,` devient `GPT-6 Luna via la passerelle de Vercel (inférence UE, sans conservation),`), placeholder de l'admin LLM et deux exemples en commentaire : `openai/gpt-6-luna`.
`grep -rni gemini app lib workflows components AGENTS.md DESIGN.md` : il ne reste que `lib/pricing.ts` (tarif historique), hors tests.

## Vérifications

| Contrôle | Résultat |
|---|---|
| `vitest run` (suite complète) | 18 fichiers, 147 tests verts |
| `tsc --noEmit` | propre |
| `eslint` sur les fichiers touchés | 0 erreur (2 avertissements existants : `logAiUsage` inutilisé dans extract-cv.ts, `orgId` dans lib/queries/templates.ts) |
| `eslint .` sur tout le dépôt | 0 violation de la nouvelle règle ; 398 erreurs existantes, toutes dans `.claude/`, `.cursor/` et 1 dans `app/positions` (hors périmètre) |
| `next build` (Turbopack) | **échec environnemental** : « Symlink node_modules is invalid, it points out of the filesystem root » (le `node_modules` du worktree est un lien symbolique vers le dépôt principal) |
| `next build --webpack` | **vert** (compilation, TypeScript, 41 pages) |
| `grep -rn "gateway(" app lib workflows components` hors lib/ai.ts | aucun résultat |
| Test de fumée réel | **non exécuté** (pas de `AI_GATEWAY_API_KEY` dans l'environnement) |

### Recette Postgres 17 jetable (Docker `zdr-mk0-pg`, port 55432, supprimé ensuite)
- Prélude : rôles `anon`/`authenticated`/`service_role`, stub `ai_usage_log(id)`. **Stubs ajoutés** : `missions(id, job_analysis jsonb)` (COMMENT ON COLUMN dans `20260401101900_refacto_llm_prompts.sql`) et `positionings(id)` (ALTER dans `…103400` / `…103700`).
- Les 17 migrations llm existantes ont été rejouées dans l'ordre sans erreur.
- État de départ : 18 tâches sur gemini et 1 sur `foo/bar` ; overrides org_A → gemini, org_B → foo/bar, org_C → NULL avec le prompt « PROMPT SURCHARGE C ».
- Passage 1 : `INSERT 0 1`, `UPDATE 19`, `UPDATE 2`. Passage 2 : `INSERT 0 0`, `UPDATE 0`, `UPDATE 0`.
- Asserts : 0 tâche hors luna (19/19) ; org_A et org_B → luna ; org_C toujours NULL avec son prompt intact ; une seule ligne luna (0,11 / 0,55 / 0,011) ; comptes models/tasks/overrides identiques après les deux passages (3/19/3) ; empreinte md5 des prompts des tâches inchangée.
- L'image `postgres:17` reste en cache Docker local (le conteneur est supprimé).

## Risques et points ouverts

1. **Compte Gateway payant requis pour le ZDR par requête.** Si le premier appel réel renvoie « Zero Data Retention (ZDR) requires a paid account », **tous** les appels LLM échouent (voulu : pas de repli). À vérifier au premier appel avant la mise en prod. Le garde-fou ne doit pas être désactivé.
2. **Un seul fournisseur possible.** D'après le catalogue, seul l'endpoint `openai` de gpt-6-luna propose la zone `eu`. `azure` a le ZDR mais pas de région UE listée ; `bedrock` n'a ni ZDR ni UE. Une indisponibilité d'OpenAI en zone UE fait donc échouer les appels, sans bascule.
3. **Migration non appliquée.** `20261124162405_llm_models_gpt6_luna.sql` doit être appliquée par l'orchestrateur **après** le déploiement du code. Jusque-là, la base pointe toujours sur gemini. Ces appels passeront quand même par le garde-fou, mais `google/gemini-2.5-flash` n'a peut-être pas d'endpoint ZDR + UE, auquel cas ils échoueront. **Déployer et migrer dans la foulée.**
4. **Choix admin.** Un admin qui choisit ensuite un modèle sans endpoint ZDR + UE verra ses appels échouer (voulu, T-mk0-04). Le nom du modèle affiché sur la landing deviendrait alors faux.
5. **Latence.** Les tâches hors extraction tournent à l'effort de raisonnement par défaut (medium) : surveiller les durées des workflows de positionnement et d'analyse de mission, ainsi que les timeouts de branches (45 s / 90 s).
6. **`reasoningEffort: 'low'` non prouvé en réel.** Le catalogue le liste comme accepté, mais aucun appel réel n'a été fait. `none` est une piste plus rapide à tester.
7. **Palier long contexte non modélisé.** Au-delà de 272 001 tokens d'entrée, le tarif passe à 0,22 / 0,825 : le coût est alors sous-estimé dans `ai_usage_log`.
8. **`maxTokens` ignoré** (voir plus haut) : aucun plafond de sortie effectif, comme avant.
9. **Build Turbopack dans ce worktree** : il échoue à cause du `node_modules` en lien symbolique (problème d'environnement, pas de code). À revérifier dans le dépôt principal ou en CI.
10. **Option future (D-05)** : hébergement régional `eu.ai-gateway.vercel.sh` (bêta, +5 %), pour que le Gateway lui-même tourne en UE. Non fait.
11. **Hors périmètre** : la branche non fusionnée `mode-ombre-score-decision` (mode ombre du score par décision). Seul le tarif `openai/gpt-6-luna-decisions` est ajouté ici, aucune ligne `llm_models` pour ce modèle.

## Deviations from Plan

### Auto-fixed / ajouts
1. **[Rule 3 - Bloquant] Stubs de recette.** `20260401101900_refacto_llm_prompts.sql` échouait (`relation "public.missions" does not exist`). Des stubs minimaux `missions(id, job_analysis)` et `positionings(id)` ont été ajoutés au prélude de la recette (scratchpad uniquement, rien dans le dépôt).
2. **[Rule 3 - Environnement] Build.** `next build` (Turbopack) échoue à cause du lien symbolique `node_modules`. La vérification a été faite avec `next build --webpack` (vert). Aucun changement de config.
3. **[Rule 2 - Doc] AGENTS.md.** Une phrase décrivant le garde-fou et le verrou a été ajoutée sous « AI model config », pour que les futurs agents sachent qu'il ne faut pas instancier le Gateway ailleurs.
4. **Commit RED supplémentaire pour la Tâche 2** (`0121977`), conforme au protocole TDD de l'exécuteur ; le plan ne prévoyait qu'un commit feat.
5. **Tarif luna-decisions** : le catalogue était joignable, donc l'entrée est présente et testée. Sa sortie vaut 0 (`completion: "0"`, `max_completion_tokens: 0` dans le catalogue) : c'est un modèle de décision facturé à l'entrée.

## TDD Gate Compliance
- Tâche 1 : RED `7330e3e` (8 échecs constatés), puis GREEN `1cdbc3c`.
- Tâche 2 : RED `0121977` (5 échecs constatés), puis GREEN `a7839fc`.

## Self-Check: PASSED
- Fichiers créés présents : lib/ai.test.ts, lib/ai-guard.test.ts, lib/pricing.test.ts, lib/llm/gpt6-luna-migration.test.ts, supabase/migrations/20261124162405_llm_models_gpt6_luna.sql.
- Commits présents : 7330e3e, 1cdbc3c, 0121977, a7839fc, 68a65a9.
