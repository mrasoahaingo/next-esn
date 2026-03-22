# PRD — Esneo : Copilote Commercial du Recruteur ESN

> **Version** : 1.0
> **Date** : 2026-03-22
> **Statut** : Draft
> **Auteur** : Product / Engineering

---

## 1. Vision produit

Transformer Esneo d'un **outil de formatage CV assisté par IA** en un **copilote commercial complet** pour le recruteur ESN. L'objectif : que le recruteur soit **le premier à proposer le bon profil, avec le bon message, au bon moment** — et qu'il remporte le contrat de prestation.

### 1.1 Problèmes adressés

| Problème | Impact actuel |
|----------|--------------|
| Le recruteur cherche manuellement quel CV colle à quelle mission | Perte de temps, profils oubliés, réactivité faible |
| Les emails sont copiés-collés vers Outlook/Gmail | Rupture de workflow, pas de traçabilité, lenteur |
| Impossible de traiter 20 CVs d'un coup (réponse à AO) | Bottleneck sur les gros volumes |
| Le client reçoit des CVs bruts sans mise en contexte | Pas de différenciation vs concurrence |
| Aucun suivi de pipeline (qui est où dans le process) | Perte de visibilité, deals qui tombent |
| Le candidat n'est pas préparé aux entretiens | Taux de conversion plus faible |
| Pas de mémoire partagée dans l'équipe | Perte d'info quand un collègue prend le relais |

### 1.2 Utilisateurs cibles

| Persona | Rôle | Besoin principal |
|---------|------|-----------------|
| **Recruteur opérationnel** | Sourcing, positionnement, relation candidat/client | Rapidité, qualité des livrables, suivi |
| **Manager recrutement** | Pilotage équipe, reporting, qualité | Visibilité pipeline, métriques, ROI |
| **Candidat** (indirect) | Cherche une mission | Être bien accompagné, informé, préparé |
| **Client** (indirect) | Cherche un prestataire | Recevoir des profils pertinents rapidement, dossier pro |

---

## 2. État actuel (baseline)

Voir [FEATURES.md](./FEATURES.md) pour le détail complet. Résumé des capacités existantes :

- Upload CV (PDF/DOCX) + extraction IA structurée (parallèle, streaming)
- Revue CV avec aperçu PDF temps réel
- Positionnement candidat × mission : analyse (score, compétences, gaps, questions) + génération (CV adapté + 4 emails)
- Missions : création, analyse d'offre IA (résumé exécutif, points clés, red flags)
- Templates PDF personnalisables par org
- Multi-organisation (Clerk) + rôles (super_admin, org:admin, org:member)
- Dashboard avec métriques ROI
- Administration LLM (modèles, prompts, overrides par org)

**Ce qui manque** : matching automatique, communication intégrée, traitement batch, pipeline de suivi, intelligence commerciale, expérience candidat.

---

## 3. Features proposées

---

### Feature 1 : Auto-matching CV ↔ Missions

**Priorité** : P0
**Effort estimé** : M (1-2 semaines)

#### 3.1.1 Contexte

Quand un recruteur uploade un CV ou crée une mission, il doit aujourd'hui manuellement parcourir les missions/candidats existants pour trouver des correspondances. Dans un marché où la réactivité est clé, ce délai peut coûter un deal.

#### 3.1.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| AM-1 | En tant que recruteur, quand j'uploade un CV, je veux voir automatiquement les missions compatibles | Après extraction, afficher les top 5 missions matchantes (score > seuil configurable) avec score et lien direct vers "Positionner" |
| AM-2 | En tant que recruteur, quand je crée une mission, je veux voir les candidats du vivier qui correspondent | Après création/analyse de mission, afficher les top 10 candidats matchants avec score, compétences clés, et action "Positionner" |
| AM-3 | En tant que recruteur, je veux voir les suggestions de matching sur mon dashboard | Section "Opportunités détectées" sur le dashboard avec les matchings récents non traités |
| AM-4 | En tant que manager, je veux configurer le seuil de matching minimum | Paramètre org : seuil de score minimum pour déclencher une suggestion (défaut : 60%) |

#### 3.1.3 Spécifications fonctionnelles

**Calcul du matching** :
- Déclenché automatiquement après : extraction CV terminée, création/mise à jour de mission
- Basé sur les données structurées déjà extraites (compétences, expériences, résumé)
- Algorithme : comparaison des `skillMatches` potentiels entre `ExtractedCV.skills` et `JobPostingAnalysis.keyPoints` (aspect = `technical`)
- Score rapide (sans appel LLM complet) : intersection pondérée des compétences + bonus séniorité/secteur
- Option : appel LLM léger pour scoring contextuel (modèle configurable via `llm_tasks`)

**Stockage** :
- Nouvelle table `matching_suggestions` : `candidate_id`, `mission_id`, `score`, `matched_skills[]`, `status` (pending/dismissed/actioned), `created_at`
- Recalcul incrémental (ne rescorer que les nouveaux candidats/missions)

**UI** :
- Badge notification sur le dashboard
- Section dédiée dans la page mission (onglet "Candidats suggérés")
- Section dédiée dans la page review CV (encart "Missions compatibles")
- Action : "Positionner" en 1 clic → crée le positionnement et redirige

#### 3.1.4 Hors scope (v1)

- Matching basé sur embeddings vectoriels (voir Feature 4 : Recherche sémantique)
- Notification push/email (voir Feature 7 : Notifications)

---

### Feature 2 : Envoi d'emails intégré

**Priorité** : P0
**Effort estimé** : M (1-2 semaines)

#### 3.2.1 Contexte

Actuellement, les emails générés (client, candidat) sont affichés dans l'UI et doivent être copiés-collés dans un client mail externe. Cela casse le workflow, empêche la traçabilité et ralentit le recruteur.

#### 3.2.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| EM-1 | En tant que recruteur, je veux envoyer un email au client directement depuis la page positionnement | Bouton "Envoyer" à côté de chaque email généré, avec confirmation avant envoi |
| EM-2 | En tant que recruteur, je veux modifier le destinataire et mettre en CC/BCC | Champs To/CC/BCC éditables avant envoi, pré-remplis si contact client connu |
| EM-3 | En tant que recruteur, je veux joindre le CV formaté à l'email | Option pour attacher le PDF généré (CV positionné) en pièce jointe |
| EM-4 | En tant que recruteur, je veux voir l'historique des emails envoyés | Onglet "Emails" sur le positionnement et sur la fiche candidat, avec date/destinataire/statut |
| EM-5 | En tant que manager, je veux configurer le serveur d'envoi de l'organisation | Page settings org : configuration SMTP ou clé API (Resend/SendGrid) |

#### 3.2.3 Spécifications fonctionnelles

**Intégration email** :
- Provider recommandé : **Resend** (API simple, bon DX Next.js, tracking inclus)
- Alternative : SMTP générique configurable par org
- Configuration stockée dans `organization_settings.extra` (chiffré) : `email_provider`, `api_key`, `from_address`, `from_name`

**Flux d'envoi** :
1. Recruteur clique "Envoyer" sur un email généré
2. Modal de confirmation : destinataire(s), objet, corps (éditable), pièce jointe (CV PDF)
3. Appel API `POST /api/emails/send` avec : `to`, `cc`, `bcc`, `subject`, `body` (HTML), `attachments[]`, `positioning_id`, `type` (client/candidate/relance)
4. Email envoyé via provider configuré
5. Log dans nouvelle table `email_log` : `id`, `positioning_id`, `candidate_id`, `mission_id`, `org_id`, `to`, `cc`, `subject`, `type`, `status` (sent/delivered/opened/bounced), `sent_at`, `provider_id`

**UI** :
- Bouton "Envoyer" sur chaque variant d'email dans la page positionnement
- Modal d'envoi avec preview HTML
- Indicateur de statut après envoi (envoyé, délivré, ouvert)
- Historique dans un onglet dédié

**Tracking (optionnel v1)** :
- Pixel de tracking ouverture (si Resend)
- Webhook pour statuts delivery/bounce

#### 3.2.4 Hors scope (v1)

- Réception d'emails (inbox)
- Séquences de relance automatiques (voir Feature 8)
- Intégration calendrier

---

### Feature 3 : Upload & traitement batch

**Priorité** : P0
**Effort estimé** : S (quelques jours)

#### 3.3.1 Contexte

Un recruteur reçoit régulièrement 10-30 CVs d'un coup (sourcing LinkedIn, réponse à AO, vivier interne). Aujourd'hui il doit les uploader et traiter un par un.

#### 3.3.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| BA-1 | En tant que recruteur, je veux uploader plusieurs CVs en une seule action | Zone de drop acceptant N fichiers, avec barre de progression globale |
| BA-2 | En tant que recruteur, je veux que l'extraction se lance automatiquement sur tous les CVs | Tous les workflows d'extraction démarrent en parallèle (avec throttling si nécessaire) |
| BA-3 | En tant que recruteur, je veux voir la progression globale du batch | Vue liste avec statut par CV (en attente, extraction, terminé, erreur) et compteur global |
| BA-4 | En tant que recruteur, je veux passer rapidement d'un CV à l'autre en revue | Navigation prev/next dans la page review quand on vient d'un batch |

#### 3.3.3 Spécifications fonctionnelles

**Upload batch** :
- Modification du composant d'upload existant : `multiple` sur l'input file + gestion de la liste
- Nouveau endpoint `POST /api/upload/batch` : accepte N fichiers, crée N candidats, retourne la liste des IDs
- Lancement séquentiel ou parallèle des workflows d'extraction (configurable, max 5 en parallèle par défaut)

**UI batch** :
- Nouvelle vue `/batch/[batchId]` : liste des CVs avec statut temps réel (SSE ou polling)
- Lien vers la revue de chaque CV
- Navigation prev/next dans la page review (query param `?batch=xxx&index=2`)

**Stockage** :
- Nouveau champ optionnel `batch_id` sur `candidates` pour regrouper
- Ou simple query param sans persistance (plus léger)

---

### Feature 4 : Recherche sémantique du vivier

**Priorité** : P1
**Effort estimé** : L (2-4 semaines)

#### 3.4.1 Contexte

Quand un client appelle avec un besoin urgent ("j'ai besoin d'un dev React senior avec de l'expérience bancaire pour lundi"), le recruteur doit pouvoir retrouver le bon profil en secondes dans un vivier de centaines de CVs.

#### 3.4.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| SR-1 | En tant que recruteur, je veux chercher dans le vivier en langage naturel | Barre de recherche : "développeur Java senior expérience assurance" retourne les profils pertinents classés par pertinence |
| SR-2 | En tant que recruteur, je veux filtrer par critères combinés | Filtres : technologies, années d'XP (range), disponibilité, score moyen, date d'upload |
| SR-3 | En tant que recruteur, je veux voir un aperçu rapide du profil dans les résultats | Card résultat : nom, titre, top 5 compétences, dernière expérience, score de pertinence, statut dispo |

#### 3.4.3 Spécifications fonctionnelles

**Embeddings** :
- Générer un embedding par candidat à partir de : résumé + compétences + titres d'expérience + secteurs
- Modèle : `text-embedding-3-small` (OpenAI) ou équivalent via AI Gateway
- Stockage : colonne `embedding vector(1536)` sur `candidates` (pgvector extension Supabase)
- Recalcul à chaque mise à jour du CV extrait

**Recherche** :
- `POST /api/candidates/search` : query texte → embedding → recherche cosine similarity
- Filtres SQL combinés avec la recherche vectorielle
- Pagination + tri par pertinence ou date

**UI** :
- Nouvelle page `/candidates` (ou enrichissement de la liste existante)
- Barre de recherche avec suggestions
- Filtres latéraux
- Résultats avec score de pertinence et highlight des termes matchés

---

### Feature 5 : Brief candidat avant entretien

**Priorité** : P1
**Effort estimé** : S (quelques jours)

#### 3.5.1 Contexte

Un candidat bien préparé a un taux de conversion en entretien nettement supérieur. Aujourd'hui le recruteur briefe le candidat par téléphone, de façon informelle et variable.

#### 3.5.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| BR-1 | En tant que recruteur, je veux générer un brief de préparation pour le candidat | Bouton "Générer le brief" sur la page positionnement, qui produit un document structuré |
| BR-2 | En tant que recruteur, je veux personnaliser le brief avant de l'envoyer | Le brief est éditable (comme les emails) avant envoi/export |
| BR-3 | En tant que recruteur, je veux envoyer le brief par email au candidat | Intégration avec la Feature 2 (envoi email) |

#### 3.5.3 Spécifications fonctionnelles

**Contenu du brief** (généré par LLM) :
- Résumé de l'entreprise cliente (taille, secteur, culture)
- Contexte de la mission (pourquoi ce recrutement, enjeux)
- Points clés à maîtriser (issus de l'analyse d'offre `keyPoints`)
- Questions probables en entretien (issues de `candidateQuestions` + génération dédiée)
- Conseils de positionnement : quelles expériences/compétences mettre en avant, quels gaps anticiper
- Tone : professionnel mais rassurant

**Nouveau LLM task** :
- `TASK_KEY.POSITIONING_GENERATE_CANDIDATE_BRIEF`
- Input : `ExtractedCV` + `JobPostingAnalysis` + `PositioningAnalysis`
- Output : brief structuré (sections Markdown ou HTML)

**UI** :
- Nouvel onglet ou section dans la page positionnement
- Éditeur rich text (Tiptap, comme les emails)
- Boutons : "Copier", "Envoyer par email", "Exporter PDF"

---

### Feature 6 : Pipeline kanban par mission

**Priorité** : P1
**Effort estimé** : M (1-2 semaines)

#### 3.6.1 Contexte

Le recruteur gère plusieurs candidats par mission et a besoin de savoir où en est chacun dans le process. Aujourd'hui, les positionnements ont un statut technique (draft/analyzing/generated) mais pas de statut commercial.

#### 3.6.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| PK-1 | En tant que recruteur, je veux voir un kanban des candidats par mission | Vue colonnes sur la page mission avec drag & drop |
| PK-2 | En tant que recruteur, je veux faire avancer un candidat dans le pipeline | Drag & drop ou menu contextuel pour changer l'étape |
| PK-3 | En tant que manager, je veux voir le pipeline global (toutes missions) | Vue dashboard ou page dédiée avec filtres par mission/recruteur |
| PK-4 | En tant que recruteur, je veux voir depuis combien de temps un candidat est à une étape | Badge "depuis X jours" sur chaque carte, alerte si > seuil |

#### 3.6.3 Spécifications fonctionnelles

**Nouveau statut commercial** sur `positionings` :
- `pipeline_stage` : `identified` → `positioned` → `presented` → `interview` → `selected` → `on_mission` → `rejected`
- `pipeline_stage_changed_at` : timestamp du dernier changement
- Historique : table `positioning_pipeline_history` : `positioning_id`, `from_stage`, `to_stage`, `changed_by`, `changed_at`, `note`

**UI** :
- Vue kanban sur `/positions/[id]` (onglet ou vue alternative à la liste actuelle)
- Colonnes configurables par org (quelles étapes afficher)
- Carte candidat : nom, score de matching, étape, durée, actions rapides
- Drag & drop (bibliothèque : `@hello-pangea/dnd` ou `dnd-kit`)

**API** :
- `PATCH /api/positioning/[id]` : ajout du champ `pipeline_stage`
- `GET /api/missions/[id]/pipeline` : retourne les positionnements groupés par stage

---

### Feature 7 : Comparatif multi-candidats & shortlist PDF

**Priorité** : P1
**Effort estimé** : M (1-2 semaines)

#### 3.7.1 Contexte

Le client veut recevoir un dossier comparant les profils proposés. Aujourd'hui le recruteur envoie les CVs séparément sans vue d'ensemble. Une shortlist structurée inspire confiance et accélère la décision.

#### 3.7.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| MC-1 | En tant que recruteur, je veux comparer N candidats sur une mission | Tableau comparatif : scores, compétences matchées, gaps, points forts |
| MC-2 | En tant que recruteur, je veux que l'IA me recommande un classement | Classement avec justification par critère |
| MC-3 | En tant que recruteur, je veux exporter un dossier shortlist PDF pour le client | PDF branded : page de garde, tableau comparatif, fiches candidats, CVs formatés |

#### 3.7.3 Spécifications fonctionnelles

**Vue comparatif** :
- Nouvelle page `/positions/[id]/compare` ou modal sur la page mission
- Sélection des candidats à comparer (checkbox)
- Tableau : lignes = critères (compétences clés, XP pertinente, score, gaps), colonnes = candidats
- Highlight vert/orange/rouge par cellule

**Classement IA** :
- Nouveau LLM task : `TASK_KEY.MISSION_CANDIDATE_RANKING`
- Input : N `PositioningAnalysis` + `JobPostingAnalysis`
- Output : classement ordonné avec justification par candidat

**Export shortlist PDF** :
- Template json-render dédié (distinct du template CV)
- Structure : page de garde (logo ESN, mission, date) → tableau comparatif → fiche résumé par candidat → CVs formatés en annexe
- `POST /api/missions/[id]/shortlist/export`
- Upload dans un nouveau bucket `shortlists` ou sous-dossier de `cv-formatted`

---

### Feature 8 : Positionnement batch (1 mission → N candidats)

**Priorité** : P1
**Effort estimé** : M (1-2 semaines)

#### 3.8.1 Contexte

Lors d'une réponse à appel d'offres ou d'un besoin urgent, le recruteur veut positionner plusieurs candidats sur la même mission en une seule action.

#### 3.8.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| PB-1 | En tant que recruteur, je veux sélectionner N candidats et lancer le positionnement batch | Multi-select sur la page mission ou le vivier, bouton "Positionner tous" |
| PB-2 | En tant que recruteur, je veux voir la progression des positionnements batch | Vue groupée avec statut par candidat (en cours, terminé, erreur) |
| PB-3 | En tant que recruteur, je veux trier les résultats par score | Liste triée par score de matching décroissant après complétion |

#### 3.8.3 Spécifications fonctionnelles

**Flux** :
1. Sélection de N candidats (max configurable, défaut 10)
2. `POST /api/positioning/batch` : crée N positionnements + lance N workflows d'analyse (throttled)
3. Vue résultats `/positions/[id]/batch/[batchId]` : progression temps réel
4. À la fin : classement par score, accès rapide à chaque positionnement

**Throttling** :
- Max 3-5 workflows parallèles pour ne pas surcharger l'API LLM
- File d'attente côté serveur (simple array en mémoire ou Vercel Queue)

---

### Feature 9 : Messages LinkedIn

**Priorité** : P2
**Effort estimé** : S (quelques jours)

#### 3.9.1 Contexte

LinkedIn est le canal n°1 de communication des recruteurs ESN. Les messages y sont courts (300 caractères InMail, ~1000 caractères message) et le ton est différent de l'email.

#### 3.9.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| LI-1 | En tant que recruteur, je veux générer un message LinkedIn d'approche candidat | Message court, personnalisé, adapté au format LinkedIn |
| LI-2 | En tant que recruteur, je veux générer un message de présentation profil pour le client | Message résumant le profil pour un décideur client sur LinkedIn |
| LI-3 | En tant que recruteur, je veux copier le message en 1 clic | Bouton "Copier" avec feedback visuel |

#### 3.9.3 Spécifications fonctionnelles

**Nouveaux LLM tasks** :
- `TASK_KEY.POSITIONING_GENERATE_LINKEDIN_CANDIDATE` : message d'approche candidat (max 300 caractères)
- `TASK_KEY.POSITIONING_GENERATE_LINKEDIN_CLIENT` : présentation profil au client (max 1000 caractères)

**Intégration** :
- Ajout dans le workflow de génération existant (2 branches supplémentaires)
- Nouveaux champs sur `positionings` : `linkedin_candidate_message`, `linkedin_client_message`
- UI : onglet supplémentaire dans la section emails du positionnement

---

### Feature 10 : Notes & fil d'activité

**Priorité** : P2
**Effort estimé** : M (1-2 semaines)

#### 3.10.1 Contexte

Les informations contextuelles (retour client, impression candidat, négociation en cours) sont perdues car non tracées dans l'outil. Quand un collègue reprend un dossier, il repart de zéro.

#### 3.10.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| NO-1 | En tant que recruteur, je veux ajouter une note sur un candidat ou une mission | Champ texte + bouton "Ajouter", visible dans le fil d'activité |
| NO-2 | En tant que recruteur, je veux voir l'historique d'activité complet | Fil chronologique : notes manuelles + actions auto (email envoyé, positionnement créé, CV exporté, changement de stage pipeline) |
| NO-3 | En tant que recruteur, je veux mentionner un collègue | @mention dans les notes, notification au collègue |

#### 3.10.3 Spécifications fonctionnelles

**Table `activity_log`** :
- `id`, `org_id`, `user_id`, `candidate_id?`, `mission_id?`, `positioning_id?`
- `type` : `note` | `email_sent` | `positioning_created` | `cv_exported` | `pipeline_changed` | `status_changed`
- `content` : texte libre (pour notes) ou description auto-générée
- `metadata` : JSON (détails selon le type)
- `mentions` : `user_id[]`
- `created_at`

**UI** :
- Composant `ActivityFeed` réutilisable sur les pages candidat, mission, positionnement
- Champ d'ajout de note en haut du fil
- Icônes distinctes par type d'activité
- Filtres par type

---

### Feature 11 : Gestion de la disponibilité candidat

**Priorité** : P2
**Effort estimé** : S (quelques jours)

#### 3.11.1 Contexte

Proposer un candidat indisponible détruit la crédibilité du recruteur auprès du client. Il faut pouvoir suivre et filtrer par disponibilité.

#### 3.11.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| DI-1 | En tant que recruteur, je veux renseigner la disponibilité d'un candidat | Champs : statut (disponible/en mission/en préavis/indisponible), date de disponibilité, durée de préavis |
| DI-2 | En tant que recruteur, je veux filtrer le vivier par disponibilité | Filtre sur la liste candidats : "Disponibles maintenant", "Disponibles sous 30j", etc. |
| DI-3 | En tant que recruteur, je veux être alerté quand un candidat devient disponible | Notification quand `availability_date` est atteinte |

#### 3.11.3 Spécifications fonctionnelles

**Nouveaux champs sur `candidates`** :
- `availability_status` : `available` | `on_mission` | `notice_period` | `unavailable`
- `availability_date` : date à laquelle le candidat sera disponible
- `notice_period_days` : durée du préavis (optionnel)

**UI** :
- Section "Disponibilité" sur la page review
- Badge visuel sur les cartes candidat (vert/orange/rouge)
- Filtre dans la liste et la recherche

---

### Feature 12 : Benchmark TJM / salaire

**Priorité** : P2
**Effort estimé** : M (1-2 semaines)

#### 3.12.1 Contexte

Le recruteur doit proposer un TJM cohérent avec le marché. Trop haut, le client refuse. Trop bas, le candidat refuse ou la marge est insuffisante.

#### 3.12.2 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| TJ-1 | En tant que recruteur, je veux voir une estimation de TJM pour un profil | Fourchette min/médian/max basée sur les compétences, séniorité et localisation |
| TJ-2 | En tant que manager, je veux configurer les grilles TJM de référence | Table de référence éditable par l'org (technos × séniorité × zone géo) |
| TJ-3 | En tant que recruteur, je veux voir le TJM suggéré dans le positionnement | Affichage dans l'analyse de positionnement, avec possibilité de l'inclure dans le dossier client |

#### 3.12.3 Spécifications fonctionnelles

**Table `tjm_reference`** :
- `org_id`, `skill_category` (ex: "React", "Java", "DevOps"), `seniority` (junior/confirmé/senior/expert), `location` (IDF/province/remote)
- `min_tjm`, `median_tjm`, `max_tjm` (en EUR)
- Éditable par les admins org

**Calcul** :
- Croisement compétences du candidat × grille de référence
- Pondération par la compétence dominante du profil
- Affichage d'une fourchette dans l'analyse de positionnement

---

### Feature 13 : Dossier client exportable (shortlist PDF)

**Priorité** : P2
**Effort estimé** : M (1-2 semaines)

> Couverte dans la Feature 7 (Comparatif multi-candidats & shortlist PDF). Cette feature est le volet export/présentation.

---

### Feature 14 : Notifications in-app

**Priorité** : P3
**Effort estimé** : M (1-2 semaines)

#### 3.14.1 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| NT-1 | En tant que recruteur, je veux recevoir une notification quand un workflow est terminé | Badge + dropdown de notifications dans le header |
| NT-2 | En tant que recruteur, je veux recevoir une notification de matching | Alerte quand un nouveau matching > seuil est détecté |
| NT-3 | En tant que recruteur, je veux recevoir des rappels | Rappels configurés (Feature tâches) apparaissent dans les notifications |

#### 3.14.2 Spécifications fonctionnelles

**Table `notifications`** :
- `id`, `org_id`, `user_id`, `type`, `title`, `body`, `link`, `read`, `created_at`
- Types : `workflow_complete`, `matching_detected`, `reminder`, `mention`, `pipeline_stale`

**UI** :
- Icône cloche dans le header avec badge compteur
- Dropdown avec liste des notifications récentes
- Page `/notifications` pour l'historique complet
- Marquage lu/non lu

---

### Feature 15 : Relances automatiques

**Priorité** : P3
**Effort estimé** : L (2-4 semaines)

#### 3.15.1 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| RL-1 | En tant que recruteur, je veux programmer une relance automatique après envoi d'email | Option "Relancer dans X jours si pas de réponse" à l'envoi |
| RL-2 | En tant que recruteur, je veux que l'IA génère le message de relance adapté au contexte | Relance différente selon : 1ère relance, 2ème, type d'interlocuteur |
| RL-3 | En tant que recruteur, je veux pouvoir annuler ou modifier une relance programmée | Liste des relances planifiées, avec actions modifier/annuler |

#### 3.15.2 Spécifications fonctionnelles

- Table `scheduled_followups` : `email_log_id`, `scheduled_at`, `status`, `attempt_number`, `generated_content`
- Cron job (Vercel Cron) : vérifie les relances dues, génère le contenu, envoie (ou notifie le recruteur pour validation)
- LLM task : `TASK_KEY.EMAIL_FOLLOWUP` avec contexte de l'email original et du positionnement

---

### Feature 16 : Rappels & tâches

**Priorité** : P3
**Effort estimé** : S (quelques jours)

#### 3.16.1 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| TA-1 | En tant que recruteur, je veux créer un rappel lié à un candidat/mission | Champ date + note, rattaché à l'entité |
| TA-2 | En tant que recruteur, je veux voir mes rappels du jour sur le dashboard | Section "Rappels du jour" avec liens directs |

#### 3.16.2 Spécifications fonctionnelles

- Table `reminders` : `id`, `org_id`, `user_id`, `candidate_id?`, `mission_id?`, `positioning_id?`, `due_date`, `note`, `completed`, `created_at`
- Widget dashboard
- Notification quand `due_date` atteinte

---

### Feature 17 : Portail candidat

**Priorité** : P3
**Effort estimé** : L (2-4 semaines)

#### 3.17.1 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| PC-1 | En tant que candidat, je veux voir mon CV formaté via un lien unique | Page publique `/portal/[token]` avec le CV formaté |
| PC-2 | En tant que candidat, je veux confirmer ma disponibilité | Bouton "Je suis disponible" / "Je ne suis plus disponible" |
| PC-3 | En tant que candidat, je veux uploader une version mise à jour de mon CV | Zone d'upload qui notifie le recruteur |

#### 3.17.2 Spécifications fonctionnelles

- Token unique par candidat (`candidate_portal_token` sur `candidates`)
- Pages `/portal/[token]` hors auth Clerk (routes publiques)
- Actions limitées : lecture CV, mise à jour dispo, upload CV
- Notification au recruteur en cas d'action candidat

---

### Feature 18 : Score de faisabilité mission

**Priorité** : P3
**Effort estimé** : S (quelques jours)

#### 3.18.1 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| SF-1 | En tant que recruteur, je veux savoir si une mission est réaliste à staffeur | Score affiché sur la fiche mission : nombre de profils matchants, cohérence TJM, délai |

#### 3.18.2 Spécifications fonctionnelles

- Calcul automatique après analyse de mission :
  - Nombre de candidats matchant > 60% dans le vivier
  - Cohérence TJM vs grille (si Feature 12 active)
  - Red flags de l'analyse d'offre
- Score composite : Facile / Modéré / Difficile / Très difficile
- Affiché en badge sur la page mission et dans la liste

---

### Feature 19 : Templates d'emails par contexte

**Priorité** : P3
**Effort estimé** : S (quelques jours)

#### 3.19.1 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| TE-1 | En tant que manager, je veux créer des templates d'email par type de contexte | CRUD templates : réponse AO, approche directe, relance, grand compte vs startup |
| TE-2 | En tant que recruteur, je veux choisir un template avant la génération | Sélecteur de template dans le flow de génération, le prompt IA s'adapte |

#### 3.19.2 Spécifications fonctionnelles

- Table `email_templates` : `id`, `org_id`, `name`, `context_type`, `tone`, `instructions`, `example`
- Intégration dans les prompts de génération email (variable `{{emailTemplate}}` dans le system prompt)

---

### Feature 20 : Rapports d'activité

**Priorité** : P3
**Effort estimé** : M (1-2 semaines)

#### 3.20.1 User Stories

| ID | Story | Critère d'acceptance |
|----|-------|---------------------|
| RA-1 | En tant que manager, je veux un rapport hebdo de l'activité de l'équipe | Rapport auto-généré : CVs traités, positionnements, taux conversion, temps gagné |
| RA-2 | En tant que recruteur, je veux exporter mes stats | Export PDF/CSV de mon activité sur une période |

#### 3.20.2 Spécifications fonctionnelles

- Page `/reports` avec sélection de période
- Métriques : CVs uploadés/finalisés, positionnements créés/exportés, emails envoyés, taux de conversion par étape pipeline, temps moyen par étape
- Export PDF (json-render) et CSV
- Option : envoi automatique par email (Vercel Cron + Feature 2)

---

## 4. Priorisation & roadmap

### Phase 1 — Réactivité & Productivité (P0)

| # | Feature | Effort | Dépendances |
|---|---------|--------|-------------|
| 1 | Auto-matching CV ↔ Missions | M | — |
| 2 | Envoi d'emails intégré | M | — |
| 3 | Upload & traitement batch | S | — |

**Objectif** : Le recruteur traite 10x plus vite et ne rate aucune opportunité.

### Phase 2 — Différenciation (P1)

| # | Feature | Effort | Dépendances |
|---|---------|--------|-------------|
| 4 | Recherche sémantique vivier | L | — |
| 5 | Brief candidat entretien | S | — |
| 6 | Pipeline kanban | M | — |
| 7 | Comparatif multi-candidats + shortlist PDF | M | Feature 6 |
| 8 | Positionnement batch | M | Feature 3 |

**Objectif** : Le recruteur apporte plus de valeur que la concurrence à chaque étape.

### Phase 3 — Communication & CRM (P2)

| # | Feature | Effort | Dépendances |
|---|---------|--------|-------------|
| 9 | Messages LinkedIn | S | — |
| 10 | Notes & fil d'activité | M | — |
| 11 | Gestion disponibilité | S | — |
| 12 | Benchmark TJM | M | — |

**Objectif** : L'outil devient le système de référence du recruteur, pas juste un outil ponctuel.

### Phase 4 — Automation & Scale (P3)

| # | Feature | Effort | Dépendances |
|---|---------|--------|-------------|
| 14 | Notifications in-app | M | Features 1, 6 |
| 15 | Relances automatiques | L | Feature 2 |
| 16 | Rappels & tâches | S | Feature 14 |
| 17 | Portail candidat | L | — |
| 18 | Score faisabilité mission | S | Feature 1 |
| 19 | Templates emails contextuels | S | Feature 2 |
| 20 | Rapports d'activité | M | Feature 6, 10 |

**Objectif** : L'outil travaille pour le recruteur même quand il ne l'utilise pas activement.

---

## 5. Métriques de succès

| Métrique | Baseline actuelle | Cible Phase 1 | Cible Phase 2 |
|----------|-------------------|---------------|---------------|
| Temps moyen upload → email envoyé | ~30 min (manuel) | < 5 min | < 3 min |
| Candidats positionnés / jour / recruteur | ~3-5 | ~15-20 | ~30+ |
| Taux de profils pertinents proposés au client | Non mesuré | > 70% match > 60 | > 80% |
| Temps de réponse à un nouveau besoin client | > 24h | < 2h | < 30 min |
| Adoption (sessions/semaine/recruteur) | Non mesuré | > 15 | > 25 |

---

## 6. Risques et mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Surcharge API LLM avec batch + matching | Coûts + rate limits | Throttling, cache, modèles légers pour le matching rapide |
| Complexité UX avec trop de features | Adoption faible | Déploiement progressif, feature flags par org |
| Emails envoyés avec erreurs (hallucination LLM) | Crédibilité | Toujours requérir validation humaine avant envoi |
| RGPD : données candidats, tracking emails | Juridique | Consentement explicite, purge automatique, droit à l'oubli |
| Embeddings vectoriels : coût stockage Supabase | Infra | pgvector gratuit sur Supabase Pro, monitoring usage |

---

*Ce PRD est un document vivant. Chaque feature sera détaillée en specs techniques avant implémentation.*
