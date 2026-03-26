# Requirements: Next-ESN

**Defined:** 2026-03-26  
**Milestone:** v1.1 Réactivité, flux & résilience  
**Core value:** L'utilisateur a toujours un feedback clair et fiable quand l'IA travaille

v1.0 reliability requirements : `.planning/milestones/v1.0-REQUIREMENTS.md`

## v1.1 — Flux positionnement & mission

- [ ] **FLOW-01** : Après création ou upload d’une mission depuis `/review/[id]/positioning`, l’utilisateur **reste** sur cette URL (pas de redirection obligatoire vers la page détail mission).
- [ ] **FLOW-02** : La mission nouvellement ajoutée affiche **inline** l’état d’analyse (au minimum cohérent avec les statuts serveur : en cours / terminé / erreur).
- [ ] **FLOW-03** : L’action « positionner » (ou équivalent) sur cette mission n’est **active** que lorsque l’analyse mission est **terminée avec succès** — état **dérivé du serveur** (pas d’état client volatile seul).

## v1.1 — Réactivité & fraîcheur

- [ ] **LAT-01** : Réduire le décalage entre la base et l’UI pour les enregistrements concernés (ex. **Supabase Realtime** ou mécanisme équivalent documenté) — sans dégrader la charge inutilement.
- [ ] **LAT-02** : Afficher un horodatage **« dernière génération »** (ou libellé équivalent) sur les résultats concernés par les workflows IA listés dans le périmètre de la phase.

## v1.1 — Résilience partielle & retry

- [ ] **RES-01** : Lorsqu’une sous-étape échoue mais d’autres ont réussi, l’UI reflète **clairement** ce qui est utilisable vs ce qui est en erreur.
- [ ] **RES-02** : Permettre une **relance ciblée** d’une sous-étape en échoue sans relancer tout le workflow parent, **dans les limites** du runtime `@workflow/next` beta (si impossible techniquement, documenter la limite et proposer le meilleur compromis UX).

## Out of scope (v1.1)

| Item | Reason |
|------|--------|
| Cancel fiable en vol | Runtime beta |
| Barres de % fictives | Confiance utilisateur |
| Tests automatisés | Dette connue |
| Refonte hors écrans concernés | Périmètre |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FLOW-01 | Phase 3 | Pending |
| FLOW-02 | Phase 3 | Pending |
| FLOW-03 | Phase 3 | Pending |
| LAT-01 | Phase 4 | Pending |
| LAT-02 | Phase 4 | Pending |
| RES-01 | Phase 5 | Pending |
| RES-02 | Phase 5 | Pending |

**Coverage:** 7 exigences v1.1, 7 mappées.

---
*Last updated: 2026-03-26*
