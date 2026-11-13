---
phase: quick
plan: 260921-seo
type: execute
wave: 1
depends_on: [260921-ksd]
autonomous: true
requirements: [SEO-A-EXPORT, SEO-A-CANCEL, SEO-A-TRIGGER, SEO-B-RADAR, SEO-PREV-ESLINT]
files_modified:
  - lib/utils/supabase-write-error.ts
  - lib/utils/supabase-write-error.test.ts
  - app/api/positioning/[id]/export/route.ts
  - app/api/workflow/[runId]/cancel/route.ts
  - lib/queries/positionings.ts
  - lib/queries/workflow.ts
  - lib/services/job-posting-analyze-trigger.ts
  - lib/radar/queries.ts
  - app/api/radar/brief/route.ts
  - eslint.config.mjs

must_haves:
  truths:
    - "Un échec d'écriture Supabase sur l'export d'un positionnement renvoie une erreur HTTP 500 au client au lieu d'un faux succès, et l'utilisateur voit un toast d'erreur en français"
    - "Un échec d'écriture Supabase sur l'annulation d'un workflow renvoie une erreur HTTP 500 au lieu de `{ status: 'cancelled' }`, et l'utilisateur voit un toast d'erreur"
    - "Aucune des 11 écritures recensées ne laisse tomber sa valeur de retour : chacune lit `{ error }` et, a minima, émet un console.error contextuel (table, identifiant de ligne, opération, message Supabase)"
    - "Les écritures opportunistes Radar continuent de ne PAS faire échouer l'opération englobante, mais les trois sites à risque (enrichissement contact, SIREN, linkedin_url) informent leur appelant par une valeur de retour"
    - "Un nouvel appel `.update()` / `.insert()` supabase-js dont la valeur de retour est ignorée est signalé par `pnpm lint`"
  artifacts:
    - path: "lib/utils/supabase-write-error.ts"
      provides: "Formatage + log uniformes des échecs d'écriture Supabase"
      exports: ["formatSupabaseWriteError", "logSupabaseWriteError", "SupabaseWriteErrorContext"]
    - path: "lib/utils/supabase-write-error.test.ts"
      provides: "Tests Vitest de la logique pure de formatage"
    - path: "eslint.config.mjs"
      provides: "Règle no-restricted-syntax interdisant d'ignorer le retour d'une chaîne supabase"
      contains: "no-restricted-syntax"
  key_links:
    - from: "app/api/positioning/[id]/export/route.ts"
      to: "lib/utils/supabase-write-error.ts"
      via: "import + throw après lecture de { error }"
      pattern: "formatSupabaseWriteError|logSupabaseWriteError"
    - from: "lib/queries/positionings.ts"
      to: "sonner toast"
      via: "onError de useExportPositioning"
      pattern: "toast\\.error"
    - from: "lib/radar/queries.ts"
      to: "lib/utils/supabase-write-error.ts"
      via: "logSupabaseWriteError sur chaque écriture best-effort"
      pattern: "logSupabaseWriteError"
---

<objective>
Traiter les 11 écritures Supabase dont la valeur de retour `{ error }` n'est jamais lue, recensées
en fin de quick 260921-ksd. `supabase-js` ne lève pas : ces 11 sites perdent leurs échecs en
silence — exactement la mécanique qui a rendu l'incident de production du jour invisible pendant
une session entière de debug.

Le traitement n'est **pas** uniforme, et c'est le point de conception central :

- **Classe A — l'API confirme un succès au client.** Un échec d'écriture doit devenir une réponse
  d'erreur. Concerne `export/route.ts:45` et les deux sites de `cancel/route.ts`. Mentir au client
  sur un succès est précisément ce qu'on corrige.
- **Classe A' — service serveur sans réponse client.** `job-posting-analyze-trigger.ts:70` et
  `:214` : log contextuel + valeur de retour exploitable par l'appelant, sans casser le flux.
- **Classe B — écriture opportuniste / best-effort.** Radar : `console.error` contextuel sans faire
  échouer l'opération englobante ; pour les trois sites à risque élevé ou de déduplication,
  l'appelant est informé par une valeur de retour.

Purpose: une écriture qui échoue ne doit plus jamais être indiscernable d'une écriture qui réussit.
Output: un utilitaire de log testé, les 11 sites traités selon leur classe, une règle ESLint qui
empêche la réapparition de la classe de bug.
</objective>

<execution_context>
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/workflows/execute-plan.md
@/Users/mrasoahaingo/Projects/perso/next-esn/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@AGENTS.md
@.planning/STATE.md

Référence de forme (à imiter, ne pas modifier) — les 4 `handleWorkflowError` corrigés en 260921-ksd :
@workflows/positioning-analyze.ts

Sites à corriger :
@app/api/positioning/[id]/export/route.ts
@app/api/workflow/[runId]/cancel/route.ts
@lib/services/job-posting-analyze-trigger.ts
@lib/radar/queries.ts
@app/api/radar/brief/route.ts

Appelants client des contrats A :
@lib/queries/positionings.ts
@lib/queries/workflow.ts
</context>

<interfaces>
<!-- Contrats déjà en place dans le codebase. L'exécutant n'a pas à explorer. -->

Forme de log adoptée par les 4 `handleWorkflowError` (workflows/positioning-analyze.ts:446-462),
à uniformiser sur les 11 sites — clés : table, recordId, stepKey, supabaseError :

```
const { error: statusUpdateError } = await supabase.from(table).update({...}).eq('id', recordId);
if (statusUpdateError) {
  console.error('handleWorkflowError status update failed', {
    table, recordId, stepKey, supabaseError: statusUpdateError.message,
  });
}
```

Hooks client concernés (lib/queries) — tous deux lèvent déjà sur `!res.ok`, donc un passage de
200 à 500 est **déjà géré au niveau transport**, mais **aucun `onError` n'existe** : l'échec est
aujourd'hui silencieux côté UI.

```typescript
// lib/queries/positionings.ts:134
export function useExportPositioning(): UseMutationResult<...>;
//   mutationFn -> fetch POST /api/positioning/:id/export ; if (!res.ok) throw new Error(...)
//   pas de onError

// lib/queries/workflow.ts:15
export function useCancelWorkflow(): UseMutationResult<...>;
//   mutationFn -> fetch POST /api/workflow/:runId/cancel ; if (!res.ok) throw new Error(...)
//   pas de onError
```

Appelants de `useCancelWorkflow` (5 sites, tous en `.mutate(...)` sans `onError` local) :
`app/review/[id]/positioning/[positioningId]/page.tsx:827`, `app/review/[id]/page.tsx:229` et `:241`,
`app/positions/[id]/page.tsx:1808/1840/1874`, `components/unified-sidebar.tsx:594` et `:685`,
`components/mission-job-analysis.tsx:108`.
Appelant de `useExportPositioning` : `app/review/[id]/positioning/[positioningId]/page.tsx:800`
(`onSuccess` local déclenchant le téléchargement — non touché).

Pattern toast existant dans le projet (sonner, messages en français) :
`toast.error('… : échec. Réessayez ou contactez le support.', { duration: 8000 })`.

Signatures Radar concernées :
```typescript
// lib/radar/queries.ts
async function findOrCreateCompany(orgId: string, signal: RawSignal): Promise<RadarCompanyRow>; // :54 — updates :74 et :97
export async function enrichProspectLinkedIn(orgId: string, companyId: string): Promise<number>; // :398 — update :422
export async function upsertDiscoveredCompany(orgId: string, company: {...}): Promise<string>;   // :568 — updates :584 et :605
```
Appelants : `app/api/radar/prospects/[id]/enrich/route.ts:14`, `lib/radar/queries.ts:465`
(boucle d'enrichissement des prospects chauds), `app/api/radar/workflows/collect-linkedin-discovery.workflow.ts:26`.
</interfaces>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Utilitaire de log d'échec d'écriture Supabase (logique pure + tests)</name>
  <files>lib/utils/supabase-write-error.ts, lib/utils/supabase-write-error.test.ts</files>
  <behavior>
    `formatSupabaseWriteError(context)` — fonction pure, aucun effet de bord, aucun import :
    - Test 1 : avec `{ table: 'positionings', recordId: 'abc', operation: 'export.update', supabaseError: { message: 'boom' } }`
      retourne `{ table: 'positionings', recordId: 'abc', operation: 'export.update', supabaseError: 'boom' }`
      (mêmes clés que les 4 `handleWorkflowError`, `supabaseError` aplati en string).
    - Test 2 : `supabaseError` portant aussi `code` / `details` / `hint` → ces champs sont repris
      quand ils sont présents, et **absents** de l'objet quand ils sont `undefined` ou `null`
      (pas de clé à `undefined` dans le log).
    - Test 3 : `supabaseError` `null` ou `undefined` → `supabaseError: 'unknown'`, aucun throw.
    - Test 4 : `supabaseError` sans `message` (objet arbitraire) → `supabaseError` vaut le
      `String(...)` de la valeur, jamais `[object Object]` vide ni un throw.
    - Test 5 : `recordId` `null`/`undefined` → clé `recordId` présente avec la valeur `'unknown'`
      (le log doit rester diagnostiquable même sans identifiant).
    - Test 6 : aucune donnée métier ne fuit — la fonction ne recopie **que** les 4 à 7 clés
      énumérées ci-dessus, même si `context` en porte d'autres (vérifier `Object.keys` exact).
  </behavior>
  <action>
    Créer `lib/utils/supabase-write-error.ts` (TypeScript strict, types de retour explicites sur
    les exports, aucun import — fonction pure testable).

    Exports :
    - type `SupabaseWriteErrorContext` : `{ table: string; recordId?: string | null; operation: string; supabaseError: unknown }`.
    - `formatSupabaseWriteError(context: SupabaseWriteErrorContext): Record<string, string>` —
      logique pure décrite dans `<behavior>`.
    - `logSupabaseWriteError(context: SupabaseWriteErrorContext): void` — fine enveloppe qui appelle
      `console.error('supabase write failed', formatSupabaseWriteError(context))`. Pas de throw,
      pas de valeur de retour : c'est le point d'entrée des sites best-effort.

    `operation` est une chaîne stable identifiant le site d'appel (ex. `'positioning.export.update'`,
    `'workflow.cancel.missions'`, `'radar.enrichProspectLinkedIn.update'`) — jouant le même rôle
    diagnostique que `stepKey` dans `handleWorkflowError`.

    Interdiction explicite : ne jamais recopier dans le log une valeur métier écrite (payload,
    `enrichment_data`, `tailored_cv`, emails). Seuls table / identifiant / opération / message
    Supabase. Cohérent avec T-ksd-02.

    Écrire les tests AVANT l'implémentation, constater un RED franc (`Cannot find module`), puis
    implémenter.
  </action>
  <verify>
    <automated>npx vitest run lib/utils/supabase-write-error.test.ts</automated>
  </verify>
  <done>6 tests passent ; `npx tsc --noEmit` sans erreur ; le fichier source n'a aucun `import`.</done>
</task>

<task type="auto">
  <name>Task 2: Classe A — les API qui confirment un succès échouent quand l'écriture échoue</name>
  <files>app/api/positioning/[id]/export/route.ts, app/api/workflow/[runId]/cancel/route.ts, lib/queries/positionings.ts, lib/queries/workflow.ts</files>
  <action>
    Trois sites, même principe : l'API ne doit plus renvoyer un succès quand la persistance a échoué.

    **A1 — `app/api/positioning/[id]/export/route.ts:45` (risque ÉLEVÉ).**
    Déstructurer `{ error: updateError }` sur le `.update()`. Si `updateError` :
    1. Émettre `logSupabaseWriteError({ table: 'positionings', recordId: id, operation: 'positioning.export.update', supabaseError: updateError })`.
    2. **Traiter le PDF orphelin** : le fichier est déjà uploadé dans `cv-formatted` et son URL a
       été calculée, mais aucune ligne ne la référencera. Supprimer le fichier —
       `await supabase.storage.from('cv-formatted').remove([fileName])` — dans un bloc dont
       l'échec est lui-même logué (`operation: 'positioning.export.orphan-cleanup'`) sans masquer
       l'erreur initiale. **Documenter ce choix en commentaire au-dessus** : on préfère perdre le
       PDF (regénérable à l'identique par un nouvel export) plutôt que de laisser s'accumuler dans
       le bucket des fichiers qu'aucune ligne ne référence et qu'aucun écran ne permet de purger.
    3. `throw new Error('Échec de l\'enregistrement de l\'export : ' + updateError.message)` — le
       `catch` existant du handler renvoie déjà un 500 avec ce message. Ne pas dupliquer la
       construction de réponse.

    **A2 — `app/api/workflow/[runId]/cancel/route.ts:59` et `:64`.**
    Déstructurer `{ error }` sur les deux `.update()`. En cas d'erreur : `logSupabaseWriteError`
    (`operation: 'workflow.cancel.missions'` / `'workflow.cancel.reset-status'`, `table` =
    `'missions'` ou la valeur de `table`, `recordId`) puis `throw`, pour que le handler cesse de
    renvoyer `{ status: 'cancelled' }`. Le run workflow a déjà été annulé côté runtime à ce
    stade — le mentionner en commentaire : l'erreur signale que **la ligne n'a pas été
    réinitialisée**, pas que l'annulation du run a échoué, et une relance de l'annulation est
    idempotente (le bloc `isTerminal` / `alreadyTerminal` existant absorbe le second passage).

    **Contrat d'API — changement explicite et assumé.** `POST /api/positioning/:id/export` et
    `POST /api/workflow/:runId/cancel` peuvent désormais renvoyer 500 là où ils renvoyaient 200.
    Appelants vérifiés : `useExportPositioning` (lib/queries/positionings.ts:134) et
    `useCancelWorkflow` (lib/queries/workflow.ts:15) lèvent tous deux déjà sur `!res.ok` — aucun
    appelant ne casse. **Mais aucun n'affiche d'erreur** : sans ajout, on remplacerait un silence
    serveur par un silence UI. Ajouter donc un `onError` dans **ces deux hooks uniquement** (couvre
    d'un coup les 9 sites appelants, aucune page à modifier) :
    - `useExportPositioning` : `toast.error("Échec de l'export : le PDF n'a pas pu être enregistré. Réessayez ou contactez le support.", { duration: 8000 })`
    - `useCancelWorkflow` : `toast.error("Échec de l'annulation : la ligne n'a pas pu être réinitialisée. Réessayez ou contactez le support.", { duration: 8000 })`
    Importer `toast` depuis `sonner` (déjà dépendance du projet, `<Toaster />` déjà monté).
    Ne modifier ni les `onSuccess` existants, ni les invalidations de cache, ni les signatures des
    hooks, ni aucun composant appelant.
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; npx vitest run &amp;&amp; npx eslint "app/api/positioning/[id]/export/route.ts" "app/api/workflow/[runId]/cancel/route.ts" lib/queries/positionings.ts lib/queries/workflow.ts &amp;&amp; test "$(grep -v '^\s*//' "app/api/positioning/[id]/export/route.ts" "app/api/workflow/[runId]/cancel/route.ts" | grep -c 'logSupabaseWriteError')" -ge 4 &amp;&amp; test "$(grep -v '^\s*//' lib/queries/positionings.ts lib/queries/workflow.ts | grep -c 'toast.error')" -ge 2</automated>
  </verify>
  <done>
    Les 3 sites lisent `{ error }` et lèvent ; le PDF orphelin est supprimé avec son échec propre
    logué ; les 2 hooks affichent un toast français ; `npx vitest run` toujours 116 tests au vert ;
    aucune signature de hook ni aucun composant appelant modifié.
  </done>
</task>

<task type="auto">
  <name>Task 3: Classe A' — remises à null de job_analysis_workflow_run_id contrôlées</name>
  <files>lib/services/job-posting-analyze-trigger.ts</files>
  <action>
    Deux sites, tous deux `update({ job_analysis_workflow_run_id: null })`, tous deux côté serveur
    sans réponse client directe : le traitement est log + information de l'appelant, **sans**
    lever, pour ne pas transformer une réconciliation dégradée en 500.

    **Site 1 — `cancelMissionJobAnalysisWorkflow` (ligne ~70).** Déstructurer `{ error }`. En cas
    d'erreur : `logSupabaseWriteError({ table: 'missions', recordId: missionId, operation: 'missionJobAnalysis.cancel.clearRunId', supabaseError: error })`.
    Changer le type de retour de `Promise<void>` en `Promise<boolean>` (type explicite, fonction
    interne — vérifier et adapter **tous** ses appelants dans le fichier) : `false` si l'effacement
    a échoué. Commenter le POURQUOI : le run a bien été coupé, mais la mission garde son `run_id`,
    donc `claimMissionJobAnalysisWorkflowRun` — qui filtre sur
    `.is('job_analysis_workflow_run_id', null)` — retournera `false` au prochain essai. Le système
    reste cohérent (aucune double analyse), mais la mission devient non relançable jusqu'à
    intervention : le log est le seul signal disponible, il doit exister.

    **Site 2 — chemin de réconciliation (ligne ~214), garde `.eq('job_analysis_workflow_run_id', seenRunId)`.**
    Déstructurer `{ error }` et loguer avec `operation: 'missionJobAnalysis.reconcile.clearRunId'`.
    Ne pas lever : la relecture `missionAfterClear` qui suit immédiatement détecte déjà le cas
    (`concurrentRunId` non nul) et suit un chemin défini. Ajouter un commentaire liant le log à
    cette relecture pour que le lecteur comprenne pourquoi on ne lève pas ici.

    Ne modifier aucune autre sémantique : ordre des appels, garde `eq(seenRunId)`, `startOnly`,
    valeurs de retour de `launchMissionJobPostingAnalysisAfterContentChange` restent identiques.
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; npx eslint lib/services/job-posting-analyze-trigger.ts &amp;&amp; test "$(grep -v '^\s*//' lib/services/job-posting-analyze-trigger.ts | grep -c 'logSupabaseWriteError')" -ge 2 &amp;&amp; npx vitest run</automated>
  </verify>
  <done>
    Les 2 `update` lisent `{ error }` et loguent ; `cancelMissionJobAnalysisWorkflow` retourne
    `Promise&lt;boolean&gt;` avec tous ses appelants adaptés ; aucune signature exportée modifiée ;
    tsc et lint propres.
  </done>
</task>

<task type="auto">
  <name>Task 4: Classe B — écritures opportunistes Radar loguées, sites à risque remontés à l'appelant</name>
  <files>lib/radar/queries.ts, app/api/radar/brief/route.ts</files>
  <action>
    Six sites best-effort. Principe commun : **ne jamais faire échouer l'opération englobante**,
    toujours `logSupabaseWriteError`. Trois sites reçoivent en plus une remontée à l'appelant.

    **`lib/radar/queries.ts:74` — `name`, `updated_at` (risque faible).** Lire `{ error }`,
    `logSupabaseWriteError` (`operation: 'radar.findOrCreateCompany.refreshName'`,
    `recordId: bySiren.id`). Retour de `findOrCreateCompany` inchangé.

    **`lib/radar/queries.ts:97` — `siren`, `updated_at` (déduplication).** Lire `{ error }`, loguer
    (`operation: 'radar.findOrCreateCompany.backfillSiren'`, `recordId: byName.id`). **Remontée :**
    le SIREN est la clé de réconciliation ; un échec silencieux recrée un doublon au run suivant.
    Ne pas changer le type de retour de `findOrCreateCompany` (utilisé comme `RadarCompanyRow` par
    l'appelant ligne ~139) : à la place, quand l'écriture réussit, refléter le SIREN dans l'objet
    retourné (`{ ...byName, siren: signal.companySiren }`) et, quand elle échoue, retourner la
    ligne **inchangée** — l'appelant reçoit ainsi un objet fidèle à l'état réel de la base au lieu
    d'un objet optimiste. Commenter ce choix.

    **`lib/radar/queries.ts:422` — `enrichProspectLinkedIn` (risque ÉLEVÉ, appel API le plus
    coûteux du produit).** Lire `{ error }` et loguer
    (`operation: 'radar.enrichProspectLinkedIn.update'`, `recordId: companyId`). **Remontée
    obligatoire :** si l'update échoue, l'enrichissement payé est perdu et sera re-facturé au
    prochain passage. Retourner `0` dans ce cas au lieu de `contacts.length` — la signature
    `Promise<number>` est conservée, et les deux appelants
    (`app/api/radar/prospects/[id]/enrich/route.ts:14` et la boucle des prospects chauds
    `lib/radar/queries.ts:465`) interprètent déjà `0` comme « aucun contact enregistré ».
    Vérifier ces deux appelants et ne pas changer leur contrat. Commenter : `0` signifie ici
    « rien n'a été persisté », ce qui est exactement ce que l'appelant doit croire.

    **`lib/radar/queries.ts:584` — `name`, `sector`, `headcount`, `city` (faible).** Lire
    `{ error }`, loguer (`operation: 'radar.upsertDiscoveredCompany.refreshByLinkedin'`). Retour
    `existing.id` inchangé : la ligne existe bien, seul son rafraîchissement a échoué.

    **`lib/radar/queries.ts:605` — `linkedin_url`, `sector`, … (déduplication).** Lire `{ error }`,
    loguer (`operation: 'radar.upsertDiscoveredCompany.backfillLinkedin'`, `recordId: byName.id`).
    Retour `byName.id` conservé (la ligne existe), mais commenter le risque résiduel : sans
    `linkedin_url` persistée, le prochain run ne retrouvera pas la ligne par LinkedIn et repassera
    par le rapprochement par nom normalisé — dégradé mais non destructeur. C'est la raison pour
    laquelle on n'échoue pas ici.

    **`app/api/radar/brief/route.ts:75` — `insert` dans `radar_actions`.** Déjà dans un
    `try/catch` avec `console.error`, mais `{ error }` n'est pas lu : déstructurer et appeler
    `logSupabaseWriteError` (`table: 'radar_actions'`, `recordId: body.companyId`,
    `operation: 'radar.brief.logAction'`). Ne pas lever : on est dans le `onFinish` d'un stream
    déjà renvoyé au client, lever n'aurait aucun destinataire. Conserver le `try/catch` englobant
    tel quel.

    Aucune migration Supabase. Aucune nouvelle dépendance. Aucun changement de signature exportée.
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; npx eslint lib/radar/queries.ts app/api/radar/brief/route.ts &amp;&amp; test "$(grep -v '^\s*//' lib/radar/queries.ts | grep -c 'logSupabaseWriteError')" -ge 5 &amp;&amp; test "$(grep -v '^\s*//' app/api/radar/brief/route.ts | grep -c 'logSupabaseWriteError')" -ge 1 &amp;&amp; npx vitest run</automated>
  </verify>
  <done>
    Les 6 sites lisent `{ error }` et loguent ; `enrichProspectLinkedIn` retourne `0` quand rien
    n'est persisté ; `findOrCreateCompany` ne retourne plus un SIREN optimiste ; aucune opération
    englobante ne se met à échouer ; 116 tests toujours au vert.
  </done>
</task>

<task type="auto">
  <name>Task 5: Prévention — règle ESLint interdisant d'ignorer le retour d'une écriture Supabase</name>
  <files>eslint.config.mjs</files>
  <action>
    Le recensement des 64 call sites a été fait au grep, avec une heuristique de fenêtre de 4
    lignes — non fiable par construction (constat explicite du SUMMARY 260921-ksd). Une règle
    ESLint rend la classe de bug non-réintroductible.

    Faisabilité vérifiée : `no-restricted-syntax` est une règle **core** d'ESLint 9, disponible
    sans aucune dépendance supplémentaire, et accepte un sélecteur esquery. **Ne pas** introduire
    `@typescript-eslint/no-floating-promises` ni le parser typé (`projectService`) : cela
    imposerait une analyse de types sur tout le repo et un coût de lint disproportionné.

    Ajouter dans `eslint.config.mjs` un bloc de configuration ciblant `app/**/*.ts`,
    `lib/**/*.ts`, `workflows/**/*.ts` avec :

    - règle `no-restricted-syntax`
    - sélecteur : une `ExpressionStatement` dont l'expression est une `AwaitExpression` contenant
      un appel de méthode `.from(...)` — soit une chaîne supabase-js consommée en instruction, donc
      dont le `{ error }` n'est pas lu. Un appel dont le retour est destructuré
      (`const { error } = await supabase.from(...)`) est une `VariableDeclaration`, pas une
      `ExpressionStatement` : il n'est pas signalé. C'est exactement la discrimination voulue.
    - message en français, explicite sur la cause : supabase-js ne lève pas, lire `{ error }` puis
      loguer via `logSupabaseWriteError` ou lever selon la classe du site.

    Lancer `pnpm lint` et traiter le résultat :
    - **0 nouvelle erreur** : la règle est posée, les tâches 1-4 ont couvert le périmètre.
    - **erreurs résiduelles** : ce sont des sites légitimes (lectures `.select()` consommées en
      instruction, ou écritures volontairement fire-and-forget hors périmètre). Pour chacun, soit
      le corriger s'il relève du périmètre, soit poser un
      `// eslint-disable-next-line no-restricted-syntax -- <raison>` avec une raison écrite, jamais
      un disable de fichier entier. Si le volume de faux positifs dépasse 10 sites, **ne pas
      forcer** : retirer la règle, et consigner dans le SUMMARY la recommandation d'un plugin
      dédié avec le compte exact de faux positifs constaté. Le scope est la fiabilisation, pas un
      chantier de lint.

    Ne modifier ni `nextConfig`, ni `nextTypescript`, ni aucune règle existante. Aucune dépendance
    ajoutée à `package.json`.
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; pnpm lint &amp;&amp; git diff --exit-code package.json</automated>
  </verify>
  <done>
    `pnpm lint` sort en 0 ; `eslint.config.mjs` porte la règle (ou le SUMMARY documente son retrait
    motivé avec le décompte de faux positifs) ; `package.json` inchangé ; aucune dépendance ajoutée.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → `POST /api/positioning/:id/export` | déclenche upload storage + écriture DB, réponse consommée par l'UI |
| client → `POST /api/workflow/:runId/cancel` | `table` fourni par le client, déjà borné par `ALLOWED_TABLES` |
| service → console.error | les logs partent vers l'observabilité Vercel, potentiellement consultables |
| jobs Radar → API externes payantes | l'enrichissement contact est facturé à l'appel |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-seo-01 | Information Disclosure | `logSupabaseWriteError` | mitigate | `formatSupabaseWriteError` ne recopie qu'une liste fermée de clés (table, recordId, operation, message/code/details/hint Supabase) ; Test 6 vérifie `Object.keys` exact ; aucune valeur métier écrite (`tailored_cv`, `enrichment_data`, emails) n'entre dans le log. Prolonge T-ksd-02. |
| T-seo-02 | Information Disclosure | message d'erreur 500 de `export` / `cancel` | mitigate | Le message Supabase remonté au client est un message d'erreur Postgres, pas une donnée de ligne ; conserver le préfixe métier français et ne jamais concaténer le payload écrit dans le message levé. |
| T-seo-03 | Denial of Service | `export` — nettoyage du PDF orphelin | accept | La suppression storage échoue au pire silencieusement (loguée) ; aucun chemin où un client peut forcer la suppression du PDF d'un autre positionnement, `fileName` étant dérivé de `orgId` et d'un `Date.now()` local à la requête. |
| T-seo-04 | Repudiation | annulation de workflow renvoyant désormais 500 | mitigate | L'annulation du run runtime est idempotente (bloc `alreadyTerminal` existant) : une relance après 500 ne produit pas d'état incohérent ; le toast indique explicitement que c'est la réinitialisation de la ligne qui a échoué. |
| T-seo-05 | Tampering | valeur de retour de `enrichProspectLinkedIn` | mitigate | Retourner `0` quand rien n'est persisté empêche un appelant de compter des contacts qui n'existent pas en base, et donc de sauter un ré-enrichissement nécessaire. |
| T-seo-SC | Tampering | npm installs | mitigate | **Sans objet** : aucune dépendance ajoutée par ce plan (règle ESLint core uniquement). `git diff --exit-code package.json` en vérification de la Task 5. |
</threat_model>

<verification>
| Commande | Attendu |
|----------|---------|
| `npx tsc --noEmit` | 0 erreur |
| `npx vitest run` | ≥ 122 tests (116 existants + 6 nouveaux), 0 échec |
| `pnpm lint` | exit 0 (warning préexistant `logAiUsage` inutilisé dans `extract-cv.ts` toléré) |
| `rtk proxy npx next build` | `✓ Compiled successfully`, exit 0 |
| `grep -v '^\s*//' <les 7 fichiers de sites> \| grep -c logSupabaseWriteError` | ≥ 11 (un par site recensé, hors sites levant directement) |
| `git diff --exit-code package.json` | aucune modification |
| `ls supabase/migrations` | aucune migration ajoutée |
</verification>

<success_criteria>
- Les 11 écritures de l'inventaire lisent leur `{ error }` ; `lib/utils/job-description-hash.ts:5` (faux positif `createHash().update()`) n'est pas touché.
- `export` et les 2 sites de `cancel` renvoient 500 au lieu d'un faux succès, avec un toast français côté client via les 2 hooks `lib/queries`.
- Le sort du PDF orphelin est tranché (suppression) et documenté en commentaire dans le code.
- Les 6 sites Radar loguent sans faire échouer l'opération englobante ; les 3 sites à risque informent leur appelant par leur valeur de retour.
- Forme de log uniforme avec les 4 `handleWorkflowError` : table, identifiant de ligne, opération, message Supabase.
- 116 tests existants toujours au vert, 6 tests ajoutés sur la seule logique pure introduite.
- Aucune migration Supabase, aucune dépendance ajoutée, aucune feature nouvelle.
</success_criteria>

<output>
Créer `.planning/quick/260921-seo-traiter-les-11-ecritures-supabase-non-co/260921-seo-SUMMARY.md` à la fin.
</output>
