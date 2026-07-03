# Phase 9: DB + Schema Foundation + Proxycurl Audit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-04
**Phase:** 9-DB + Schema Foundation + Proxycurl Audit
**Areas discussed:** Emplacement du seuil de chaleur, Historique des scores

---

## Sélection des zones grises

Quatre zones proposées : Sort du code Proxycurl mort, Emplacement du seuil de chaleur, Sémantique RGPD/TTL, Historique des scores. L'utilisateur a sélectionné les zones seuil et scores ; Proxycurl et RGPD laissés à la discrétion de Claude (recherche/planner).

---

## Emplacement du seuil de chaleur

| Option | Description | Selected |
|--------|-------------|----------|
| organization_settings | Colonne sur la table existante (pattern radar_org_settings) | |
| Table prospection dédiée | prospection_settings (org_id PK), isole le domaine, extensible | ✓ |
| Seuil par automation | Colonne heat_threshold sur prospection_automations | |

**User's choice:** Table prospection dédiée

| Option | Description | Selected |
|--------|-------------|----------|
| Seuil seul | org_id + heat_threshold (défaut 60), YAGNI | ✓ |
| Seuil + réglages anticipés | Colonnes pressenties (cron, quotas, rétention) dès maintenant | |
| Seuil + JSONB extensible | heat_threshold typé + settings JSONB | |

**User's choice:** Seuil seul

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy avec fallback code | Pas de ligne, COALESCE sur constante | |
| Upsert à la première écriture | Ligne créée à la sauvegarde admin, DEFAULT colonne + constante | ✓ |
| Ligne créée pour chaque org | Backfill + hook cycle de vie orgs Clerk | |

**User's choice:** Upsert à la première écriture

| Option | Description | Selected |
|--------|-------------|----------|
| DB seule en Phase 9 | UI de réglage en Phase 13/14 | |
| DB + UI admin en Phase 9 | CONT-04 100% vérifiable dès la Phase 9 | ✓ |

**User's choice:** DB + UI admin en Phase 9

---

## Historique des scores

| Option | Description | Selected |
|--------|-------------|----------|
| Snapshot par run | Une ligne par (company, run), historique complet | ✓ |
| Upsert dernier score | Une ligne par entreprise, écrasée | |
| Dernier score + colonne trend | Upsert + previous_score/delta | |

**User's choice:** Snapshot par run

| Option | Description | Selected |
|--------|-------------|----------|
| Pas de purge en v1.3 | Volume faible, index (company_id, created_at DESC) | ✓ |
| Rétention fixe dès le départ | Ex. 90 jours, purge par cron | |
| Garder N derniers par entreprise | Suppression à l'insert au-delà de N | |

**User's choice:** Pas de purge en v1.3

| Option | Description | Selected |
|--------|-------------|----------|
| Score + breakdown déterministe | score + score_breakdown JSONB + run_id, auditable | ✓ |
| Score + breakdown + textes LLM | Même ligne pour score et justification/pitch | |
| Score seul | score + run_id + timestamps | |

**User's choice:** Score + breakdown déterministe

| Option | Description | Selected |
|--------|-------------|----------|
| Colonnes sur companies | justification, call_pitch, synthesis_generated_at sur prospection_companies | ✓ |
| Sur le snapshot de score | Colonnes nullable sur prospection_scores | |
| Laisser la Phase 12 décider | Migration séparée en Phase 12 | |

**User's choice:** Colonnes sur companies

---

## Claude's Discretion

- Sort du code Proxycurl mort (audit documenté vs @deprecated vs suppression) — vérifier si le cron radar tourne encore en prod
- Sémantique RGPD/TTL (calcul de gdpr_retention_expires_at, mécanisme de purge)
- Design détaillé des autres tables (automations, signals, run_logs, actions)

## Deferred Ideas

None — discussion stayed within phase scope.
