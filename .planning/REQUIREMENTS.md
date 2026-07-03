# Requirements: Next-ESN

**Defined:** 2026-07-03
**Milestone:** v1.3 Prospection
**Core value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille

v1.1 requirements : `.planning/milestones/v1.1-REQUIREMENTS.md` (FLOW-*, LAT-*, RES-*)
v1.2 requirements (parké) : `.planning/milestones/v1.2-REQUIREMENTS.md` (LANG-*, PDF-*, PROMPT-*)

---

## v1.3 Requirements

Requirements pour le milestone Prospection. Chacun mappe vers une phase de la roadmap.

### Automations

- [ ] **AUTO-01**: Le recruteur peut créer une automation avec critères de ciblage (secteur, taille d'effectif, zone géographique) et profils à placer
- [ ] **AUTO-02**: Le recruteur peut modifier et supprimer une automation
- [ ] **AUTO-03**: Le recruteur peut créer plusieurs automations dans son org (une par verticale), résultats tagués par automation source
- [ ] **AUTO-04**: Le recruteur peut lancer une automation manuellement (« lancer maintenant »), même pipeline que le cron
- [ ] **AUTO-05**: Les automations s'exécutent périodiquement via cron sans double exécution (lock/idempotence — gap connu de `@workflow/next`)
- [ ] **AUTO-06**: Le recruteur voit l'état du run (en cours / terminé / erreur) et la date du dernier run par automation

### Signaux

- [ ] **SIG-01**: Le pipeline collecte les signaux levées/croissance via Pappers pour les entreprises matchant les critères
- [ ] **SIG-02**: Le pipeline collecte l'historique d'annonces via l'API France Travail
- [ ] **SIG-03**: Le pipeline collecte la croissance d'effectifs et les arrivées de décideurs LinkedIn via ScrapIn
- [ ] **SIG-04**: Les entreprises sont réconciliées par SIREN — une entreprise remontée par deux automations n'apparaît qu'une fois, signaux fusionnés
- [ ] **SIG-05**: Chaque entreprise affiche ses signaux sources (badge par type avec date)
- [ ] **SIG-06**: Un collecteur en échec n'invalide pas le run — résultats partiels conservés, erreur attribuée à la source

### Scoring

- [ ] **SCOR-01**: Chaque entreprise reçoit un score de chaleur 0–100 calculé par règles pondérées déterministes (jamais par le LLM)
- [ ] **SCOR-02**: Le score décroît avec l'ancienneté des signaux (decay par type de signal)
- [ ] **SCOR-03**: Chaque entreprise a une justification lisible (2-3 phrases, LLM) fondée sur ses signaux réels
- [ ] **SCOR-04**: Chaque entreprise a un pitch d'appel contextualisé ESN (LLM) intégrant les « profils à placer » de l'automation

### Contacts

- [ ] **CONT-01**: Pour une entreprise au-dessus du seuil, un décideur est identifié (nom, poste, profil LinkedIn)
- [ ] **CONT-02**: L'email du décideur est enrichi via Dropcontact (téléphone hors scope v1.3)
- [ ] **CONT-03**: L'enrichissement contact ne se déclenche que si score ≥ seuil ; en dessous, action désactivée avec explication
- [ ] **CONT-04**: L'admin d'org peut configurer le seuil de chaleur (défaut 60)
- [ ] **CONT-05**: Chaque contact stocké porte sa provenance et sa date de collecte (conformité RGPD/CNIL, rétention max 3 ans)

### Liste

- [ ] **LIST-01**: `/prospection` affiche la liste des entreprises triée par score décroissant, avec timestamp « dernière mise à jour »
- [ ] **LIST-02**: Le recruteur peut passer une entreprise en « à appeler / appelé / écarté », persisté par org
- [ ] **LIST-03**: Le recruteur peut filtrer la liste par statut et par automation

## Future Requirements

Différés — tracés mais hors roadmap v1.3.

### Signaux (v1.4)

- **SIG-F1**: Signaux AO/marchés publics gagnés via BOAMP/DECP (différenciateur ESN, gratuit)

### Rétention & équipe (v2+)

- **NOTF-F1**: Digest email des nouvelles entreprises chaudes (quotidien/hebdo par automation)
- **CONT-F1**: Enrichissement téléphone (Kaspr) — attention interdiction démarchage téléphonique non sollicité (août 2026)
- **MATCH-F1**: Matching entreprises chaudes ↔ consultants disponibles (« 2 candidats matchent les besoins de cette entreprise »)
- **LIST-F1**: Snooze / rappel différé
- **LIST-F2**: Assignation d'une entreprise à un collègue

## Out of Scope

Exclusions explicites — documentées pour éviter le scope creep.

| Feature | Reason |
|---------|--------|
| Pipeline CRM complet (RDV, gagné/perdu, relances) | Explosion de scope ; 3 statuts couvrent le besoin réel du recruteur en v1.3 |
| Séquences email / outreach automatisé | Risque RGPD, délivrabilité, réputation — le recruteur initie le contact manuellement avec le pitch copiable |
| Signaux temps réel (websocket) | Les données firmographiques changent au mieux quotidiennement — cron suffit |
| Base de contacts propriétaire | Charge RGPD et vérification permanente — APIs d'enrichissement au crédit, gated par seuil |
| Agrégateur Pharow (buy) | Outil de vente, pas une API backend intégrable — build avec la stack directe |
| Proxycurl | Service fermé (juillet 2025, procès LinkedIn) — remplacé par ScrapIn ; code radar mort à purger |
| Tous les signaux dès le lancement | 3 signaux complémentaires suffisent pour un score crédible ; BOAMP en v1.4 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTO-01 | Phase 14 | Pending |
| AUTO-02 | Phase 14 | Pending |
| AUTO-03 | Phase 14 | Pending |
| AUTO-04 | Phase 14 | Pending |
| AUTO-05 | Phase 10 | Pending |
| AUTO-06 | Phase 10 | Pending |
| SIG-01 | Phase 11 | Pending |
| SIG-02 | Phase 10 | Pending |
| SIG-03 | Phase 11 | Pending |
| SIG-04 | Phase 9 | Pending |
| SIG-05 | Phase 12 | Pending |
| SIG-06 | Phase 11 | Pending |
| SCOR-01 | Phase 10 | Pending |
| SCOR-02 | Phase 10 | Pending |
| SCOR-03 | Phase 12 | Pending |
| SCOR-04 | Phase 12 | Pending |
| CONT-01 | Phase 13 | Pending |
| CONT-02 | Phase 13 | Pending |
| CONT-03 | Phase 13 | Pending |
| CONT-04 | Phase 9 | Pending |
| CONT-05 | Phase 9 | Pending |
| LIST-01 | Phase 14 | Pending |
| LIST-02 | Phase 14 | Pending |
| LIST-03 | Phase 14 | Pending |

**Coverage:**
- v1.3 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-03*
*Last updated: 2026-07-03 — Traceability filled after roadmap creation*
