# Quick Task 261113-3qy : Mode ombre « score par décision » dans l'analyse de positionnement - Context

**Gathered:** 2026-11-13
**Status:** Ready for planning

<domain>
## Task Boundary

Calculer, à côté du score actuel de l'analyse de positionnement, un score issu d'un modèle de
décision (`openai/gpt-6-luna-decisions` via l'AI Gateway), et le journaliser dans `ai_usage_log`
pour comparaison ultérieure.

Rien de ce qui est affiché ou persisté dans `positionings.analysis` ne change. Le flux NDJSON,
le statut du positionnement et les erreurs du workflow ne sont jamais affectés par le mode ombre.

Hors périmètre : UI, remplacement du `matchScore` affiché, colonne `kind` sur `llm_models`,
migration SQL, admin LLM, correction du tarif Gemini, montée de version du SDK `ai`.

</domain>

<decisions>
## Implementation Decisions (verrouillées)

### D1 — Appel HTTP direct, pas de montée de SDK
- `ai@6.0.116` n'expose pas `experimental_decide` (vérifié dans `node_modules`). Les modèles de
  décision exigent la spécification v4 (AI SDK 7). On n'y touche pas.
- Client `lib/llm/decide.ts` : `fetch` sur `POST https://ai-gateway.vercel.sh/v1/decisions`,
  en-tête `Authorization: Bearer ${process.env.AI_GATEWAY_API_KEY}`.
- Délai maximal 15 s (`AbortSignal.timeout`). Réponse validée par Zod.

### D2 — Modèle et rétention
- Constante `DECISION_SHADOW_MODEL_ID = 'openai/gpt-6-luna-decisions'` dans `lib/llm/constants.ts`.
- Toujours envoyer `providerOptions: { gateway: { zeroDataRetention: true } }` (accepté par
  l'endpoint, vérifié).

### D3 — Interrupteur
- Actif uniquement si `process.env.POSITIONING_DECISION_SHADOW === '1'`. Absent ou autre valeur : aucun appel.
- Actif uniquement si la mission a un `job_analysis` avec au moins un point clé.

### D4 — Best-effort strict
- Le mode ombre est encapsulé dans une fonction asynchrone qui capture toute erreur
  (`console.warn` avec `positioningId`, sans contenu de CV ni de payload) et renvoie `null`.
  Aucune promesse rejetée non gérée, y compris si l'analyse principale échoue entre-temps.
- Lancé en parallèle des branches existantes dans `fetchAndAnalyze` (`'use step'`),
  journalisé après la synthèse (le log a besoin du `matchScore` du LLM).

### D5 — Questions
- Noms générés, jamais dérivés des identifiants du barème : `kp_<i>` (échelle) et `hc_<i>`
  (éliminatoire). La correspondance nom → `keyPoint.id` est conservée dans le code et dans le log.
- Point clé `requirementTier === 'hard_constraint'` → question `predicate`.
- Autres points clés → question `score` à 3 niveaux, dans cet ordre :
  `missing` (aucune preuve dans le CV), `partial` (preuve indirecte, ancienne ou transférable),
  `strong` (preuve explicite et récente).
- Les instructions de chaque question sont construites depuis `label`, `valueSought`,
  `evidenceTypeExpected`, `scoringRubricHint`, `roleInMission`.
- Plafond `MAX_DECISION_QUESTIONS = 50` (tri par `importanceRank`).

### D6 — État envoyé au modèle
- Le CV du candidat et les réponses recruteur déjà fournies (`priorAnswers`), en réutilisant les
  sérialiseurs existants de `lib/services/positioning.service.ts`.
- Pas le prompt système des branches LLM, pas le barème (il est porté par les questions).

### D7 — Calcul du score (fonctions pures, testées)
- Valeur d'un point clé à échelle = espérance normalisée sur [0, 1] : missing = 0, partial = 0,5,
  strong = 1 (aligné sur le barème « 0 / 50 / 100 »). Calculée depuis `probabilities` ; à défaut
  depuis `score / (nbNiveaux - 1)`.
- Pondération = `importanceWeight` renormalisé sur les points clés effectivement répondus.
  Poids absent → moyenne des poids définis ; aucun poids défini → poids égaux.
- `uncappedScore` = arrondi de 100 × somme pondérée.
- Éliminatoire échoué = probabilité < `HARD_CONSTRAINT_PASS_THRESHOLD` (0,5).
  Si au moins un échoue : `decisionScore = min(uncappedScore, HARD_CONSTRAINT_FAILED_SCORE_CAP)`
  avec un plafond de 39 (sous le seuil orange de 40 de l'interface).
- Réponses `refusal` : exclues du calcul et comptées. Aucune réponse exploitable → score `null`.
- Confiance agrégée numérique sur [0, 1] : moyenne pondérée des `confidence` (échelle) et de
  `|2p − 1|` (oui/non). Bande dérivée : < 0,4 `low`, < 0,7 `medium`, sinon `high`. Ces seuils sont
  provisoires : le log conserve la valeur numérique et les réponses brutes.

### D8 — Journalisation
- `logAiUsage` existant (`lib/services/ai-usage.service.ts`), `operation: 'analysis'`,
  `taskKey: TASK_KEY.POSITIONING_ANALYSIS_DECISION_SHADOW` (`'positioning.analysis.decisionShadow'`),
  `aiModel: DECISION_SHADOW_MODEL_ID`, `usage` mappé depuis `input_tokens` / `output_tokens`.
- `outputPayload` : `{ answers, questionIndex, decisionScore, uncappedScore, hardConstraintFailures,
  decisionConfidence, decisionConfidenceBand, refusalCount, questionCount, llmMatchScore,
  llmMatchScoreConfidence, gatewayCostUsd, finalProvider }`.
- `inputPayload` : les questions et la taille de l'état (pas besoin de recopier tout le CV :
  il est déjà dans les lignes des branches).
- **Ne jamais stocker `provider_metadata` brut** : il contient les messages d'erreur des
  tentatives fournisseur. Ne garder que `gateway.cost` et `gateway.routing.finalProvider`.
- Les lecteurs existants ne sont pas affectés : l'historique d'analyse filtre sur
  `POSITIONING_ANALYSIS_SNAPSHOT` (`app/api/positioning/[id]/analysis-history/route.ts:32`).

### D9 — Tarif
- `lib/pricing.ts` : `'openai/gpt-6-luna-decisions': { inputUsdPer1M: 0.1, outputUsdPer1M: 0 }`.
  Facturation observée : 1 116 tokens → 0,0001116 $. Le tarif régional est 0,11 $ (commentaire).

### D10 — Git
- L'arbre de travail contient des changements sans rapport (suppressions sous `.planning/phases`,
  `supabase/.temp/cli-latest`, `PRODUCT.md`, `pnpm-workspace.yaml`). Ne jamais utiliser
  `git add -A` ni `git add .` : ne stager que les fichiers créés ou modifiés par cette tâche.
- Messages de commit en français, préfixe `feat(quick-261113-3qy):` / `test(quick-261113-3qy):`,
  terminés par la ligne `Co-Authored-By: Claude <noreply@anthropic.com>`.

### Claude's Discretion
- Découpage exact des fonctions et des types, forme des tests, nom des helpers.

</decisions>

<specifics>
## Contrat de l'API Decisions (vérifié par appels réels le 2026-11-13)

Requête :

```json
{
  "model": "openai/gpt-6-luna-decisions",
  "input": "<texte de l'état>",
  "questions": [
    { "type": "score", "name": "kp_0", "instructions": "…",
      "levels": [{ "label": "missing", "description": "…" }, { "label": "partial" }, { "label": "strong" }] },
    { "type": "predicate", "name": "hc_0", "instructions": "…" }
  ],
  "providerOptions": { "gateway": { "zeroDataRetention": true } }
}
```

Réponse 200 (les réponses sont dans l'ordre des questions) :

```json
{
  "answers": [
    { "type": "score", "name": "kp_0", "score": 1.13, "confidence": 0.48,
      "probabilities": [
        { "value": 0, "label": "missing", "probability": 0.11 },
        { "value": 1, "label": "partial", "probability": 0.65 },
        { "value": 2, "label": "strong", "probability": 0.24 }
      ] },
    { "type": "predicate", "name": "hc_0", "probability": 0 }
  ],
  "model": "openai/gpt-6-luna-decisions",
  "usage": { "input_tokens": 313, "output_tokens": 0, "total_tokens": 313 },
  "provider_metadata": { "gateway": { "cost": "0.0000313", "routing": { "finalProvider": "openai" } } }
}
```

- Réponse `choice` (non utilisée ici, à accepter dans le schéma) :
  `{ "type": "choice", "name", "choice", "confidence", "probabilities": [{ "value", "probability" }] }`.
- Refus du modèle sur une question : `{ "type": "refusal", "name": "…" }` à la position de la question.
- `score` = espérance de l'indice de niveau (0 à nbNiveaux − 1). `gateway.cost` est une chaîne.
- Erreur 400 : `{ "error": { "message", "type", "param", "code" } }`.
- Contraintes : noms uniques dans la requête ; 2 à 10 niveaux pour `score` ; 1 à 255 choix pour `choice`.
- L'état n'est facturé qu'une fois quel que soit le nombre de questions. Latence observée : 0,4 à 0,5 s pour 6 questions.
- Pas de streaming, pas de texte généré.

</specifics>

<canonical_refs>
## Canonical References

- Documentation : https://vercel.com/docs/ai-gateway/modalities/decision et
  https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-decisions
- `workflows/positioning-analyze.ts` — étape `fetchAndAnalyze` (l. 41), branches parallèles (l. 183–244), synthèse (l. 246–313)
- `lib/schema.ts` — `jobPostingKeyPointSchema` (≈ l. 527), `jobPostingRequirementTierSchema` (l. 446)
- `lib/services/positioning.service.ts` — `buildAnalysisUserContent` (l. 392), `buildPriorAnswersPromptBlock` (l. 336)
- `lib/services/ai-usage.service.ts` — `logAiUsage` (l. 160)
- `lib/llm/task-keys.ts`, `lib/llm/constants.ts`, `lib/pricing.ts`

</canonical_refs>
