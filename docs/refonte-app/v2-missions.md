# Brief v2 — Missions (`/positions` et `/positions/[id]`)

Lis `docs/refonte-app/COMMUN.md`, `docs/refonte-app/v2-COMMUN.md` et `DESIGN.md` en entier (surtout § « Révision
v2 — de « vide » à app moderne »). Branche `refonte-missions`, périmètre de commit `refonte-missions`, worktree
`refonte-missions` (issu du tronc, qui contient déjà la coque, le tableau de bord, `/cvs`, le CV et le positionnement
en v2 : regarde-les comme modèles, surtout `app/cvs/**` et `app/review/[id]/positioning/**`).

## Périmètre

Possédés : `app/positions/**` (index, détail, `loading.tsx` à créer si absent), `components/mission-job-analysis.tsx`,
`components/missions/**` (nouveau, pour tes composants). Tu **consommes** sans les modifier :
`components/new-mission-dialog.tsx` (coque), `components/app/*` (panel, kpi-card, status-badge, initials-avatar,
page-header), `components/cvs/cv-status.ts` (tons et libellés des statuts de candidat et de positionnement),
`app/review/[id]/positioning/[positioningId]/components/WorkflowStatusPanel.tsx` et `CollapsiblePanel.tsx` si leurs
props te conviennent (sinon, écris les tiens dans `components/missions/`), `components/workflow/WorkflowStepList`,
`components/ai/ai-generation-info`. Interdits : tout le reste (COMMUN.md § Périmètre), dont `lib/queries/**` et
`app/api/**` ; si une donnée manque à l'API, demande-la par courrier `question`.

## Pourquoi (vu à l'écran par l'utilisateur)

« Je ne comprends pas la liste des missions. » L'entrée « Missions » du nouveau menu mène à `/positions`, qui
affiche aujourd'hui une carte « Sélectionne une position — choisis-en une dans la barre latérale (onglet
Positions) » : cette barre n'existe plus, et la page redirige d'elle-même vers le détail quand il n'y a qu'une
mission. Il n'y a donc **aucune liste**. Le détail (`app/positions/[id]/page.tsx`, 1 956 lignes) est encore dans
l'ancien style : `glass-panel`, `title-gradient`, onglets segmentés « analysis / positionings », badges colorés.

Hooks du détail à conserver (ordre compris) : `useParams`, `useRouter`, `useSearchParams` (`?tab=analysis`, utilisé
par le dialogue de nouvelle mission de la coque), `useQueryClient`, `useAuth`, `useMission`, `useCandidates`,
`useDeleteMission`, `useDeletePositioning`, `useCancelWorkflow`, `useUploadCvsForMission`,
`usePositionExistingCandidates`, `useWorkflowStream` (analyse de la fiche), `queryKeys`,
`parsePositioningAnalysisModelsSnapshot` / `formatHistoryModelsDisplayLabel`, `getFrenchStepShortLabel`.

## Direction

### Index `/positions` — la liste des missions, à sa place

- `PageHeader` « Missions », description « {n} fiches de mission », action « Nouvelle mission » (`default`) qui
  ouvre `NewMissionDialog` (le composant de la coque, avec sa navigation `?tab=analysis`).
- Barre d'outils comme `/cvs` : recherche (intitulé, entreprise, sans accents ni casse), chips de filtre avec
  compteurs : Toutes · À analyser · Analyse en cours · Analysée · Échec (dérivés des champs renvoyés par
  `GET /api/missions`, de la même façon que `app/review/[id]/positioning/page.tsx` le fait pour ses pastilles :
  reprends cette dérivation).
- `Panel` « Fiches de mission » (`Briefcase`, compteur) en **`Table`** à partir de `md` : intitulé + entreprise
  (deux lignes), analyse de la fiche (`StatusBadge` ok / info `pulse` / neutral / err), positionnements
  (« 3 · meilleur 84 » en mono, `scoreTone`), créée le (date relative courte), actions (`ghost` icône : ouvrir).
  Ligne entière cliquable → `/positions/[id]`. Sous `md` : cartes compactes. Tri : plus récente en premier.
- **Plus de redirection automatique** vers le détail quand il n'y a qu'une mission : la liste s'affiche toujours.
- États : squelette à la forme du panneau ; erreur `Alert` + « Réessayer » ; vide `Empty` + « Créer une mission ».

### Détail `/positions/[id]` — une mission sur l'établi

- `PageHeader` : titre « {Intitulé} — {Entreprise} » ; description = niveau attendu ou état de l'analyse en une
  phrase ; `meta` en mono (créée le, n positionnements, durée de l'analyse si persistée). Actions : la primaire
  selon l'état (« Analyser la fiche » tant qu'elle ne l'est pas, sinon « Positionner des CV », qui ouvre le flux
  existant d'ajout de candidats : import ou choix de CV existants, mêmes hooks, mêmes dialogues) ; « Supprimer la
  mission » en `ghost` icône derrière l'`AlertDialog` existant. Zone `status` : l'analyse de la fiche
  (`WorkflowStepList` pendant le flux, `Alert` en échec, une ligne repliée une fois finie), comme sur le CV et le
  positionnement.
- Onglets `Tabs variant="line"` sous l'en-tête (dans un panneau, comme le stepper du positionnement) :
  **« Fiche et analyse »** · **« Positionnements (n) »**. Le paramètre `?tab=analysis` continue d'ouvrir le premier.
- Onglet 1, diptyque `lg:grid-cols-12 gap-4 items-start` : à gauche (`col-span-7`) `Panel` « Fiche de poste »
  (`FileText`, `JobDescriptionMarkdown`, action « Modifier » / « Enregistrer » avec le champ existant) puis
  `Panel` « Points clés et barème » (ce que `MissionJobAnalysis` rend aujourd'hui, passé en **tableau** : point
  clé, importance / poids, niveau attendu, en `StatusBadge` ou en mono ; refais `components/mission-job-analysis.tsx`
  dans la grammaire panneau) ; à droite (`col-span-5`, collant `lg:top-6`) `Panel` « Synthèse » (niveau attendu,
  résumé de l'analyse, modèles utilisés via `AiGenerationInfoIcon`, « Relancer l'analyse » `outline sm`).
- Onglet 2 : `Panel` « CVs sur cette mission » (`Users`, compteur, action « Ajouter des CV » → `DropdownMenu`
  Importer des CV / Choisir des CV existants, flux existants) en **`Table`** : avatar + candidat + titre, score
  (`scoreTone`), statut du positionnement (`StatusBadge`, tons de `cv-status.ts`, `pulse` en cours), mis à jour,
  actions (ouvrir le positionnement, annuler un flux en cours, supprimer le positionnement derrière
  l'`AlertDialog` existant). Ligne → `/review/[id]/positioning/[positioningId]`. Pendant un import groupé, les
  lignes en extraction apparaissent avec leur pastille `pulse` (même logique qu'aujourd'hui).
- Tous les interdits v1/v2 : plus de `glass-panel`, `title-gradient`, `neon` / `violet` / `amber-*`, textes sous
  0,75 rem, tutoiement (« Crée une position », « Sélectionne… » → vouvoiement, « mission » partout, plus
  « position »).

## Conserver

Tous les hooks et leur ordre ; les deux flux (analyse de la fiche, import groupé) ; les dialogues de suppression
et d'ajout ; les invalidations de cache (`queryKeys`) ; `?tab=analysis` ; les textes d'erreur de l'API.
