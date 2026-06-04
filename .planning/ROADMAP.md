# Roadmap: Next-ESN

## Milestones

- ✅ **v1.0 AI Workflow Reliability** — Phases 1–2 (shipped 2026-03-26)
- 🚧 **v1.1 Réactivité, flux & résilience** — Phases 3–5 (in progress)
- 📋 **v1.2 Multi-langue** — Phases 6–8 (planned)

## Overview (v1.1)

Enchaîner après la fiabilité v1.0 : d'abord le **flux critique** création de mission depuis la page positionnement (inline, pas de redirection), puis la **réactivité** (Realtime / fraîcheur), puis la **résilience** (échec partiel, retry ciblé).

## Phases

<details>
<summary>✅ v1.0 AI Workflow Reliability (Phases 1–2) — SHIPPED 2026-03-26</summary>

- [x] **Phase 1: Server Contract & Core UI Reliability** (2/2 plans) — completed 2026-03-26
- [x] **Phase 2: Sub-Step Progress & Step Error Attribution** (3/3 plans) — completed 2026-03-26

Archive : `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 — upcoming

- [x] **Phase 3: Positioning Mission Upload & Inline Status** (2/2 plans) — FLOW-01, FLOW-02, FLOW-03 — completed 2026-03-26
- [ ] **Phase 4: Realtime & Generation Freshness** — LAT-01, LAT-02
- [ ] **Phase 5: Partial Failure & Targeted Retry** — RES-01, RES-02

### v1.2 — Multi-langue

- [x] **Phase 6: DB + Schema Foundation** — LANG-05, PROMPT-02 (completed 2026-06-04)
- [ ] **Phase 7: Workflow Detection + Prompt Injection** — LANG-01, LANG-02, AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, PROMPT-01
- [ ] **Phase 8: PDF Wiring + Manual Override UI** — LANG-03, LANG-04, PDF-01, PDF-02

## Phase Details

### Phase 3: Positioning Mission Upload & Inline Status

**Goal** : Depuis `/review/[id]/positioning`, ajout / upload d'une mission sans quitter la page ; état d'analyse visible sur place ; CTA positionnement uniquement quand l'analyse mission est OK côté serveur.

**Depends on** : v1.0 (contrats workflow + UI fiabilisés)

**Requirements** : FLOW-01, FLOW-02, FLOW-03

**Success criteria** (observables utilisateur) :

1. Après upload / création de mission depuis cet écran, l'URL reste la page de positionnement du candidat (sauf action utilisateur explicite ailleurs).
2. La mission concernée montre un état « analyse en cours » puis « prête » ou « erreur » de façon lisible sans ouvrir une autre page.
3. Le bouton ou lien de positionnement pour cette mission est désactivé ou absent tant que l'analyse n'a pas réussi ; il s'active automatiquement quand le statut serveur le permet.

**Plans** : 2 plans

Plans:

- [x] `03-01-PLAN.md` — FLOW-01 : audit navigation hub positionnement (pas de redirection obligatoire vers `/positions/[id]`) + commentaire d'invariant
- [x] `03-02-PLAN.md` — FLOW-02 + FLOW-03 : `useMission` sélection, bloc inline analyse (`WorkflowStepList`), gating CTA « Analyser le matching » + `aria-describedby`

**UI hint** : yes

---

### Phase 4: Realtime & Generation Freshness

**Goal** : Réduire la latence perçue entre mise à jour Supabase et UI ; exposer la fraîcheur des résultats générés.

**Depends on** : Phase 3 (recommandé — même surfaces candidat/mission/positionnement)

**Requirements** : LAT-01, LAT-02

**Success criteria** :

1. Les vues concernées se mettent à jour sans dépendre uniquement d'un polling long quand Realtime est applicable et activé.
2. L'utilisateur voit quand le dernier résultat IA a été produit (horodatage ou équivalent sur les périmètres de la phase).

**Plans** : TBD

**UI hint** : yes

---

### Phase 5: Partial Failure & Targeted Retry

**Goal** : Cas où une sous-étape échoue ; restitution claire + retry ciblé si le runtime le permet.

**Depends on** : Phase 4 (peut chevaucher conceptuellement avec Phase 3 pour l'UX d'erreur — à découper en plans)

**Requirements** : RES-01, RES-02

**Success criteria** :

1. Pas de « tout rouge » opaque : l'utilisateur voit ce qui est encore valide.
2. Une action permet de relancer l'étape en échec sans repartir de zéro, ou la doc / l'UI explique la limitation si le runtime l'interdit.

**Plans** : TBD

**UI hint** : yes

---

### Phase 6: DB + Schema Foundation

**Goal** : Ajouter les colonnes de langue en DB et dans les schémas Zod, et activer le guard `resolveLlmTask` — zéro changement de comportement en production.

**Depends on** : Phase 5 (v1.1 complete)

**Requirements** : LANG-05, PROMPT-02

**Success criteria** (what must be TRUE) :

1. Les colonnes `candidates.language`, `missions.language`, `organization_settings.default_language` existent avec `NOT NULL DEFAULT 'fr'` — les lignes existantes sont inchangées.
2. `extractionIdentitySchema` contient un champ `language: z.enum(['fr','en'])`.
3. Un map `CV_LABELS: Record<'fr'|'en', {...}>` existe dans `templates/cv-dossier-layout.ts` (même si non encore câblé à l'export PDF).
4. `resolveLlmTask` émet un `console.warn` quand le prompt rendu contient encore `{{` — la garde est active.

**Plans** : 3 plans

Plans:

- [ ] `06-01-PLAN.md` — Migration SQL : colonnes language sur candidates, missions, organization_settings (LANG-05)
- [ ] `06-02-PLAN.md` — Schémas Zod : language dans extractionIdentitySchema + CV_LABELS dans cv-dossier-layout.ts (LANG-05)
- [ ] `06-03-PLAN.md` — Guard resolveLlmTask : console.warn sur placeholders {{ non résolus (PROMPT-02)

---

### Phase 7: Workflow Detection + Prompt Injection

**Goal** : Détecter la langue dans les workflows, la persister en DB, et injecter `{{language}}` dans tous les prompts LLM et builders de contenu utilisateur concernés.

**Depends on** : Phase 6

**Requirements** : LANG-01, LANG-02, AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, PROMPT-01

**Success criteria** (what must be TRUE) :

1. Après upload d'un CV en anglais, `candidates.language = 'en'` est persisté en DB (vérifiable via Supabase).
2. Après analyse d'une mission en anglais, `missions.language = 'en'` est persisté en DB.
3. Les branches d'extraction CV (expériences, formations, compétences) s'exécutent APRÈS la branche identity — identity fournit `language` à leur contexte.
4. La branche `cv.transcription` ne reçoit PAS `{{language}}` dans son contexte.
5. Tous les workflows de positionnement lisent `missions.language` et le passent à chaque appel `resolveLlmTask`.
6. Tous les artefacts de génération de positionnement (CV tailored, emails) sont produits dans la langue de `missions.language`.
7. Une instruction d'ancre verbatim est présente dans les prompts : les noms de produits / entreprises / certifications sont préservés tels quels.

**Plans** : TBD

---

### Phase 8: PDF Wiring + Manual Override UI

**Goal** : Câbler la langue dans la chaîne de génération PDF et exposer des sélecteurs de langue à l'utilisateur.

**Depends on** : Phase 7

**Requirements** : LANG-03, LANG-04, PDF-01, PDF-02

**Success criteria** (what must be TRUE) :

1. Le PDF exporté depuis le CV builder affiche les labels de section en anglais (`Skills`, `Experience`, `Education`) quand `candidates.language = 'en'`.
2. Le CV tailored généré depuis un positionnement utilise les labels de la langue de la mission.
3. Un sélecteur de langue est visible sur la page de review CV et persiste le changement dans `candidates.language` via l'API PATCH — sans déclencher une nouvelle extraction.
4. Un sélecteur de langue est visible sur le formulaire d'édition de mission et persiste le changement dans `missions.language` via l'API PATCH.

**Plans** : TBD

**UI hint** : yes

---

## Progress

| Phase | Milestone | Plans complete | Status | Completed |
| ----- | --------- | ---------------- | ------ | --------- |
| 1–2 | v1.0 | 5/5 | Complete | 2026-03-26 |
| 3 | v1.1 | 2/2 | Complete | 2026-03-26 |
| 4 | v1.1 | 0/TBD | Not started | — |
| 5 | v1.1 | 0/TBD | Not started | — |
| 6 | v1.2 | 3/3 | Complete   | 2026-06-04 |
| 7 | v1.2 | 0/TBD | Not started | — |
| 8 | v1.2 | 0/TBD | Not started | — |
