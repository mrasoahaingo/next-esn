# Roadmap: Next-ESN

## Milestones

- ✅ **v1.0 AI Workflow Reliability** — Phases 1–2 (shipped 2026-03-26)
- ⏸ **v1.1 Réactivité, flux & résilience** — Phases 3–5 (partial — Phase 3 complete, Phases 4–5 not started)
- ⏸ **v1.2 Multi-langue** — Phases 6–8 (parked 2026-07-03 — Phase 6 shipped, Phases 7–8 documented in `.planning/milestones/v1.2-ROADMAP.md`)
- ⏸ **v1.3 Prospection** — Phases 9–14 (parked 2026-11-24 — Phase 9 arrêtée avant 09-04 (3/4 plans), code retiré du produit ; détails dans `.planning/milestones/v1.3-ROADMAP.md`)

> **Note:** v1.2 is parked — Phase 6 (DB + Schema Foundation) was shipped; the bulk of language detection and label wiring was covered by quick tasks (see STATE.md). Phases 7–8 remain documented in `.planning/milestones/v1.2-ROADMAP.md` for future resumption.

> **Note :** v1.3 est parké — la prospection et le radar sont retirés du produit (quick `261124-lfg`) et seront retravaillés plus tard ; le produit se recentre sur la gestion des CV et le positionnement CV ↔ missions. Une migration `*_drop_radar.sql` existe dans le dépôt mais n'est **PAS** appliquée en prod (en attente d'accord explicite de l'utilisateur). Phases 9–14 documentées dans `.planning/milestones/v1.3-ROADMAP.md`.

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

<details>
<summary>⏸ v1.3 Prospection (Phases 9–14) — PARKED 2026-11-24</summary>

- [ ] **Phase 9: DB + Schema Foundation + Proxycurl Audit** — SIG-04, CONT-04, CONT-05 — 3/4 plans — arrêtée avant 09-04 (migration prospection jamais appliquée ; code retiré du produit)
- [ ] **Phase 10: First Collector + Deterministic Scoring + Cron Infrastructure** — SIG-02, SCOR-01, SCOR-02, AUTO-05, AUTO-06 — parked
- [ ] **Phase 11: Additional Collectors + SIREN Reconciliation** — SIG-01, SIG-03, SIG-06 — parked
- [ ] **Phase 12: LLM Score Synthesis** — SCOR-03, SCOR-04, SIG-05 — parked
- [ ] **Phase 13: Contact Enrichment (Heat-Gated)** — CONT-01, CONT-02, CONT-03 — parked
- [ ] **Phase 14: Automation UI + Company List + Actions** — AUTO-01, AUTO-02, AUTO-03, AUTO-04, LIST-01, LIST-02, LIST-03 — parked

Archive: `.planning/milestones/v1.3-ROADMAP.md`

</details>

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
| 9 | v1.3 | 3/4 | Parked | — |
| 10 | v1.3 | 0/TBD | Parked | — |
| 11 | v1.3 | 0/TBD | Parked | — |
| 12 | v1.3 | 0/TBD | Parked | — |
| 13 | v1.3 | 0/TBD | Parked | — |
| 14 | v1.3 | 0/TBD | Parked | — |
