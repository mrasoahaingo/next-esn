# Requirements: Next-ESN

**Defined:** 2026-03-26
**Core Value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille

## v1 Requirements

Requirements for the reliability milestone. Each maps to roadmap phases.

### Workflow State

- [ ] **WFS-01**: Les workflows IA écrivent `status: 'error'` dans Supabase quand ils échouent — pas de ghost states
- [ ] **WFS-02**: Chaque workflow a un statut clair dans Supabase (idle, pending, running, done, error)
- [ ] **WFS-03**: Le statut workflow persiste après navigation/reload — dérivé de Supabase, pas de Zustand volatile
- [ ] **WFS-04**: Les erreurs NDJSON ne sont plus avalées silencieusement par le catch block du stream

### Button & Loading

- [ ] **BTN-01**: Les boutons de génération IA sont désactivés pendant qu'un workflow tourne
- [ ] **BTN-02**: L'état disabled se base sur le statut serveur (Supabase), pas sur des flags Zustand volatils
- [ ] **BTN-03**: Un indicateur de loading visible apparaît au lancement d'un workflow
- [ ] **BTN-04**: Un feedback visuel de succès s'affiche quand le workflow termine

### Error Display

- [ ] **ERR-01**: Toute erreur de workflow remonte à l'UI avec un message compréhensible
- [ ] **ERR-02**: Les messages d'erreur sont actionnables ("Extraction échouée. Réessayez ou contactez le support.")
- [ ] **ERR-03**: Les erreurs sont attribuées spécifiquement au sous-workflow qui a échoué ("Extraction CV échouée — fichier corrompu ?")

### Sub-Step Progress

- [ ] **SUB-01**: Chaque workflow affiche sa progression par sous-étape ("Étape 2/4: Analyse des compétences")
- [ ] **SUB-02**: Chaque sous-workflow visible dans l'UI affiche son propre badge de statut (pending/running/done/error)

### Cache Consistency

- [ ] **CCH-01**: Les invalidations React Query couvrent à la fois les vues liste et détail après fin de workflow
- [ ] **CCH-02**: Le store Zustand du positionnement se reset correctement lors du changement de positionnement

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Latency Optimization

- **LAT-01**: Supabase Realtime subscriptions pour éliminer le lag de polling 0-3s
- **LAT-02**: Timestamp "dernière génération" affiché sur les résultats

### Resilience

- **RES-01**: Gestion du succès partiel (1 sous-workflow échoue, afficher ce qui a réussi)
- **RES-02**: Retry d'un sous-workflow échoué sans relancer tout le workflow

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cancel d'un workflow en vol | `@workflow/next` beta ne supporte pas la cancellation fiable |
| Fausses barres de progression (%) | Érodent la confiance quand elles stagnent — on utilise des étapes honnêtes |
| Preview streaming du résultat IA | Montre un résultat partiel qui invite aux critiques de qualité |
| Page séparée d'activité/jobs | Hors scope — on met à jour le statut inline |
| Notifications push/email | Infrastructure supplémentaire, hors scope fiabilité |
| Refactoring global (split fichiers) | Sauf si nécessaire pour corriger un bug spécifique |
| Tests automatisés | Dette identifiée mais hors scope de ce milestone |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WFS-01 | Phase 1 | Pending |
| WFS-02 | Phase 1 | Pending |
| WFS-03 | Phase 1 | Pending |
| WFS-04 | Phase 1 | Pending |
| BTN-01 | Phase 1 | Pending |
| BTN-02 | Phase 1 | Pending |
| BTN-03 | Phase 1 | Pending |
| BTN-04 | Phase 1 | Pending |
| ERR-01 | Phase 1 | Pending |
| ERR-02 | Phase 1 | Pending |
| ERR-03 | Phase 2 | Pending |
| SUB-01 | Phase 2 | Pending |
| SUB-02 | Phase 2 | Pending |
| CCH-01 | Phase 1 | Pending |
| CCH-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 — traceability filled after roadmap creation*
