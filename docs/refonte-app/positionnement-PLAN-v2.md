# Plan v2 — refonte Positionnement (`refonte-positionnement`)

Lu : `COMMUN.md`, `v2-COMMUN.md`, `v2-positionnement.md`, `positionnement-PLAN.md` (v1), `DESIGN.md` en entier
(§ « Révision v2 — de « vide » à app moderne » en loi), références Hallmark (modern-minimal, layout, couleur,
mouvement, typo, copie, états, responsive, slop-test). Même logique et mêmes compositions qu'en v1 ; change la
**matière** : toile `bg-shell`, chaque bloc dans un `Panel`, tableaux, pastilles `StatusBadge`, compteurs, densité
`gap-4` / `px-6 py-6`, plus aucun bloc nu ni zone creuse.

Socle consommé sans modification : `Panel` / `PanelHeader` / `PanelBody` / `PanelFooter`, `StatusBadge`,
`InitialsAvatar`, `PageHeader`, `scoreTone()`, `SectionShell`, `PdfPreview`, `WorkflowStepList`,
`WorkflowFailureAlert`, `Table`, `Tabs` (`line`), `Empty`.

## 1. Nouveau positionnement — `app/review/[id]/positioning/page.tsx`

Toile `bg-shell`, colonne `max-w-4xl`, `px-6 py-6`, `space-y-4`.

1. `PageHeader` conservé (titre, « Pour {prénom nom} », action « Nouvelle mission » `outline`).
2. **`Panel` « Fiches de mission »** : `PanelHeader` (icône `Briefcase`, compteur = nombre de fiches, action
   « Nouvelle mission » `ghost sm` avec `Plus`). Corps `padded={false}` : liste `divide-y`. Chaque ligne = un
   `<button aria-expanded>` pleine largeur (`min-h-12 px-4`) : titre 0.875 rem / 500, entreprise en
   `muted-foreground`, à droite compteur de positionnements en mono, date courte en mono, `StatusBadge` d'état
   de la fiche (`ok` « Analysée » quand `hasPersistedJobAnalysis(job_analysis)` ; `info` + `pulse` « Analyse en
   cours » quand `job_analysis_workflow_run_id` ; `err` « Analyse échouée » quand `workflow_last_error` ; sinon
   `neutral` « À analyser ») et un chevron qui tourne. Le `GET /api/missions` renvoie `*` : ces champs sont dans
   la liste, aucune donnée inventée.
3. La ligne choisie se **déplie dans le panneau** sur un corps `bg-panel-soft` (`border-t`, `px-4 py-4`) :
   « Fiche de poste » en lecture (`JobDescriptionMarkdown` clampé + lien « Voir la fiche »),
   `PositioningMissionAnalysisInline` (texte + `WorkflowStepList`), puis le texte d'aide et « Analyser le
   matching » (`default`, seule primaire de l'écran, `disabled` + `Tooltip` selon `getPositioningMatchingCtaState`).
4. Chargement : trois lignes `Skeleton` dans le panneau. Vide : `Empty` dans le panneau (icône `Briefcase` 20 px
   dans un disque `bg-muted` via `EmptyMedia variant="icon"`, titre, phrase, bouton « Créer une mission »),
   160 px au plus.
5. `Dialog` « Nouvelle fiche de mission » inchangé.

## 2. Espace de positionnement — `[positioningId]/page.tsx`

Toile `bg-shell`, pleine largeur, `px-6 py-6`, `space-y-4` (le diptyque garde `gap-4`).

1. **`PageHeader`** conservé (titre « Candidat × Mission », description = étape, `meta` mono, actions). La zone
   `status` devient un **`Panel` compact** (`components/WorkflowStatusPanel.tsx`, nouveau) : `PanelHeader`
   (icône `Sparkles`, « Analyse du matching » ou « Génération », compteur « n / m étapes » en mono,
   `StatusBadge` `info` + `pulse` « En cours » ou `err` « Échec » dans les actions). Corps : `WorkflowStepList`
   pendant le travail ; `WorkflowFailureAlert` (avec « Réessayer ») en échec ; **une fois fini**, le panneau se
   replie en une ligne (`<details>` : résumé mono « Analyse terminée en 42 s · 5 étapes », le détail des étapes
   dedans). Le résumé n'est rendu que si la durée persistée existe (`ai_analysis_duration_ms`,
   `ai_generation_duration_ms`) : aucun chiffre inventé. Jamais deux indicateurs pour le même travail.
2. **Stepper** (`PositioningStepper`) conservé dans sa logique ; il quitte le filet nu et devient une barre de
   navigation dans un `Panel` (`px-4`, filet `primary` sous l'étape courante, numéros mono).
3. **Étape 1, gauche** (`lg:col-span-7`, `space-y-4`) :
   - `Panel` « Fiche de poste » (`FileText`) : description sous le titre quand une mission est liée ; action
     « Modifier » / « Terminer » `outline sm` (l'analyse reste la primaire de l'en-tête : une seule `default`
     par écran). Corps : texte clampé + « Voir tout », ou `JobDescriptionInput`.
   - `Panel` « Score » (`Gauge`) : actions = `AiGenerationInfoIcon` + « Relancer l'analyse » `outline sm`.
     Corps en deux colonnes (`sm:grid-cols-[auto_1fr]`) : à gauche le chiffre mono 2.25 rem coloré par
     `scoreToneText`, « / 100 », la fiabilité en `StatusBadge` (`high` → `ok`, `medium` → `warn`, `low` →
     `err`, absente → `neutral` « Non évaluée », note en `Tooltip`) ; à droite `matchSummary`. `Alert` de
     contexte périmé dans le corps. `PanelFooter` = `<details>` « Contexte pris en compte · n notes ».
   - **Trois panneaux séparés** (option recommandée, retenue : moins de vide, tout visible d'un coup) :
     - `Panel` « Compétences » (`Wrench`, compteur « 12 fortes sur 15 ») : **`Table`** Compétence · Niveau
       (`StatusBadge` `ok` « Fort » / `warn` « Partiel » / `err` « Manquant ») · Commentaire sur une ligne
       (`truncate`), ligne entière cliquable (`aria-expanded`) pour déplier commentaire complet + note.
     - `Panel` « Expériences » (`Briefcase`, compteur) : liste `divide-y`, titre + `StatusBadge` de pertinence
       (`high` → `ok` « Forte », `medium` → `warn` « Moyenne », `low` → `err` « Faible »), commentaire, note.
     - `Panel` « Lacunes » (`AlertTriangle`, compteur) : liste `divide-y` ; vide : « Aucune lacune relevée. ».
   - `Panel` « Questions » (`MessageSquare`, compteur = nombre de questions ; description = la phrase de
     nudge ; action « Relancer l'analyse » `outline sm`) : corps en deux colonnes candidat / client
     (`lg:grid-cols-2 lg:divide-x`), chaque colonne `h3` + liste `divide-y` (`QuestionsPanel` refait).
   - `Panel` « Historique » (`History`, compteur) **replié par défaut** : `<details>` dont le `<summary>` tient
     le rôle de l'en-tête (même grammaire : icône, titre, compteur, chevron). Le composant
     `PositioningAnalysisHistoryPanel` porte le hook `usePositioningAnalysisHistory` (déjà le sien) et le compteur.
   - Pendant l'analyse : `SectionShell` **dans le corps** de chaque panneau (`pending` = squelette dans le
     panneau, `streaming` = filet gauche `primary` + « En cours ») ; l'en-tête du panneau reste visible.
     Avant toute analyse (brouillon) : pas de panneaux de résultats vides, la colonne ne montre que la fiche.
4. **Étape 1, droite** (`lg:col-span-5`, collant `top-5`) : `MatchingReadout` devient un `Panel`
   (`PanelHeader` icône `BarChart3`, « Lecture du matching », description ; corps = les barres ; légende en
   `PanelFooter`). Logique inchangée (`computeCategoryCoverage`).
5. **Étape 2** : `lg:grid-cols-2 gap-4` : `Panel` « E-mail client » (`Mail` ; action « Régénérer » `outline sm`
   + `AiGenerationInfoIcon` + `StatusBadge` `pulse` « En cours » pendant la génération) et `Panel` « E-mail
   candidat ». Les trois variantes du mail client en `Tabs variant="line"` **sur une bande sous l'en-tête**
   (`px-4 border-b`) plutôt que dans l'en-tête : à 375 px, titre + trois onglets + bouton ne tiennent pas sur
   une ligne (porte 49 du slop-test). `EmailEditor` perd sa carte propre (objet + corps, sans bordure de
   section). Squelettes dans le corps des panneaux pendant la génération.
6. **Étape 3** : `Panel` « CV retravaillé » (`FileText` ; actions « Comparer » `ghost sm`, « Régénérer »
   `outline sm`, `AiGenerationInfoIcon`) ; corps `padded={false}` = `TailoredCvForm` en **sections `divide-y`**
   (`px-4 py-4` chacune), pas de panneau dans un panneau. `PdfPreview` à droite, collant, inchangé (il devient
   un panneau via l'agent CV).
7. Squelette de chargement de la route : à la forme des panneaux (en-tête + diptyque).
8. `PositioningMissionAnalysisInline` : texte + `WorkflowStepList` sans boîte, 0.75 rem minimum (inchangé en
   logique ; `mt-4` au lieu de `mt-6` pour la densité v2).

## Fichiers

Modifiés : `app/review/[id]/positioning/page.tsx`, `[positioningId]/page.tsx`, `components/AnalysisView.tsx`,
`components/QuestionsPanel.tsx`, `components/JobInput.tsx`, `components/MatchingReadout.tsx`,
`components/EmailsGenerationStep.tsx`, `components/EmailEditor.tsx`, `components/CvGenerationStep.tsx`,
`components/TailoredCvForm.tsx`, `components/PositioningAnalysisHistoryPanel.tsx`,
`components/PositioningStepper.tsx`, `components/positioning-mission-analysis-inline.tsx`.

Créés : `components/WorkflowStatusPanel.tsx` (zone d'état compacte), `components/CollapsiblePanel.tsx`
(panneau `<details>` à la grammaire `PanelHeader`, pour Historique et le contexte pris en compte),
`components/relevance-badge.ts` (fonctions pures : niveau → ton / libellé, pour compétences et expériences)
+ `relevance-badge.test.ts`.

Supprimés : aucun.

## Ce qui est retiré et pourquoi

- Titres `h2` / `h3` sur filet posés nus sur le fond : chaque bloc a désormais un en-tête de panneau.
- Les liens-onglets « Résultats · Questions · Historique » : trois panneaux visibles + Questions + Historique
  replié font moins de vide qu'un onglet qui cache deux tiers du contenu.
- La ligne de pertinence en texte coloré (« Fort » vert) : `StatusBadge`, même pastille que partout.
- La carte propre de `EmailEditor` et celle de `MatchingReadout` : le panneau est la seule carte.
- `border-l-2 border-primary` nu autour du `WorkflowStepList` de l'en-tête : le panneau d'état le remplace.

## Questions ouvertes

1. `SectionShell` `pending` rend un squelette avec un faux titre sur filet ; dans un panneau, ce faux titre
   double l'en-tête du panneau. Je l'utilise tel quel (API constante) ; si l'agent CV lui ajoute une prop
   « sans titre », je la consommerai. Signalé dans le compte rendu.
2. Les sections de `TailoredCvForm` (`PersonalInfo`, `Summary`…) appartiennent à l'écran CV ; si elles
   deviennent des `Panel` par fusion du tronc, le panneau « CV retravaillé » devra se réduire à un en-tête
   (sinon panneau dans panneau). Signalé dans le compte rendu.
3. Le `StatusBadge` de fiabilité n'a pas de ton « non évaluée » autre que `neutral` : retenu.
