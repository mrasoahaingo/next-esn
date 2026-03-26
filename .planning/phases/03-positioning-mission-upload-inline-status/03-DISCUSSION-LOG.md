# Phase 3: Positioning Mission Upload & Inline Status — Discussion Log

> **Audit trail only.** Decisions are in `03-CONTEXT.md`.

**Date:** 2026-03-26  
**Phase:** 3 — Positioning Mission Upload & Inline Status  
**Areas discussed:** Navigation vs redirect ; inline analysis visibility ; CTA gating

---

## Navigation après création / upload de mission

| Option | Description | Selected |
|--------|-------------|----------|
| Rester sur `/review/[id]/positioning` | Une seule page ; état d’analyse visible ici ; CTA positionnement quand prêt | ✓ |
| Rediriger vers `/positions/[id]` puis retour manuel | Voir l’état sur la fiche mission ; re-cliquer positionner depuis ailleurs |  |

**User's choice:** Rester sur la page positionnement (message utilisateur session précédente).

**Notes:** Aligné avec FLOW-01 et la décision enregistrée dans `PROJECT.md` (Key Decisions).

---

## Inline status & CTA

| Option | Description | Selected |
|--------|-------------|----------|
| Afficher chargement / étapes d’analyse sous la mission sélectionnée | Réutiliser patterns Phase 2 (`useWorkflowStream`, `WorkflowStepList` si run id) | ✓ |
| Statut texte minimal sans étapes | Plus léger mais moins cohérent avec le reste du produit |  |

**User's choice:** Affichage inline explicite ; implémentation détaillée laissée au planner (voir CONTEXT D-04 à D-06).

---

## Gating du bouton « Analyser le matching »

| Option | Description | Selected |
|--------|-------------|----------|
| Désactiver tant que l’analyse mission n’est pas terminée (serveur) | `job_analysis` / absence de run actif / gestion erreur | ✓ |
| Actif dès sélection de mission | Comportement actuel — rejeté pour FLOW-03 |  |

**User's choice:** Gating serveur (FLOW-03).

---

## Claude's Discretion

- Présentation visuelle exacte du bloc d’état (compact Card, espacements) — CONTEXT D-10.

## Deferred Ideas

- Realtime (Phase 4) pourrait remplacer partie du polling sur cette page.
