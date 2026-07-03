# Roadmap: Next-ESN

## Milestones

- ✅ **v1.0 AI Workflow Reliability** — Phases 1–2 (shipped 2026-03-26)
- ⏸ **v1.1 Réactivité, flux & résilience** — Phases 3–5 (partial — Phase 3 complete, Phases 4–5 not started)
- ⏸ **v1.2 Multi-langue** — Phases 6–8 (parked 2026-07-03 — Phase 6 shipped, Phases 7–8 documented in `.planning/milestones/v1.2-ROADMAP.md`)
- 🚧 **v1.3 Prospection** — Phases 9–14 (in progress)

> **Note:** v1.2 is parked — Phase 6 (DB + Schema Foundation) was shipped; the bulk of language detection and label wiring was covered by quick tasks (see STATE.md). Phases 7–8 remain documented in `.planning/milestones/v1.2-ROADMAP.md` for future resumption.

## Phases

<details>
<summary>✅ v1.0 AI Workflow Reliability (Phases 1–2) — SHIPPED 2026-03-26</summary>

- [x] **Phase 1: Server Contract & Core UI Reliability** (2/2 plans) — completed 2026-03-26
- [x] **Phase 2: Sub-Step Progress & Step Error Attribution** (3/3 plans) — completed 2026-03-26

Archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>⏸ v1.1 Réactivité, flux & résilience (Phases 3–5) — PARTIAL</summary>

- [x] **Phase 3: Positioning Mission Upload & Inline Status** (2/2 plans) — FLOW-01, FLOW-02, FLOW-03 — completed 2026-03-26
- [ ] **Phase 4: Realtime & Generation Freshness** — LAT-01, LAT-02 — parked
- [ ] **Phase 5: Partial Failure & Targeted Retry** — RES-01, RES-02 — parked

</details>

<details>
<summary>⏸ v1.2 Multi-langue (Phases 6–8) — PARKED 2026-07-03</summary>

- [x] **Phase 6: DB + Schema Foundation** — LANG-05, PROMPT-02 (completed 2026-06-04)
- [ ] **Phase 7: Workflow Detection + Prompt Injection** — LANG-01, LANG-02, AI-01..06, PROMPT-01 — parked
- [ ] **Phase 8: PDF Wiring + Manual Override UI** — LANG-03, LANG-04, PDF-01, PDF-02 — parked

Archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

### 🚧 v1.3 Prospection

**Milestone Goal:** Donner aux recruteurs ESN une liste d'entreprises « chaudes » — susceptibles de recruter avant même d'avoir publié une annonce — avec le bon contact à appeler, alimentée par des automations à critères.

- [ ] **Phase 9: DB + Schema Foundation + Proxycurl Audit** — SIG-04, CONT-04, CONT-05
- [ ] **Phase 10: First Collector + Deterministic Scoring + Cron Infrastructure** — SIG-02, SCOR-01, SCOR-02, AUTO-05, AUTO-06
- [ ] **Phase 11: Additional Collectors + SIREN Reconciliation** — SIG-01, SIG-03, SIG-06
- [ ] **Phase 12: LLM Score Synthesis** — SCOR-03, SCOR-04, SIG-05
- [ ] **Phase 13: Contact Enrichment (Heat-Gated)** — CONT-01, CONT-02, CONT-03
- [ ] **Phase 14: Automation UI + Company List + Actions** — AUTO-01, AUTO-02, AUTO-03, AUTO-04, LIST-01, LIST-02, LIST-03

## Phase Details

### Phase 3: Positioning Mission Upload & Inline Status

**Goal**: Depuis `/review/[id]/positioning`, ajout / upload d'une mission sans quitter la page ; état d'analyse visible sur place ; CTA positionnement uniquement quand l'analyse mission est OK côté serveur.

**Depends on**: v1.0 (contrats workflow + UI fiabilisés)

**Requirements**: FLOW-01, FLOW-02, FLOW-03

**Success criteria** (observables utilisateur):

1. Après upload / création de mission depuis cet écran, l'URL reste la page de positionnement du candidat (sauf action utilisateur explicite ailleurs).
2. La mission concernée montre un état « analyse en cours » puis « prête » ou « erreur » de façon lisible sans ouvrir une autre page.
3. Le bouton ou lien de positionnement pour cette mission est désactivé ou absent tant que l'analyse n'a pas réussi ; il s'active automatiquement quand le statut serveur le permet.

**Plans**: 2 plans

Plans:

- [x] `03-01-PLAN.md` — FLOW-01 : audit navigation hub positionnement (pas de redirection obligatoire vers `/positions/[id]`) + commentaire d'invariant
- [x] `03-02-PLAN.md` — FLOW-02 + FLOW-03 : `useMission` sélection, bloc inline analyse (`WorkflowStepList`), gating CTA « Analyser le matching » + `aria-describedby`

**UI hint**: yes

---

### Phase 9: DB + Schema Foundation + Proxycurl Audit

**Goal**: Les 7 tables du domaine prospection existent avec les contraintes SIREN, TTL et RGPD correctes dès le départ — et le code `lib/radar/` mort (Proxycurl) est audité et ne peut plus être copié par erreur dans les phases suivantes.

**Depends on**: Nothing (new domain, no existing prospection tables)

**Requirements**: SIG-04, CONT-04, CONT-05

**Success Criteria** (what must be TRUE):

1. Les 7 tables prospection (`prospection_automations`, `prospection_companies`, `prospection_signals`, `prospection_scores`, `prospection_contacts`, `prospection_run_logs`, `prospection_actions`) existent dans Supabase avec RLS org-scoped.
2. La contrainte `UNIQUE(org_id, siren)` sur `prospection_companies` empêche les doublons — deux inserts avec le même SIREN dans la même org en rejettent un.
3. Les colonnes RGPD (`gdpr_retention_expires_at`, `contact_source`, `contact_sourced_at`) sont présentes sur `prospection_contacts` avec `NOT NULL`.
4. Les colonnes TTL (`signal_last_fetched_at`) et `enrichment_gated_at` existent pour contrôler les coûts API dès le schéma.
5. Un audit des références Proxycurl dans `lib/radar/` est documenté — aucun nouveau code ne peut s'appuyer sur ces références mortes ; ScrapIn + Dropcontact sont confirmés comme remplaçants.

**Plans**: TBD

---

### Phase 10: First Collector + Deterministic Scoring + Cron Infrastructure

**Goal**: Un pipeline complet fonctionne de bout en bout — déclenchement cron ou manuel → collecte des offres d'emploi France Travail → score déterministe calculé → résultats persistés en DB — sans risque de doublon de run.

**Depends on**: Phase 9

**Requirements**: SIG-02, SCOR-01, SCOR-02, AUTO-05, AUTO-06

**Success Criteria** (what must be TRUE):

1. Un run manuel ou cron collecte les offres France Travail pour les entreprises correspondant aux critères de l'automation et persiste les signaux dans `prospection_signals`.
2. Chaque entreprise reçoit un score numérique 0–100 calculé uniquement par la fonction de règles déterministes (`computeProspectScore`) — jamais par un LLM.
3. Le score décroît en fonction de l'ancienneté des signaux (decay) — une entreprise avec uniquement des signaux vieux de 60 jours a un score inférieur à la même entreprise avec des signaux de la semaine.
4. Deux déclenchements cron simultanés n'entraînent pas deux runs parallèles pour la même automation (advisory lock Supabase ou équivalent actif).
5. La page d'administration affiche l'état du dernier run (en cours / terminé / erreur) et sa date pour chaque automation.

**Plans**: TBD

---

### Phase 11: Additional Collectors + SIREN Reconciliation

**Goal**: Le pipeline ingère des signaux de trois sources complémentaires (SIRENE/INSEE, Pappers, ScrapIn) et fusionne correctement les entreprises remontées par plusieurs sources ou automations via le SIREN comme clé stable.

**Depends on**: Phase 10

**Requirements**: SIG-01, SIG-03, SIG-06

**Success Criteria** (what must be TRUE):

1. Le collecteur Pappers ramène des signaux financiers (croissance, actes BODACC) pour les entreprises matchant les critères et les persiste dans `prospection_signals`.
2. Le collecteur ScrapIn ramène des signaux LinkedIn (croissance d'effectifs, arrivées de décideurs) uniquement pour les entreprises au-dessus du seuil de chaleur (heat-gated).
3. Une entreprise remontée par deux collecteurs différents ou deux automations différentes n'apparaît qu'une fois dans `prospection_companies` — les signaux des deux sources sont fusionnés sur la même ligne (SIREN unique par org).
4. Si un collecteur échoue pendant un run, les signaux déjà collectés par les autres sources sont conservés — le run se termine avec résultats partiels, et l'erreur est attribuée au collecteur en faute.

**Plans**: TBD

---

### Phase 12: LLM Score Synthesis

**Goal**: Chaque entreprise chaude dispose d'une justification lisible en 2-3 phrases et d'un pitch d'appel contextualisé ESN, générés par LLM à partir des signaux réels — jamais à partir de texte libre.

**Depends on**: Phase 11

**Requirements**: SCOR-03, SCOR-04, SIG-05

**Success Criteria** (what must be TRUE):

1. Chaque entreprise affiche ses signaux sources sous forme de badges (type + date) lisibles sans lire le texte du LLM — le score est explicable visuellement.
2. Chaque entreprise affiche une justification en 2-3 phrases fondée sur ses signaux réels (pas d'hallucination — le LLM ne reçoit que la liste structurée des signaux).
3. Chaque entreprise affiche un pitch d'appel qui intègre les « profils à placer » de l'automation source.
4. Le `signal_snapshot` utilisé pour générer la synthèse est persisté avec le score — la synthèse est reproductible et auditable.

**Plans**: TBD

---

### Phase 13: Contact Enrichment (Heat-Gated)

**Goal**: Pour les entreprises au-dessus du seuil, un décideur est identifié et son email enrichi via Dropcontact — avec toutes les gates coûts et RGPD actives et validées en staging avant activation cron.

**Depends on**: Phase 12

**Requirements**: CONT-01, CONT-02, CONT-03

**Success Criteria** (what must be TRUE):

1. Pour une entreprise avec score ≥ seuil, un décideur est visible dans le détail (nom, poste, profil LinkedIn).
2. L'email du décideur est enrichi via Dropcontact et persisté dans `prospection_contacts`.
3. Pour une entreprise avec score < seuil, le CTA « Voir le contact » est désactivé avec une explication visible (seuil non atteint).
4. Le cache 7 jours sur l'enrichissement fonctionne — un deuxième run ne rappelle pas Dropcontact pour un contact déjà enrichi récemment.
5. Les colonnes RGPD (`gdpr_retention_expires_at`, `contact_source`) sont correctement remplies à chaque enrichissement — conformité vérifiée en staging.

**Plans**: TBD

---

### Phase 14: Automation UI + Company List + Actions

**Goal**: Les recruteurs peuvent créer et gérer leurs automations, consulter la liste des entreprises chaudes triée par score, voir les détails d'une entreprise avec signaux et pitch, et mettre à jour le statut d'action — tout le pipeline back-end est exposé dans une UI actionnable.

**Depends on**: Phase 13

**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, LIST-01, LIST-02, LIST-03

**Success Criteria** (what must be TRUE):

1. Le recruteur peut créer, modifier et supprimer une automation avec critères (secteur, taille, géo, profils à placer) depuis `/prospection/settings`.
2. Le recruteur peut déclencher un run manuel « Lancer maintenant » depuis l'UI — même pipeline que le cron.
3. `/prospection` affiche la liste des entreprises triée par score décroissant avec timestamp « dernière mise à jour ».
4. Le recruteur peut filtrer la liste par statut (à appeler / appelé / écarté) et par automation source.
5. Le recruteur peut changer le statut d'une entreprise (à appeler → appelé → écarté) et la modification persiste par org.

**Plans**: TBD

**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–2 | v1.0 | 5/5 | Complete | 2026-03-26 |
| 3 | v1.1 | 2/2 | Complete | 2026-03-26 |
| 4 | v1.1 | 0/TBD | Parked | — |
| 5 | v1.1 | 0/TBD | Parked | — |
| 6 | v1.2 | 3/3 | Complete | 2026-06-04 |
| 7 | v1.2 | 0/TBD | Parked | — |
| 8 | v1.2 | 0/TBD | Parked | — |
| 9 | v1.3 | 0/TBD | Not started | — |
| 10 | v1.3 | 0/TBD | Not started | — |
| 11 | v1.3 | 0/TBD | Not started | — |
| 12 | v1.3 | 0/TBD | Not started | — |
| 13 | v1.3 | 0/TBD | Not started | — |
| 14 | v1.3 | 0/TBD | Not started | — |
