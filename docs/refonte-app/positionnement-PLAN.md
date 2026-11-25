# Plan — refonte Positionnement (`refonte-positionnement`)

Lu : `COMMUN.md`, `positionnement.md`, `DESIGN.md` § L'établi, références Hallmark (modern-minimal, anti-patterns,
layout, typo, couleur, copie, mouvement, micro-interactions, états, responsive, slop-test). Genre modern-minimal,
macrostructure Workbench, jetons Graphite Pro uniquement.

## 1. Nouveau positionnement — `app/review/[id]/positioning/page.tsx`

Composition, de haut en bas, colonne `max-w-3xl`, `px-4 md:px-6 py-5` :

1. `PageHeader` : titre « Nouveau positionnement », description « Pour {prénom nom} » (via `useCandidate`, déjà
   dans la liste des hooks du brief ; « Pour ce candidat » tant que le nom n'est pas chargé), action
   « Nouvelle mission » (`outline`). Plus de « Retour au CV » (le fil d'Ariane de la coque le porte).
2. Liste des fiches sur le papier (`divide-y divide-border`), sans carte. Chaque ligne : un `<button
   aria-pressed>` pleine largeur (titre 0.875 rem/500, entreprise en `muted-foreground`, date courte en mono,
   compteur « n positionnements » en texte mono). La ligne choisie porte `border-l-2 border-primary` et s'ouvre
   dessous, en dehors du bouton : fiche de poste en lecture (`JobDescriptionMarkdown` + lien « Voir la fiche »),
   `PositioningMissionAnalysisInline` (texte + `WorkflowStepList`, sans boîte), puis « Analyser le matching »
   (`default`, seul bouton plein de l'écran), `disabled` + `Tooltip` tant que `getPositioningMatchingCtaState`
   le dit (le texte d'aide existant devient l'info-bulle **et** reste visible en texte 0.75 rem pour le tactile).
3. Chargement : squelette de trois lignes (`Skeleton`, sans balayage). Vide : `Empty` (titre, phrase, bouton
   « Créer une mission »), sans icône décorative.
4. `Dialog` « Nouvelle fiche de mission » conservé : titre sans icône teintée, boutons `outline` + `default`.

Sticky : rien (la page est courte).

## 2. Espace de positionnement — `app/review/[id]/positioning/[positioningId]/page.tsx`

Écran de travail pleine largeur, `px-4 md:px-6 py-5`, `space-y-6` :

1. **`PageHeader`** — titre « {Candidat} × {Intitulé}, {Entreprise} » (repli : « {Candidat} × Positionnement »
   quand pas de mission liée) ; description = l'étape en cours (« Analyse du matching », « E-mails à relire »,
   « CV retravaillé à exporter ») ; `meta` = `dl` horizontale mono : score (« 84 / 100 · fiabilité élevée ·
   12 compétences fortes sur 15 ») quand il existe, durée de session (avec `Tooltip` du détail IA / édition,
   conservée), « Enregistrement automatique » (le hook `useAutoSave` n'expose aucun état ; on dit le mécanisme,
   on n'invente pas un statut). Actions : la primaire de l'étape (« Analyser le matching » / « Générer les
   e-mails » / « Exporter le PDF »), « Annuler » (`ghost`, pendant un flux, si `runId`), « Supprimer » (`ghost`
   icône + `AlertDialog` existant). `status` : `WorkflowStepList` du flux en cours (analyse ou génération) dans
   un bloc `border-l-2 border-primary pl-4`, `WorkflowFailureAlert` en échec, rien sinon. Les cartes candidat /
   mission et l'icône `GitCompare` disparaissent ; les liens vers le CV et la fiche mission passent en `meta`
   (deux liens texte).
2. **Stepper** (`components/PositioningStepper.tsx`, nouveau) : `<ol>` horizontal sur un filet bas, trois
   `<button>` « 1 Analyse », « 2 E-mails », « 3 CV retravaillé » (numéro en mono), état par la couleur du texte,
   point `bg-primary` sous l'étape courante (`aria-current="step"`), étapes à venir `disabled` + `Tooltip`
   (« Terminez l'analyse d'abord » / « Un flux est en cours »). Sous `md` : numéros + libellé court sur une ligne.
3. **Étape 1 — diptyque `lg:grid-cols-12`**. Gauche `col-span-7`, `space-y-8` :
   - `JobInput` refait : `h2` « Fiche de poste » sur filet ; en édition, `JobDescriptionInput` + bouton
     retiré (la primaire de l'en-tête lance l'analyse) ; en lecture, le texte clampé + « Voir tout » et un
     bouton `outline sm` « Modifier » qui repasse en édition locale (nouveau prop `onEdit` interne au composant :
     état `editing` local, même `onJobDescriptionChange`). Quand une mission est liée, le résumé « basé sur
     l'analyse structurée de la fiche » devient une phrase sous le `h2`.
   - Résultats : `h2` « Résultats » sur filet, puis les liens-onglets « Résultats · Questions · Historique »
     (`Tabs` `variant="line"`, 0.875 rem, filet `border-b-2` sur l'actif, jamais segmentés).
   - `AnalysisView` refait (sections sur le papier, `SectionShell` consommé pour attente / en cours / fini) :
     « Score » (chiffre mono 1.75 rem coloré `scoreToneText`, « fiabilité élevée » en texte avec `Tooltip`,
     `AiGenerationInfoIcon`, « Relancer l'analyse » `outline sm`, `Alert` de contexte périmé en
     `border-warning/40 bg-warning/8`), `matchSummary` sous le score (une seule fois), « Contexte pris en
     compte » en `<details>`, « Compétences » (liste `divide-y`, pertinence en texte coloré par statut),
     « Expériences », « Lacunes » (puces sobres, pas de « ! »).
   - `QuestionsPanel` refait : deux sections `h2` « Questions candidat » / « Questions client » sur filet, le
     nudge devient une phrase sous le `h2` ; retrait de « Synthèse du matching » (doublon) et du bouton
     « Générer » (la primaire de l'en-tête fait ce travail) ; « Relancer l'analyse » reste en `outline sm`.
   - Historique : `PositioningAnalysisHistoryTabContent` nettoyé (liste `divide-y`, boutons `outline sm`,
     squelette à la place du spinner).
   Droite `col-span-5`, `lg:sticky lg:top-16` : **un seul panneau** `bg-card border rounded-xl`
   « Lecture du matching » (`components/MatchingReadout.tsx`, nouveau) : une barre horizontale par catégorie de
   compétence, segments `bg-primary` (fort) / `bg-primary/60` (partiel) / `bg-primary/30` (manquant) sur piste
   `bg-muted`, pourcentage de couverture en mono ; légende textuelle une fois. Rien d'autre (lacunes et
   expériences restent à gauche). Vide : « Les barres apparaîtront après l'analyse. » ; pendant l'analyse :
   squelettes de barres. Regroupement et couverture = fonctions pures dans `components/matching-readout.ts`
   + test `matching-readout.test.ts`.
4. **Étape 2** : `EmailsGenerationStep` refait : `h2` « E-mails » sur filet avec `AiGenerationInfoIcon` et
   « Régénérer » `outline sm` à droite ; grille `lg:grid-cols-2` « Client » / « Candidat », chaque `h2` sur
   filet ; variantes du mail client en `Tabs` `line` ; `EmailEditor` garde TipTap, perd le verre (`border
   rounded-xl bg-card`), labels en casse de phrase. Pendant la génération : squelettes à la forme des deux
   colonnes ; le `WorkflowStepList` est rendu par l'en-tête (zone `status`), plus par l'étape.
5. **Étape 3 — diptyque** : gauche `col-span-7` : `h2` « CV retravaillé » sur filet, `AiGenerationInfoIcon`,
   « Régénérer » `outline sm`, « Comparer » `ghost` (ouvre le `Dialog` de comparaison conservé) ;
   `TailoredCvForm` sur le papier ; squelette pendant la génération. Droite `col-span-5` sticky : `PdfPreview`
   importé de `app/review/components/PdfPreview.tsx` (voir question ouverte) ; « Exporter le PDF » est la
   primaire de l'en-tête.
6. `PositioningMissionAnalysisInline` : texte + `WorkflowStepList`, sans boîte grisée, 0.75 rem minimum.

## Fichiers

Modifiés : `app/review/[id]/positioning/page.tsx`, `[positioningId]/page.tsx`, `components/AnalysisView.tsx`,
`components/QuestionsPanel.tsx`, `components/JobInput.tsx`, `components/EmailsGenerationStep.tsx`,
`components/EmailEditor.tsx`, `components/CvGenerationStep.tsx`, `components/PositioningAnalysisHistoryPanel.tsx`,
`components/positioning-mission-analysis-inline.tsx`.

Créés : `components/PositioningStepper.tsx`, `components/MatchingReadout.tsx`, `components/matching-readout.ts`,
`components/matching-readout.test.ts`.

Supprimés : `components/AnalysisCharts.tsx` (recharts, radars, palette huit couleurs ; importé par la seule page),
et la fonction `PositioningAnalysisHistoryFloatingTrigger` (import mort, aucun autre usage : `grep -rn`).

## Ce qui est retiré et pourquoi

- Dégradé de titre, icône lumineuse, pastille « Positionnement », cartes candidat / mission teintées et icône
  ronde : le titre « Candidat × Mission » porte l'information ; le fil d'Ariane dit où l'on est.
- Bande de score de la barre haute : le score vit une fois, dans `meta` de l'en-tête et dans la section Score.
- Radars en grille, palette arc-en-ciel, « Lacunes » et « Pertinence des expériences » dupliquées à droite : un
  seul panneau de lecture, une teinte, chaque information une fois.
- Onglets segmentés (étapes et sous-vues) : stepper + liens-onglets texte.
- Spinners centrés « Génération en cours… », `animate-ping`, listes de branches en pastilles : squelettes calmes
  + un seul `WorkflowStepList` dans la zone `status`.
- « Synthèse du matching » dans Questions, bouton « Générer » de Questions, « Exporter » dans le panneau CV,
  « Retour au CV » : doublons de l'action primaire de l'en-tête ou du fil d'Ariane.
- Copie locale de l'aperçu PDF : `PdfPreview` partagé.
- Couleurs nommées (`amber-*`), `neon`, `violet`, `glass-panel`, `overlay/*` : jetons seulement.

## Questions ouvertes

1. **`PdfPreview` n'a aucune prop** : il lit `useCvBuilderStore` (`pdfBlobUrl`, `isPdfLoading`, `pdfPageCount`,
   `cvData` pour le nom du fichier). Le positionnement garde son PDF dans `usePositioningStore`. Demande envoyée
   au coordinateur (type `question`) : ajouter des props optionnelles `pdfBlobUrl`, `isPdfLoading`,
   `pdfPageCount`, `downloadFilename`, `title`, `emptyLabel` avec repli sur le store quand elles sont absentes.
   En attendant la réponse, l'étape 3 est construite avec un adaptateur local minimal (`TailoredCvPreview`,
   `bg-card border rounded-xl`, iframe + « Télécharger ») que je remplacerai par `PdfPreview` dès que les props
   existent ; si la réponse n'arrive pas avant le compte rendu, je le dis dans `merge_ready`.
2. `useAutoSave` n'expose pas d'état : la `meta` dit « Enregistrement automatique » (mécanisme), pas un statut.
3. `SectionShell` et `WorkflowStepList` restent dans leur version actuelle (verre, pastilles `Badge`) : propositions
   dans le compte rendu, pas de modification ici.
