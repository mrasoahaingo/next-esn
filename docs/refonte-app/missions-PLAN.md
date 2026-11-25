# Plan — Missions v2 (`/positions` et `/positions/[id]`)

Branche `refonte-missions`, périmètre de commit `refonte-missions`. Règles : `COMMUN.md`, `v2-COMMUN.md`,
`v2-missions.md`, `DESIGN.md` § « Révision v2 ». Modèles : `app/cvs/**`, `app/review/[id]/positioning/**`.

## Composition retenue

### Index `/positions`

1. `PageHeader` « Missions », description « {n} fiches de mission » (ou « Chargement… » / « Aucune fiche »),
   action `default` « Nouvelle mission » → `NewMissionDialog` (coque, navigation `?tab=analysis`).
2. Barre d'outils (même grammaire que `/cvs`) : recherche intitulé + entreprise (sans accents ni casse), chips
   Toutes · À analyser · Analyse en cours · Analysée · Échec, avec compteurs sur la liste filtrée par la recherche.
   La dérivation de l'état reprend `missionAnalysisStatus()` de `app/review/[id]/positioning/page.tsx`
   (`workflow_last_error` → err, `job_analysis_workflow_run_id` → info `pulse`, `hasPersistedJobAnalysis` → ok,
   sinon neutral).
3. `Panel` « Fiches de mission » (`Briefcase`, compteur `n` ou `visibles / n`) : `Table` à partir de `md`
   (Mission = intitulé + entreprise sur deux lignes ; Analyse de la fiche = `StatusBadge` ; Positionnements =
   « 3 · meilleur 84 » en mono via `scoreToneText`, calculé depuis `usePositionings()` regroupé par `mission_id`,
   comme `/cvs` le fait par candidat ; Créée = date relative courte ; Actions = ouvrir, `ghost` icône). Ligne
   entière cliquable, l'intitulé est le lien réel. Sous `md` : cartes compactes `divide-y`. Tri : plus récente
   en premier (déjà l'ordre de l'API, retrié côté client par sécurité).
4. Plus de redirection automatique quand il n'y a qu'une mission.
5. États : squelette à la forme (barre d'outils + panneau de 6 lignes) ; erreur `Alert destructive` +
   « Réessayer » ; vide = panneau `PanelEmpty` « Aucune fiche de mission » + « Créer une mission » ; filtre
   sans résultat = `PanelEmpty` « Aucune mission ne correspond » + « Effacer les filtres ».

Rien de collant sur l'index.

### Détail `/positions/[id]`

Page pleine largeur `px-6 py-6`, `gap-4`, toile `bg-shell`.

1. `PageHeader` : titre « {Intitulé} — {Entreprise} » (ou l'intitulé seul) ; description = niveau attendu
   (« Niveau attendu : Senior — Développeur senior ») si l'analyse est persistée, sinon une phrase d'état
   (« Fiche à analyser », « Analyse de la fiche en cours », « L'analyse de la fiche a échoué ») ; `meta` en mono :
   « Créée {date relative} · n positionnements » (pas de durée : elle n'est pas persistée pour l'analyse de la
   fiche, donc aucun chiffre inventé). Actions : primaire « Analyser la fiche » tant que rien n'est persisté
   (désactivée avec info-bulle pendant l'analyse), sinon « Positionner des CV » (ouvre le dialogue d'ajout) ;
   « Supprimer la mission » en `ghost` icône derrière l'`AlertDialog` existant. Zone `status` : l'analyse de
   la fiche — en cours : `Panel` « Analyse de la fiche » + `StatusBadge info pulse` + `WorkflowStepList` +
   « Annuler l'analyse » ; échec : `Panel` + `WorkflowFailureAlert` (message d'étape, « Relancer l'analyse ») ;
   terminée : `CollapsiblePanel` replié en une ligne (« n étapes », `StatusBadge ok` « Terminée ») ; fiche
   modifiée depuis : `StatusBadge warn` « Fiche modifiée » dans la ligne repliée, et « Relancer l'analyse » dans
   la synthèse.
2. Onglets `Tabs variant="line"` dans un `Panel` (`px-4`) : « Fiche et analyse » · « Positionnements (n) ».
   `?tab=analysis` / `?tab=positionings` conservés (`router.replace`), défaut inchangé (positionnements s'il y
   en a, sinon fiche).
3. Onglet 1, `lg:grid-cols-12 gap-4 items-start` :
   - gauche `lg:col-span-7` : `Panel` « Fiche de poste » (`FileText`, action « Modifier » → `JobDescriptionInput`
     existant + « Enregistrer » / « Annuler », `PATCH /api/missions/[id]` `{ jobDescription }` via `useMutation`
     local, puis invalidation `missions.detail` / `missions.list` / `dashboard` ; le serveur relance l'analyse
     lui-même) ; puis `Panel` « Points clés et barème » (`ListChecks`, compteur) = `components/mission-job-analysis.tsx`
     refait en **tableau** groupé par catégorie (ligne de groupe), colonnes : Point clé (libellé, rôle dans la
     mission, exigence), Importance (`#rang` mono + `StatusBadge` du niveau d'exigence : bloquant err,
     indispensable warn, important info, souhaitable neutral + poids en mono), Preuve attendue (mono), Compris
     (`Checkbox`, mutation existante), action « Expliquer » (`ghost sm`, dialogue existant restylé). Pastille
     « Assimilé » quand la clé est comprise.
   - droite `lg:col-span-5`, `lg:sticky lg:top-6 lg:self-start` : `Panel` « Synthèse » (`Sparkles`, action
     `AiGenerationInfoIcon` + « Relancer l'analyse » `outline sm`) : niveau attendu (`StatusBadge` de la bande,
     « Non négociable » en err, libellé de la fiche, résumé, ancienneté, signaux, questions de calibrage),
     résumé cadre, mots-clés de matching (mono), à clarifier avec le client, points de vigilance ; sections
     séparées par `divide-y`. Sans analyse : `PanelEmpty` « Fiche pas encore analysée » + « Analyser la fiche ».
     Pendant l'analyse : les sections arrivent en streaming (contenu partiel), un squelette calme pour ce qui
     manque.
4. Onglet 2 : `Panel` « CVs sur cette mission » (`Users`, compteur, action « Ajouter des CV » → `DropdownMenu`
   Importer des CV / Choisir des CV existants, qui ouvrent le dialogue existant sur le bon onglet). `Table` à
   toutes les largeurs (colonnes secondaires `hidden md:table-cell` : un seul composant de ligne, donc un seul
   `useWorkflowStream` par flux et par positionnement) : sélection pour comparer (`Checkbox`, visible quand ≥ 2
   profils prêts), candidat (`InitialsAvatar` + nom + titre, `AiGenerationInfoIcon`), score (mono,
   `scoreToneText`), statut (`StatusBadge`, tons de `cv-status.ts` ; « En extraction » `pulse` quand le CV
   importé est encore en extraction), ajouté le (date relative), actions (ouvrir, annuler le flux en cours,
   supprimer derrière l'`AlertDialog` existant). Ligne → `/review/[id]/positioning/[positioningId]` (ou
   `/review/[id]` tant que le CV s'extrait). Une ligne en cours ou en échec déplie une seconde ligne `colSpan`
   avec son `WorkflowStepList` (ou le message d'erreur + « Relancer l'analyse »). Pied de panneau quand ≥ 2
   sélectionnés : « 2 candidats sélectionnés · Effacer · Comparer » (remplace la barre flottante).
   Vide : `PanelEmpty` « Aucun CV sur cette mission » + « Positionner des CV ».
5. Dialogue d'ajout (`Positionner des CV`) restylé : `Tabs line` Importer / Candidats existants, zone de dépôt
   en filet pointillé `border-border`, liste à `Checkbox` + `InitialsAvatar`, bouton `default` « Positionner (n) ».
6. Dialogue de comparaison restylé : colonnes par candidat (avatar, nom, titre, score mono ; compétences par
   catégorie en barre `success` / `warning` / `destructive` ; points forts, partiels, expériences, lacunes,
   technologies clés en listes `StatusBadge`), plus de couleurs par candidat, « Meilleur » = `StatusBadge ok`.
7. États : chargement = squelette (en-tête, onglets, diptyque) ; introuvable = `Empty` « Mission introuvable »
   + « Retour aux missions ».

## Fichiers

Modifiés :
- `app/positions/page.tsx` — réécrit (liste).
- `app/positions/[id]/page.tsx` — réécrit (en-tête, onglets, orchestration) ; les sous-composants sortent dans
  `components/missions/`.
- `components/mission-job-analysis.tsx` — réécrit : panneau « Points clés et barème » en tableau ; le flux
  (`useWorkflowStream`) remonte dans `components/missions/use-mission-job-analysis.ts` pour servir l'en-tête,
  la synthèse et le tableau.

Créés (`components/missions/`) :
- `missions-list.ts` + `missions-list.test.ts` — types de la liste, `missionAnalysisStatus`, filtres, recherche,
  compteurs, tri, résumé des positionnements par mission.
- `missions-toolbar.tsx`, `missions-table.tsx`, `missions-skeleton.tsx`.
- `mission-format.ts` + `mission-format.test.ts` — titre de page, libellés des bandes et niveaux d'exigence,
  statut d'une ligne de positionnement (extraction / analyse), description d'en-tête.
- `use-mission-job-analysis.ts` — flux d'analyse de la fiche (stream, étapes, résumé, lancer / annuler).
- `mission-analysis-status.tsx` — zone `status` de l'en-tête.
- `job-description-panel.tsx` — fiche de poste, lecture et édition.
- `mission-synthesis-panel.tsx` — synthèse de l'analyse.
- `mission-positionings-table.tsx` — tableau des positionnements et sa ligne (flux par ligne).
- `add-cvs-dialog.tsx` — ancien `PositionCvsModal`.
- `compare-cvs-dialog.tsx` — ancien `CompareCvsModal`.
- `mission-detail-skeleton.tsx`.

Supprimés : aucun. `app/positions/loading.tsx` existe déjà (`route-loading`).

## Ce qui est retiré, et pourquoi

- La carte « Sélectionne une position » et la redirection automatique : la liste est la page.
- `glass-panel`, `title-gradient`, `neon-ring`, l'icône carrée lumineuse, `bg-violet`, `text-neon`, `amber-*`,
  `sky-*`, `text-[9px]`/`[10px]`/`[11px]`, les onglets segmentés, les badges `Badge` tous différents, l'anneau
  de score SVG avec easing élastique, les couleurs par candidat du comparatif, la barre flottante de
  comparaison (devient un pied de panneau), les phrases d'aide « Cliquez pour ouvrir… » (la ligne est
  cliquable, l'action est dans la colonne Actions), le tutoiement, « position » → « mission ».
- Les sections « En échec / En cours / Analysés et prêts » séparées : un seul tableau, le statut est une
  colonne, le tri reste score décroissant (échecs et en cours sans score en fin).

## Questions ouvertes (non bloquantes)

- Durée de l'analyse de la fiche : non persistée côté mission → pas affichée (« aucun chiffre inventé »).
- `GET /api/missions` ne renvoie pas le meilleur score : calculé côté client depuis `usePositionings()`.
- La comparaison de CV n'est pas dans le brief ; elle est conservée (comportement existant) et restylée.
