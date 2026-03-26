# Phase 3: Positioning Mission Upload & Inline Status — Context

**Gathered:** 2026-03-26  
**Status:** Ready for planning

<domain>

## Phase Boundary

Sur **`/review/[id]/positioning`** (liste missions + création), l’utilisateur **ne quitte pas** la page pour suivre l’analyse IA de la fiche mission. L’état d’analyse est **visible sur place** ; le bouton qui lance le positionnement (création du lien candidat ↔ mission puis navigation vers `/review/.../positioning/[positioningId]`) n’est **actif** que lorsque l’analyse mission est **prête côté serveur** (pas seulement un flag client).

Couvre **FLOW-01**, **FLOW-02**, **FLOW-03**. Pas de nouvelle feature métier hors ce flux.

</domain>

<decisions>

## Implementation Decisions

### Navigation & parcours (produit — validé avec le user)

- **D-01:** **Pas de redirection obligatoire** vers `/positions/[missionId]` après création / sélection de mission sur `/review/[id]/positioning`. Le lien « ouvrir la fiche mission » peut rester une **action secondaire** (comme sur l’écran positionnement détail), pas le chemin nominal.
- **D-02:** Après **création** de mission (dialogue « Nouvelle fiche »), l’utilisateur **reste** sur la même URL ; la mission créée est **sélectionnée** dans la liste (comportement déjà proche du code actuel — `setSelectedMissionId` dans le `onSuccess` de création).
- **D-03:** Le CTA principal (aujourd’hui libellé **« Analyser le matching »** dans la rangée étendue) ne doit **pas** être utilisable tant que l’**analyse de fiche mission** (job posting analysis workflow) n’a pas produit un état utilisable pour la suite — **décision** : désactivation basée sur **champs mission côté serveur** (`job_analysis`, `job_analysis_workflow_run_id`, erreurs éventuelles / `workflow_last_error` mission), pas sur `isPending` seul de la mutation de création de positionnement.

### État inline (UI)

- **D-04:** Pour la mission **sélectionnée**, afficher sous la fiche (zone déjà étendue quand `isSelected`) un **bloc d’état d’analyse** : au minimum chargement / en cours / terminé / erreur, avec message actionnable en erreur (aligné ERR-02 / Phase 1–2).
- **D-05:** **Réutiliser** les patterns **Phase 2** lorsqu’un `job_analysis_workflow_run_id` est présent : **`useWorkflowStream`** + liste d’étapes (**`WorkflowStepList`**, libellés job posting) pour le **live** ; après rechargement, s’appuyer sur les champs persistés (statut mission + `workflow_last_error` si applicable) pour les badges/erreurs.
- **D-06:** Si la liste ne contient pas assez de champs pour l’UI (à valider en implémentation), **enrichir** `GET /api/missions` ou **poser** `useMission(selectedId)` avec `refetchInterval` calqué sur `useMission` existant (`lib/queries/missions.ts` — déjà 3s quand analyse active sur la **fiche** détail). Éviter le polling global agressif sur toute la liste si inutile.

### Données & API (ancrage code actuel)

- **D-07:** `POST /api/missions` appelle déjà `launchMissionJobPostingAnalysisAfterContentChange` — la mission retournée peut avoir un `job_analysis_workflow_run_id` ; le client doit **relire** cette réalité (invalidation + détail ou champs liste).
- **D-08:** L’interface `Mission` côté `app/review/[id]/positioning/page.tsx` est **incomplète** vs. les colonnes disponibles (`select('*')` côté API) : **étendre les types** et **brancher** l’UI sur l’analyse (workflow run id, présence `job_analysis`, stale éventuel via `job_analysis_stale` si exposé comme sur `GET /api/missions/[id]`).

### Accessibilité & copie

- **D-09:** Libellés **FR** ; bouton désactivé avec **raison** visible (texte d’aide ou `aria-describedby`) — ex. « Analyse de la fiche en cours… » vs « Analyse terminée — vous pouvez lancer le matching ».

### Claude's Discretion

- Densité du bloc (compact vs. Card pleine largeur) ; ordre exact sous-étapes si réutilisation stricte de `WorkflowStepList` ; micro-copy des tooltips.

### Folded Todos

_None._

</decisions>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & exigences

- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, requirements FLOW-01…03
- `.planning/REQUIREMENTS.md` — FLOW-01, FLOW-02, FLOW-03

### Produit & décision utilisateur

- `.planning/PROJECT.md` — Current Milestone v1.1, Key Decisions (flux positionnement)

### Phase précédente (patterns à réutiliser)

- `.planning/phases/02-sub-step-progress-step-error-attribution/02-CONTEXT.md` — NDJSON, `WorkflowStepList`, pas de `workflow_steps` table sauf fallback

### Ancrages code (à faire évoluer en Phase 3)

- `app/review/[id]/positioning/page.tsx` — liste missions, dialogue création, CTA « Analyser le matching », `handleStartPositioning` → `router.push` vers positionnement **uniquement** après création positioning (comportement actuel du CTA à **gater** sur analyse mission)
- `lib/queries/missions.ts` — `useMissions`, `useMission`, `useCreateMission`, intervalles de refetch
- `app/api/missions/route.ts` — `GET` liste, `POST` création + lancement analyse
- `app/api/missions/[id]/route.ts` — détail mission (`job_analysis_stale`, positionings)
- `lib/hooks/useWorkflowStream.ts` — reconnexion flux job posting analysis
- `lib/services/job-posting-analyze-trigger.ts` — déclenchement analyse (référence pour conditions « prêt »)

### Docs métier (optionnel)

- `docs/MATCHING_RULES.md` — si le planner doit lier « matching » à des prérequis d’analyse

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable assets

- **`WorkflowStepList`** + **step labels** job posting (Phase 2) pour le run d’analyse mission.
- **`useMission`** refetch intelligent déjà défini pour la fiche mission — pattern à rapprocher pour la mission sélectionnée sur la page liste.
- **Mutations** `useCreateMission` / `useCreatePositioning` avec invalidation React Query déjà en place.

### Established patterns

- **Pas de workflow lancé depuis `useEffect` mount** — reconnaissance au flux existant ; ici l’analyse est déclenchée **côté API** à la création mission (déjà conforme).
- **CTA** : aujourd’hui `disabled={isCreating}` seulement — **à étendre** avec vérité serveur (FLOW-03).

### Integration points

- Liste missions : passage de **données complètes** ou **subscription** au détail pour l’id sélectionné.
- Navigation : `router.push(/review/.../positioning/${id})` **uniquement** dans `handleStartPositioning` après succès API — inchangé dans l’intention ; seule la **faisabilité** du clic change.

</code_context>

<specifics>

## Specific Ideas

- L’utilisateur a explicitement **rejeté** le parcours « aller sur la fiche mission, attendre, revenir cliquer positionner » au profit du **contexte unique** sur `/review/[id]/positioning`.

</specifics>

<deferred>

## Deferred Ideas

- **Phase 4 (LAT-*)** : Realtime pour rafraîchir la liste / détail sans polling — peut **réduire** le besoin de `refetchInterval` sur cette page une fois livré.
- **Phase 5 (RES-*)** : retry ciblé d’une sous-étape d’analyse mission — hors FLOW-01..03 sauf si le planner fusionne une partie d’erreur recovery.

### Reviewed Todos (not folded)

_None._

</deferred>

---

*Phase: 03-positioning-mission-upload-inline-status*  
*Context gathered: 2026-03-26*
