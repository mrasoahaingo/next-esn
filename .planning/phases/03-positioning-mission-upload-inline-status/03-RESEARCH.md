# Phase 3: Positioning Mission Upload & Inline Status — Research

**Researched:** 2026-03-26  
**Domain:** Next.js App Router + React Query + job posting workflow streaming (`@workflow/next`)  
**Confidence:** HIGH (codebase-verified); MEDIUM for optional API hardening

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation & parcours (produit — validé avec le user)**

- **D-01:** **Pas de redirection obligatoire** vers `/positions/[missionId]` après création / sélection de mission sur `/review/[id]/positioning`. Le lien « ouvrir la fiche mission » peut rester une **action secondaire** (comme sur l’écran positionnement détail), pas le chemin nominal.
- **D-02:** Après **création** de mission (dialogue « Nouvelle fiche »), l’utilisateur **reste** sur la même URL ; la mission créée est **sélectionnée** dans la liste (comportement déjà proche du code actuel — `setSelectedMissionId` dans le `onSuccess` de création).
- **D-03:** Le CTA principal (aujourd’hui libellé **« Analyser le matching »** dans la rangée étendue) ne doit **pas** être utilisable tant que l’**analyse de fiche mission** (job posting analysis workflow) n’a pas produit un état utilisable pour la suite — **décision** : désactivation basée sur **champs mission côté serveur** (`job_analysis`, `job_analysis_workflow_run_id`, erreurs éventuelles / `workflow_last_error` mission), pas sur `isPending` seul de la mutation de création de positionnement.

**État inline (UI)**

- **D-04:** Pour la mission **sélectionnée**, afficher sous la fiche (zone déjà étendue quand `isSelected`) un **bloc d’état d’analyse** : au minimum chargement / en cours / terminé / erreur, avec message actionnable en erreur (aligné ERR-02 / Phase 1–2).
- **D-05:** **Réutiliser** les patterns **Phase 2** lorsqu’un `job_analysis_workflow_run_id` est présent : **`useWorkflowStream`** + liste d’étapes (**`WorkflowStepList`**, libellés job posting) pour le **live** ; après rechargement, s’appuyer sur les champs persistés (statut mission + `workflow_last_error` si applicable) pour les badges/erreurs.
- **D-06:** Si la liste ne contient pas assez de champs pour l’UI (à valider en implémentation), **enrichir** `GET /api/missions` ou **poser** `useMission(selectedId)` avec `refetchInterval` calqué sur `useMission` existant (`lib/queries/missions.ts` — déjà 3s quand analyse active sur la **fiche** détail). Éviter le polling global agressif sur toute la liste si inutile.

**Données & API (ancrage code actuel)**

- **D-07:** `POST /api/missions` appelle déjà `launchMissionJobPostingAnalysisAfterContentChange` — la mission retournée peut avoir un `job_analysis_workflow_run_id` ; le client doit **relire** cette réalité (invalidation + détail ou champs liste).
- **D-08:** L’interface `Mission` côté `app/review/[id]/positioning/page.tsx` est **incomplète** vs. les colonnes disponibles (`select('*')` côté API) : **étendre les types** et **brancher** l’UI sur l’analyse (workflow run id, présence `job_analysis`, stale éventuel via `job_analysis_stale` si exposé comme sur `GET /api/missions/[id]`).

**Accessibilité & copie**

- **D-09:** Libellés **FR** ; bouton désactivé avec **raison** visible (texte d’aide ou `aria-describedby`) — ex. « Analyse de la fiche en cours… » vs « Analyse terminée — vous pouvez lancer le matching ».

### Claude's Discretion

- Densité du bloc (compact vs. Card pleine largeur) ; ordre exact sous-étapes si réutilisation stricte de `WorkflowStepList` ; micro-copy des tooltips.

### Deferred Ideas (OUT OF SCOPE)

- **Phase 4 (LAT-*)** : Realtime pour rafraîchir la liste / détail sans polling — peut **réduire** le besoin de `refetchInterval` sur cette page une fois livré.
- **Phase 5 (RES-*)** : retry ciblé d’une sous-étape d’analyse mission — hors FLOW-01..03 sauf si le planner fusionne une partie d’erreur recovery.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-------------------|
| FLOW-01 | Après création ou upload d’une mission depuis `/review/[id]/positioning`, l’utilisateur **reste** sur cette URL (pas de redirection obligatoire vers la page détail mission). | D-01, D-02 ; `handleCreateMission`/`useCreateMission` déjà sans `router.push` vers `/positions/[id]` — confirmer aucune redirection implicite. |
| FLOW-02 | La mission nouvellement ajoutée affiche **inline** l’état d’analyse (en cours / terminé / erreur, aligné serveur). | D-04, D-05 ; `useWorkflowStream` + `computeJobPostingStepStates` + `WorkflowStepList` (réf. `MissionJobAnalysis`) ; détail mission via `useMission` ou liste enrichie. |
| FLOW-03 | L’action « positionner » n’est **active** que lorsque l’analyse mission est **terminée avec succès** — **serveur** (pas d’état client volatile seul). | D-03 ; dériver depuis `job_analysis`, `job_analysis_workflow_run_id`, `workflow_last_error`, `job_analysis_stale` ; optionnellement renforcer `POST /api/positioning` (actuellement ne valide pas `job_analysis`). |

</phase_requirements>

## Project Constraints (from .cursor/rules/)

- Aucun fichier dans `.cursor/rules/` (répertoire vide ou absent). Contraintes projet applicables via `AGENTS.md` / `CLAUDE.md` : **pnpm** uniquement ; **ne pas** lancer de workflow LLM depuis `useEffect` / `useLayoutEffect` au montage — **reconnexion** au flux existant ; analyse mission déjà déclenchée **côté API** à la création (`POST /api/missions`).

## Summary

Phase 3 consiste à enrichir la page **liste** `/review/[id]/positioning` pour qu’elle expose la même « vérité » que la fiche mission détail : **analyse job posting** en cours (run id), **terminée** (`job_analysis` + hash aligné), ou **erreur** (`workflow_last_error` + ERR-03). Le flux actuel crée la mission et sélectionne l’ID sans `router.push` vers `/positions/[id]` — **FLOW-01** est déjà largement respecté côté navigation. Le **gap** principal est **l’UI** + **types** : la liste utilise une interface `Mission` minimaliste alors que `GET /api/missions` renvoie `select` équivalent `*`, et le CTA « Analyser le matching » n’est **pas** conditionné à la fin d’analyse mission.

**Primary recommendation:** Pour la mission sélectionnée, utiliser **`useMission(selectedMissionId)`** (déjà `refetchInterval` 3s quand `job_analysis_workflow_run_id` ou activités liées) + sous-composant client **réutilisant** la logique `MissionJobAnalysis` / `useWorkflowStream` + `computeJobPostingStepStates` + `WorkflowStepList` pour FLOW-02 ; calculer **`canStartPositioning`** à partir des champs mission (FLOW-03) et lier le bouton à `aria-describedby` (D-09).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 (`package.json`) | App Router, route handlers | Projet verrouillé |
| React | 19.2.4 | UI | Projet verrouillé |
| @tanstack/react-query | 5.90.21 (pnpm lock) | `useQuery` / `useMutation`, invalidation | Déjà utilisé pour missions / positionings |
| @workflow/next | 4.0.1-beta.66 | Workflow runtime | Projet verrouillé |
| workflow | 4.2.0-beta.70 | `start`, `getRun`, streams | Analyse mission |

**Version registry check:** `npm view @tanstack/react-query version` → **5.95.2** (2026-03-26) ; le projet **épingle** 5.90.21 — ne pas upgrader hors tâche dédiée.

### Supporting

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `sonner` | Toasts | Erreurs stream (pattern `MissionJobAnalysis`) |
| `zod` | Validation API | Inchangé côté routes |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `useMission` + `useWorkflowStream` | Polling liste seule | **Rejeté** : pas de `streamMeta` / pas d’étapes NDJSON sans run ou équivalent |
| Enrichir `GET /api/missions` seulement | `useMission` pour sélection | Liste seule peut suffire si **toutes** colonnes nécessaires ; **D-06** autorise l’une ou l’autre |

## Architecture Patterns

### Recommended structure (two plans)

| Plan | Focus | Deliverables |
|------|--------|--------------|
| **A — Navigation & URL** | FLOW-01 | Confirmer absence de redirection ; `router.push` uniquement après création positioning (inchangé) |
| **B — État UI & queries** | FLOW-02, FLOW-03 | Types mission étendus ; `useMission` ou liste enrichie ; bloc inline + gating CTA |

### Pattern 1: Données mission pour la ligne sélectionnée

**What:** `useMission(id)` avec `enabled: !!selectedMissionId && selectedMissionId === id` — ou une seule query `useMission(selectedMissionId!)` quand une mission est sélectionnée.

**When:** D-06 — éviter polling 3s sur **toute** la liste ; `useMissions()` garde `refetchInterval: 60_000` comme aujourd’hui.

**Example (existing):**

```34:52:lib/queries/missions.ts
    refetchInterval: (query) => {
      const data = query.state.data as
        | {
            job_analysis_workflow_run_id?: string | null;
            positionings?: Array<{ status?: string; candidates?: { status?: string } | null }>;
          }
        | undefined;

      const hasActiveJobAnalysis = !!data?.job_analysis_workflow_run_id;
      // ...
      if (hasActiveJobAnalysis || hasActivePositioning || hasActiveCandidate) return 3000;
      return false;
    },
```

### Pattern 2: Stream job posting — réutiliser Phase 2

**What:** Même contrat que `MissionJobAnalysis` : `useWorkflowStream` avec `api: /api/missions/${id}/analyze-job`, `runId` = `job_analysis_workflow_run_id`, `runStatus: 'extracting'`, `activeStatuses: ['extracting']`.

**Example (existing):**

```114:126:components/mission-job-analysis.tsx
  const stream = useWorkflowStream<Partial<JobPostingAnalysis>, JobPostingAnalysisStreamMeta>({
    api: `/api/missions/${missionId}/analyze-job`,
    runId: jobAnalyzeActive ? job_analysis_workflow_run_id ?? undefined : undefined,
    runStatus: jobAnalyzeActive ? 'extracting' : undefined,
    activeStatuses: ['extracting'],
    onFinish: () => {
      invalidate();
      toast.success('Analyse terminee avec succes');
    },
    onStartOnly: async () => {
      await queryClient.refetchQueries({ queryKey: queryKeys.missions.detail(missionId) });
    },
  });
```

**Note:** Sur la page liste, décider si le toast `toast.success` à chaque fin d’analyse est souhaitable (peut être bruyant) — **Claude's Discretion** / produit.

### Pattern 3: Lignes d’étapes — `computeJobPostingStepStates`

**What:** Passer `streamMeta`, `partialData`, `isStreaming`, `errorStepKey`, `persistedError: workflow_last_error`, `workflowFailed`.

**Source:** `lib/workflow/compute-step-status.ts` — `computeJobPostingStepStates`.

### Pattern 4: « Prêt pour positionnement » (FLOW-03)

**What:** Aligner sur la **logique métier** déjà documentée dans `MissionJobAnalysis` pour « analyse persistée » : présence de contenu utile dans `job_analysis`, et **pas** de run actif (`job_analysis_workflow_run_id` vide après succès workflow). En plus, traiter **erreur** (`workflow_last_error`) et **stale** (`job_analysis_stale` depuis `GET /api/missions/[id]`).

**Gap:** `POST /api/positioning` n’exige pas encore `job_analysis` — **recommandation** : implémenter le **gating UI** (obligatoire FLOW-03) ; option **MEDIUM** : ajouter une **validation serveur** 409 si mission sans analyse valide (défense en profondeur).

### Anti-Patterns to Avoid

- **Lancer** `analyze-job` depuis un `useEffect` « si pas encore fait » — interdit par les règles projet ; l’analyse est déjà déclenchée par `POST /api/missions` + trigger.
- **`disabled={createPositioning.isPending}` seul** — **rejeté** par D-03.
- **Polling global** sur `useMissions` à 3s pour toutes les lignes — **rejeté** par D-06 si évitable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Liste d’étapes FR + statuts | Badges ad hoc | `WorkflowStepList` + `computeJobPostingStepStates` | Parité Phase 2, ERR-03 |
| Reconnexion NDJSON | Fetch manuel | `useWorkflowStream` | Gestion `pendingRunId`, reconnexion, `errorStepKey` |
| Libellés d’étape | Strings en dur | `getFrenchStepShortLabel('jobPosting', key)` | `lib/workflow/workflow-step-labels.ts` |

**Key insight:** `MissionJobAnalysis` est le **référentiel comportemental** ; extraire un **wrapper** ou props **partagées** (bloc compact) évite la dérive.

## Common Pitfalls

### Pitfall 1: `runStatus` et reconnexion

**What goes wrong:** Sans `job_analysis_workflow_run_id` ou sans statut reconnu, `useWorkflowStream` ne se reconnecte pas.

**Why:** `useLayoutEffect` exige `runId` + `runStatus` dans `activeStatuses` (`useWorkflowStream.ts`).

**How to avoid:** Passer les mêmes props que `MissionJobAnalysis` (`extracting`).

### Pitfall 2: Liste GET sans `job_analysis_stale`

**What goes wrong:** La liste brute n’a pas le flag calculé présent sur `GET /api/missions/[id]`.

**Why:** `job_analysis_stale` est **calculé** dans `[id]/route.ts` (hash vs `job_description`).

**How to avoid:** Utiliser **`useMission`** pour la sélection, ou calculer côté client si hash exposé, ou enrichir `GET /api/missions` avec le même calcul (coût : hash sur chaque ligne).

### Pitfall 3: Toast duplicate / succès

**What goes wrong:** `onFinish` dans `MissionJobAnalysis` toast à chaque analyse.

**Why:** Sur la page liste, l’utilisateur peut trouver le toast redondant avec le bloc inline.

**How to avoid:** Désactiver ou adoucir le toast sur cette surface (discretion).

### Pitfall 4: CTA « Analyser le matching » — libellé vs action

**What goes wrong:** Confusion entre **analyse mission** / **analyse matching** (positionnement).

**Why:** Le bouton lance `createPositioning` puis navigation vers le wizard — le **prérequis** est l’analyse **mission**.

**How to avoid:** Texte d’aide (D-09) expliquant que la **fiche mission** doit être analysée avant le **matching** (voir `03-UI-SPEC.md`).

## Code Examples

### Invalidation après création mission (déjà en place)

```69:75:lib/queries/missions.ts
    onSuccess: (data: Record<string, unknown> & { id?: string }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missions.list() });
      if (data?.id) {
        queryClient.setQueryData(queryKeys.missions.detail(data.id as string), data);
        queryClient.invalidateQueries({ queryKey: queryKeys.missions.detail(data.id) });
      }
    },
```

### POST mission + analyse

```62:72:app/api/missions/route.ts
    try {
      await launchMissionJobPostingAnalysisAfterContentChange(supabase, data.id as string, {
        skipIfAlreadyCurrent: false,
      });
    } catch (e) {
      console.error('Mission job analysis auto-start:', e);
    }

    const { data: refreshed } = await supabase.from('missions').select().eq('id', data.id).single();

    return NextResponse.json(refreshed ?? data);
```

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Aller sur `/positions/[id]` pour attendre l’analyse | Rester sur `/review/.../positioning` avec bloc inline | Décision produit Phase 3 |
| CTA matching sans prérequis mission | Gating par champs serveur | FLOW-03 |

**Deprecated/out-of-scope:** Realtime (LAT-01) — Phase 4.

## Open Questions

1. **Faut-il valider `job_analysis` dans `POST /api/positioning` ?**
   - What we know: UI doit gate (FLOW-03) ; API accepte tout `missionId` avec `job_description`.
   - What's unclear: Exigence produit pour **faille** si appel API direct.
   - Recommendation: Phase 3 = UI + documenter ; option 409 en **plan séparé** ou petit patch si le planner l’inclut.

2. **`GET /api/missions` doit-il exposer `job_analysis_stale` ?**
   - What we know: `useMission` l’a déjà via `GET [id]`.
   - What's unclear: Si on évite `useMission` et qu’on lit **liste seulement**.
   - Recommendation: Préférer `useMission(selectedId)` pour une source unique de vérité.

## Environment Availability

**Step 2.6: SKIPPED** — Phase purement applicative (pas de nouveau CLI, pas de service externe hors stack déjà requise pour le projet). Node **v22.21.1** (AGENTS.md).

---

## Sources

### Primary (HIGH confidence)

- Codebase : `app/review/[id]/positioning/page.tsx`, `lib/queries/missions.ts`, `app/api/missions/route.ts`, `app/api/missions/[id]/route.ts`, `components/mission-job-analysis.tsx`, `lib/hooks/useWorkflowStream.ts`, `lib/services/job-posting-analyze-trigger.ts`, `lib/workflow/compute-step-status.ts`, `supabase/migrations/20260412_workflow_last_error.sql`
- `.planning/phases/03-positioning-mission-upload-inline-status/03-CONTEXT.md`, `03-UI-SPEC.md`

### Secondary (MEDIUM confidence)

- `app/api/positioning/route.ts` — absence de validation `job_analysis` au moment de la recherche

### Tertiary (LOW confidence)

- —

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — versions lues dans `package.json`
- Architecture: **HIGH** — patterns alignés sur `MissionJobAnalysis` + décisions CONTEXT
- Pitfalls: **MEDIUM** — stale / liste vs détail vérifiés dans le code

**Research date:** 2026-03-26  
**Valid until:** ~2026-04-26 (ajuster si refonte missions API)

## RESEARCH COMPLETE
