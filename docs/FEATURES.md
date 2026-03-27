# Fonctionnalités implémentées (Esneo CV Automation)

Ce document décrit les **fonctionnalités livrées** dans l’application : parcours utilisateur, écrans, APIs associées et briques techniques. Pour l’authentification et les rôles en détail, voir [AUTH.md](./AUTH.md).

---

## 1. Vue d’ensemble produit

Application **Next.js (App Router)** entièrement en **français** pour une ESN : import de CV (PDF/DOCX), **extraction IA** structurée, **édition** avec **aperçu PDF** temps réel, **positionnement** sur offres (analyse + CV et emails adaptés), **missions** (fiches de poste), **templates** de rendu PDF, **multi-organisation** (Clerk) et **administration plateforme** (super-admin).

**Stack principale** : TypeScript, Tailwind, Supabase (PostgreSQL + Storage), Clerk, Vercel AI SDK + AI Gateway (modèles configurables en base), Vercel Workflow, Zustand, TanStack Query, `@json-render/react-pdf`.

---

## 2. Authentification, organisations et accès

| Fonctionnalité | Description |
|----------------|-------------|
| Connexion / inscription | Pages Clerk `/sign-in`, `/sign-up` (routes publiques). |
| Choix d’organisation | `/org-selection` : liste / création d’organisation (sans compte personnel), redirection vers `/` une fois une org active. |
| Protection des routes | Middleware Clerk : tout le reste exige une session ; `/admin` réservé au rôle **super_admin** (`publicMetadata.role`). |
| Contexte org | Les données métier sont **scoping** par `org_id` (côté API avec `requireOrgContext` / équivalent). |
| Rôles | **super_admin** (fondateurs), **org:admin**, **org:member** — voir [AUTH.md](./AUTH.md). |

---

## 3. Shell applicatif et navigation

| Fonctionnalité | Description |
|----------------|-------------|
| Layout authentifié | `AuthenticatedShell` : barre latérale, en-tête, contenu scrollable ; branding org. |
| Barre latérale unifiée | Accès **Tableau de bord**, **CVs**, **Positionnements**, **Positions** (missions), **Templates**, liens **Paramètres** (profil, org, équipe), **Admin** (si super-admin). |
| Mode démo | Bascule (hors prod) pour masquer les données réelles et tester l’UI. |
| Navigation mobile | Contexte + fermeture auto au changement de route. |
| Thème | `next-themes` (clair / sombre selon configuration produit). |

---

## 4. Tableau de bord (`/`)

| Fonctionnalité | Description |
|----------------|-------------|
| Statistiques | Compteurs CVs, positionnements, scores moyens, temps IA vs temps utilisateur, estimation de **gain de temps** (ROI) vs baseline manuelle. |
| Graphiques | Répartition des scores, couverture des compétences (chargement dynamique côté client). |
| Upload CV | Zone glisser-déposer + sélection fichier ; création de candidat et redirection vers la revue. |
| Listes récentes | Aperçu des candidats et positionnements (états, liens). |
| Compétences recruteur | Aperçu du suivi « compétence comprise » (voir § 10). |

**API** : `GET /api/dashboard` — agrège candidats, positionnements et métriques recruteur pour l’org courante.

---

## 5. Candidats et extraction CV

| Fonctionnalité | Description |
|----------------|-------------|
| Upload | `POST /api/upload` — fichier vers le bucket **`cv-original`**, ligne `candidates` avec statuts `uploaded` → … |
| Workflow d’extraction | Vercel Workflow (`extract-cv`) : PDF (transcription optionnelle + branches parallèles), DOCX via mammoth, flux **NDJSON** vers le client. |
| Schéma unique | `extractionSchema` / `ExtractedCV` (Zod) partagé extraction, formulaire, PDF. |
| Suivi coût / usage | Agrégation des usages LLM, `logAiUsage` ; clés de tâches dans `lib/llm/task-keys.ts` (ex. branches CV, agrégat). |
| Annulation | `POST /api/workflow/[runId]/cancel` ; flux stream `GET /api/workflow/[runId]/stream`. |

**Statuts candidat typiques** : `uploaded`, `extracting`, `reviewing`, `ready`, `generated`.

---

## 6. Revue CV (`/review/[id]`)

| Fonctionnalité | Description |
|----------------|-------------|
| Streaming extraction | Formulaire se remplit au fil des branches ; lecture seule pendant le flux. |
| Édition | Après extraction : champs **infos perso**, **résumé**, **expériences**, **formation**, **compétences** (Zustand `cv-builder.store`). |
| Aperçu PDF | `POST /api/pdf-preview` — rendu json-render + debounce, annulation des requêtes en cours. |
| Persistance | Mise à jour candidat via API ; minuterie de session pour métriques de temps de revue. |
| Actions | Sauvegarde, lien vers positionnement, suppression candidat, arrêt workflow. |

---

## 7. Export PDF CV formaté

| Fonctionnalité | Description |
|----------------|-------------|
| Génération finale | `POST /api/generate` — même pipeline PDF que la prévisualisation, dépôt dans le bucket **`cv-formatted`**, mise à jour du candidat. |

---

## 8. Missions (positions / fiches de poste)

| Fonctionnalité | Description |
|----------------|-------------|
| Liste & détail | `/positions` redirige si une seule mission ; `/positions/[id]` : hub mission (titre, entreprise, description, analyse d’offre, candidats, positionnements). |
| Création | Depuis la sidebar ou l’UI mission : titre, entreprise, description ; APIs `missions`. |
| Analyse d’offre | Workflows IA : résumé exécutif, points clés, explication par point (`TASK_KEY.MISSION_*`). |
| Upload / contenu | Fichiers liés à la mission selon les routes `missions/[id]/upload`, etc. |

**APIs** : `GET/POST /api/missions`, `GET/PATCH /api/missions/[id]`, `POST .../analyze-job`, `.../key-point-understood`, `.../key-points/[pointId]/explain`, upload.

---

## 9. Positionnement (candidat × offre)

### 9.1 Création

| Fonctionnalité | Description |
|----------------|-------------|
| Nouveau positionnement | `/review/[id]/positioning` : choix ou création de mission, collage de fiche de poste, création du positionnement. |

### 9.2 Assistant (`/review/[id]/positioning/[positioningId]`)

| Fonctionnalité | Description |
|----------------|-------------|
| Étapes | Saisie offre → **analyse** (score, compétences, écarts, questions) → **génération** (CV adapté, emails). |
| Analyse streaming | Plusieurs branches LLM (skills, expériences, gaps, questions, synthèse) avec métadonnées de progression. |
| Graphiques | Visualisations sur l’analyse (composant dynamique). |
| Génération | CV sur-mesure, emails (prise de contact, puces, mail candidat) — tâches `POSITIONING_GENERATE_*`. |
| PDF | Prévisualisation du CV positionné (hooks PDF + template). |
| Export | Export dédié positionnement ; minuterie et auto-sauvegarde. |
| Annulation workflow | Alignée sur le pattern `workflow_run_id`. |

**APIs** : `GET/PATCH /api/positioning/[id]`, `POST /api/positioning/analyze`, `POST /api/positioning/generate`, `GET /api/positioning/[id]/export`, suivi temps `.../time`, liste `GET /api/positioning`.

---

## 10. Compétences recruteur

| Fonctionnalité | Description |
|----------------|-------------|
| Profil utilisateur | `/settings/profile` : liste des compétences « comprises » avec recherche. |
| Vue équipe (admins) | `/settings/team/skills` : agrégats par membre de l’org. |
| API | `GET/PATCH /api/org/recruiter-skills`, `POST /api/recruiter/skill-understood` — alimente le tableau de bord et les stats. |

---

## 11. Templates PDF

| Fonctionnalité | Description |
|----------------|-------------|
| Liste | `/templates` : placeholder d’accueil ; édition par id. |
| Éditeur `/templates/[id]` | Configuration du **thème**, **logo**, **en-tête**, **pied de page**, **blocs actifs**, **ordre des blocs**, **variantes de blocs** et **préfixe d’export** ; prévisualisation PDF sur données d’exemple. |
| Config runtime | `GET/PATCH /api/template-config`, CRUD `/api/templates` — utilisé par les préviews et exports. |

---

## 12. Paramètres organisation et équipe

### 12.1 Organisation (`/settings/organization`)

| Fonctionnalité | Description |
|----------------|-------------|
| Champs | Nom affiché, email de contact, site web, **logo** (upload dédié), **contexte de marque** pour le positionnement. |
| Accès | Réservé **org:admin** ou **super_admin**. |

**APIs** : `GET/PATCH /api/org/settings`, `POST /api/org/settings/logo`.

### 12.2 Équipe (`/settings/team`)

| Fonctionnalité | Description |
|----------------|-------------|
| Membres | Liste Clerk, rôles **Admin** / **Membre**, révocation. |
| Invitations | Création de liens d’invitation, révocation. |

**APIs** : `GET /api/members`, `PATCH/DELETE /api/members/[id]`, `POST/DELETE /api/invitations`, `DELETE /api/invitations/[id]`.

---

## 13. Administration super-admin (`/admin`)

| Fonctionnalité | Description |
|----------------|-------------|
| Vue d’ensemble | Statistiques globales : organisations, CVs, positionnements, **tokens** et **coûts estimés** (USD), répartition par org. |
| Modèles & tâches LLM | Onglet dédié : CRUD **`llm_models`**, **`llm_tasks`**, surcharges **`llm_task_org_overrides`**. |

**APIs** : `GET /api/admin/stats`, `GET/POST/PATCH/DELETE` sur `/api/admin/llm-models`, `/api/admin/llm-tasks`, `/api/admin/org-llm-overrides`.

> Les prompts système et modèles résolus à l’exécution passent par `resolveLlmTask` et `createGatewayLanguageModel` — voir `lib/llm/`, `lib/ai.ts`.

---

## 14. Données, fichiers et observabilité

| Élément | Rôle |
|---------|------|
| **Supabase** | Candidats, positionnements, missions, templates, logs d’usage IA, compétences recruteur, paramètres org, etc. |
| **Storage** | Buckets `cv-original`, `cv-formatted` ; logos org selon implémentation actuelle. |
| **`ai_usage_log`** | Traçabilité des opérations LLM (modèle, tokens, durée, entités liées). |
| **Vercel Analytics** | Package `@vercel/analytics` intégré au projet. |

---

## 15. APIs REST (inventaire)

Routes applicatives principales (hors workflow interne `.well-known`) :

- **Candidats** : `GET/POST /api/candidates`, `GET/PATCH/DELETE /api/candidates/[id]`, `PATCH /api/candidates/[id]/time`
- **Dashboard** : `GET /api/dashboard`
- **Extraction / PDF** : `POST /api/extract`, `POST /api/pdf-preview`, `POST /api/generate`
- **Organisation** : `GET/PATCH /api/org/settings`, `POST /api/org/settings/logo`, `GET/PATCH /api/org/recruiter-skills`
- **Recruteur** : `POST /api/recruiter/skill-understood`
- **Missions** : `GET/POST /api/missions`, `GET/PATCH/DELETE /api/missions/[id]`, sous-routes analyze / upload / key-points
- **Positionnement** : `GET /api/positioning`, `GET/PATCH /api/positioning/[id]`, `POST .../analyze`, `POST .../generate`, `GET .../export`, `PATCH .../time`
- **Templates** : `GET/POST /api/templates`, `GET/PATCH/DELETE /api/templates/[id]`, `GET/PATCH /api/template-config`
- **Membres & invitations** : `/api/members`, `/api/members/[id]`, `/api/invitations`, `/api/invitations/[id]`
- **Workflow** : `GET /api/workflow/[runId]/stream`, `POST /api/workflow/[runId]/cancel`
- **Admin** : `/api/admin/stats`, `/api/admin/llm-*`, `/api/admin/org-llm-overrides`

---

## 16. Fichiers et conventions utiles

| Zone | Fichiers / dossiers |
|------|----------------------|
| Workflow extraction | `workflows/extract-cv.ts` |
| Schéma CV | `lib/schema.ts` |
| PDF (spec + rendu) | `lib/services/pdf.template.ts`, `lib/services/pdf.service.ts` |
| Auth serveur | `lib/utils/auth.ts` |
| Prompts LLM en base | tables `llm_*`, `lib/llm/task-keys.ts` |

---

*Document généré à partir du code du dépôt ; en cas d’écart avec une montée de version, se référer aux routes et migrations Supabase correspondantes.*
