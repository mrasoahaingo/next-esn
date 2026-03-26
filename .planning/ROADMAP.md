# Roadmap: Next-ESN

## Milestones

- ✅ **v1.0 AI Workflow Reliability** — Phases 1–2 (shipped 2026-03-26)
- 🚧 **v1.1 Réactivité, flux & résilience** — Phases 3–5 (in progress)

## Overview (v1.1)

Enchaîner après la fiabilité v1.0 : d’abord le **flux critique** création de mission depuis la page positionnement (inline, pas de redirection), puis la **réactivité** (Realtime / fraîcheur), puis la **résilience** (échec partiel, retry ciblé).

## Phases

<details>
<summary>✅ v1.0 AI Workflow Reliability (Phases 1–2) — SHIPPED 2026-03-26</summary>

- [x] **Phase 1: Server Contract & Core UI Reliability** (2/2 plans) — completed 2026-03-26
- [x] **Phase 2: Sub-Step Progress & Step Error Attribution** (3/3 plans) — completed 2026-03-26

Archive : `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 — upcoming

- [ ] **Phase 3: Positioning Mission Upload & Inline Status** — FLOW-01, FLOW-02, FLOW-03
- [ ] **Phase 4: Realtime & Generation Freshness** — LAT-01, LAT-02
- [ ] **Phase 5: Partial Failure & Targeted Retry** — RES-01, RES-02

## Phase Details

### Phase 3: Positioning Mission Upload & Inline Status

**Goal** : Depuis `/review/[id]/positioning`, ajout / upload d’une mission sans quitter la page ; état d’analyse visible sur place ; CTA positionnement uniquement quand l’analyse mission est OK côté serveur.

**Depends on** : v1.0 (contrats workflow + UI fiabilisés)

**Requirements** : FLOW-01, FLOW-02, FLOW-03

**Success criteria** (observables utilisateur) :

1. Après upload / création de mission depuis cet écran, l’URL reste la page de positionnement du candidat (sauf action utilisateur explicite ailleurs).
2. La mission concernée montre un état « analyse en cours » puis « prête » ou « erreur » de façon lisible sans ouvrir une autre page.
3. Le bouton ou lien de positionnement pour cette mission est désactivé ou absent tant que l’analyse n’a pas réussi ; il s’active automatiquement quand le statut serveur le permet.

**Plans** : 2 plans

Plans:

- [ ] `03-01-PLAN.md` — FLOW-01 : audit navigation hub positionnement (pas de redirection obligatoire vers `/positions/[id]`) + commentaire d’invariant
- [ ] `03-02-PLAN.md` — FLOW-02 + FLOW-03 : `useMission` sélection, bloc inline analyse (`WorkflowStepList`), gating CTA « Analyser le matching » + `aria-describedby`

**UI hint** : yes

---

### Phase 4: Realtime & Generation Freshness

**Goal** : Réduire la latence perçue entre mise à jour Supabase et UI ; exposer la fraîcheur des résultats générés.

**Depends on** : Phase 3 (recommandé — même surfaces candidat/mission/positionnement)

**Requirements** : LAT-01, LAT-02

**Success criteria** :

1. Les vues concernées se mettent à jour sans dépendre uniquement d’un polling long quand Realtime est applicable et activé.
2. L’utilisateur voit quand le dernier résultat IA a été produit (horodatage ou équivalent sur les périmètres de la phase).

**Plans** : TBD

**UI hint** : yes

---

### Phase 5: Partial Failure & Targeted Retry

**Goal** : Cas où une sous-étape échoue ; restitution claire + retry ciblé si le runtime le permet.

**Depends on** : Phase 4 (peut chevaucher conceptuellement avec Phase 3 pour l’UX d’erreur — à découper en plans)

**Requirements** : RES-01, RES-02

**Success criteria** :

1. Pas de « tout rouge » opaque : l’utilisateur voit ce qui est encore valide.
2. Une action permet de relancer l’étape en échec sans repartir de zéro, ou la doc / l’UI explique la limitation si le runtime l’interdit.

**Plans** : TBD

**UI hint** : yes

---

## Progress

| Phase | Milestone | Plans complete | Status | Completed |
| ----- | --------- | ---------------- | ------ | --------- |
| 1–2 | v1.0 | 5/5 | Complete | 2026-03-26 |
| 3 | v1.1 | 0/2 | Not started | — |
| 4 | v1.1 | 0/TBD | Not started | — |
| 5 | v1.1 | 0/TBD | Not started | — |
