# Brief — Positionnement (`/review/[id]/positioning` et `/review/[id]/positioning/[positioningId]`)

Lis d'abord `docs/refonte-app/COMMUN.md` et `DESIGN.md` § L'établi. Périmètre : `app/review/[id]/positioning/**`,
`components/positioning-mission-analysis-inline.tsx`. Branche `refonte-positionnement`, périmètre de commit
`refonte-positionnement`. Tu **consommes** `app/review/components/SectionShell.tsx` et
`app/review/components/PdfPreview.tsx` (l'agent CV les refait en parallèle, à API constante) : importe-les, ne les
modifie pas ; ton worktree en voit l'ancienne version, c'est attendu.

## 1. Nouveau positionnement — `positioning/page.tsx`

Choisir ou créer une fiche de mission pour ce CV. **Action principale : « Analyser le matching »** (dans la
mission sélectionnée). Hooks : `useMissions`, `useMission`, `useCreateMission`, `useCreatePositioning`,
`useCandidate`, et `useWorkflowStream` sur `/api/missions/[id]/analyze-job` dans
`PositioningMissionAnalysisInline`.

État actuel : bouton « Retour au CV » (doublon du fil d'Ariane) ; carte de verre avec icône violette
`neon-ring`, `h1` « Nouveau positionnement » en dégradé ; carte « Fiches de mission » + « Nouvelle mission » ;
liste accordéon (point radio maison, titre, entreprise, aperçu deux lignes, `Badge` « n positionnements »,
date) ; la ligne sélectionnée (`violet-ring`) s'ouvre sur « Fiche de poste » (`JobDescriptionMarkdown`,
« Voir la fiche »), `PositioningMissionAnalysisInline` (boîte « Analyse de la fiche mission »,
`AiGenerationInfoIcon`, spinner, `WorkflowStepList`) et le bouton avec son aide ; `Dialog` « Nouvelle fiche de
mission » (Intitulé, Entreprise, `JobDescriptionInput`) ; chargement « Chargement des missions... » ; vide
« Aucune fiche de mission » avec icône et « Créer une mission ». Colonne `max-w-4xl` centrée.

Direction : en-tête (`PageHeader`) titre « Nouveau positionnement », description « Pour {candidat} », action
« Nouvelle mission » (`outline`) ; plus de « Retour au CV ». La liste des missions sur le papier (`divide-y`),
chaque ligne un vrai bouton `aria-pressed` (ou un `<input type="radio">` masqué avec son `label`) : titre,
entreprise, date courte en mono, compteur de positionnements en texte, pas en `Badge` coloré. La ligne choisie se
marque par `border-l-2 border-primary` et s'ouvre dessous (pas de halo) : la fiche de poste en lecture, l'état de
l'analyse de la fiche (`WorkflowStepList` dans un bloc sobre, `AiGenerationInfoIcon` conservé), puis « Analyser
le matching » (`default`), seul bouton plein de l'écran, désactivé avec info-bulle tant que l'analyse de la fiche
n'est pas prête. État vide : `Empty` avec « Créer une mission ». Colonne `max-w-3xl`.

## 2. Espace de positionnement — `positioning/[positioningId]/page.tsx`

Assistant en trois temps : analyse du matching (IA, `/api/positioning/analyze`) → e-mails client et candidat
(`/api/positioning/generate`) → CV retravaillé et export PDF. L'action principale change avec l'étape :
« Analyser le matching » → « Générer » → « Exporter ». Hooks : `usePositioning`, `useCandidate`,
`useUpdatePositioning`, `useExportPositioning`, `useDeletePositioning`, `useCancelWorkflow`, `useWorkflowStream`
(deux fois), `usePositioningStore`, `useTemplateStore`, `usePdfPreview`, `useSessionTimer`, `useAutoSave`,
`usePositioningAnalysisHistory`, `computePositioningAnalysisStepStates`, `computePositioningGenerateStepStates`.

État actuel : barre haute de verre (icône lumineuse, pastille « Positionnement », `h1` « Positionnement sur
offre » en dégradé, puce de temps ; à droite bande de score (score %, forts/total, lacunes), pastille « Analyse
en cours... » + Annuler, corbeille `AlertDialog` ; dessous, carte candidat teintée neon → icône ronde
`GitCompare` → carte mission teintée violet). `Tabs` segmentés centrés `max-w-2xl` : « 1 Analyse & affinage »,
« 2 Emails (client & candidat) », « 3 CV retravaillé ». Corps `lg:grid-cols-2` (une colonne à l'étape 2) :

- Étape 1 : `JobInput` (carte de verre « Fiche de poste ») ; pendant le flux `AnalysisView` (`WorkflowStepList`
  + cartes `SectionShell` : « Score de matching » (3xl %, badge « Fiabilité » avec info-bulle, « Relancer »,
  avertissement ambre de contexte périmé), « Contexte pris en compte pour ce calcul », « Compétences »,
  « Pertinence des expériences », « Lacunes identifiées ») ; après l'analyse, `Tabs` segmentés **imbriqués**
  « Résultats » / « Questions & Affinage » (`QuestionsPanel` : « Questions candidat », « Questions client »,
  « Synthèse du matching », « Générer → ») / « Historique » (`PositioningAnalysisHistoryTabContent`). Colonne
  droite : carte « Visualisation de l'analyse » → `AnalysisCharts` (un radar recharts par catégorie en grille de
  cartes identiques, palette huit couleurs ; repli liste ; barres « Pertinence des expériences » ; « Lacunes
  (n) » ; vide « Les visualisations apparaîtront après l'analyse »). Lacunes et pertinence des expériences
  apparaissent donc **deux fois** (gauche et droite) ; « Synthèse du matching » répète `matchSummary`.
- Étape 2 : `EmailsGenerationStep` : panneau « Propositions » + régénérer ; spinner centré et liste des branches
  pendant la génération, ou `WorkflowStepList` ; grille deux colonnes « Client » (`Tabs` segmentés trois
  variantes : complet / premier contact / points clés) et « Candidat », chacun un `EmailEditor` (TipTap).
- Étape 3 : `CvGenerationStep` : panneau « CV retravaillé » (régénérer, « Exporter ») ; spinner pendant la
  génération ; `TailoredCvForm` ou texte vide. Colonne droite : « Aperçu CV retravaillé », iframe PDF plein
  écran / « Télécharger » **réimplémentés à la main** (copie de `PdfPreview`).
- `Dialog` plein écran « Comparaison des CV » (deux iframes). Import mort :
  `PositioningAnalysisHistoryFloatingTrigger`.

Tics à retirer : dégradé, icône lumineuse, pastille-surtitre ; cartes teintées reliées par une icône ; mur de
cartes de verre à titres identiques ; radars en grille et palette arc-en-ciel ; onglets segmentés imbriqués ;
spinners centrés « Génération en cours... » ; « ! » comme icône ; `animate-ping`, `animate-shimmer`, `neon-ring`,
`violet-ring`, `glass-panel`, `title-gradient` ; contenu dupliqué gauche / droite ; copie locale de l'aperçu PDF.

Direction :

1. **En-tête** (`PageHeader`) : titre « {Candidat} × {Intitulé de mission}, {Entreprise} » ; description =
   l'étape en cours en une phrase (« Analyse du matching », « E-mails à relire », « CV retravaillé à exporter ») ;
   `meta` = score en mono quand il existe (« 84 / 100 · fiabilité élevée · 12 compétences fortes sur 15 »), durée
   de session. Actions : la primaire de l'étape (`default`) ; « Annuler » (`ghost`, pendant un flux) ;
   « Supprimer » (`ghost` icône, `AlertDialog` existant). Zone `status` : `WorkflowStepList` du flux en cours
   (analyse ou génération), `Alert` en erreur, rien quand tout est calme. Les cartes candidat / mission et
   l'icône ronde disparaissent : le titre les porte.
2. **Navigation d'étapes** : un **stepper** horizontal sur un filet (trois étapes numérotées en mono « 1 2 3 »,
   état fait / en cours / à venir par la couleur du texte et un point `bg-primary` sous l'étape courante), pas
   des `Tabs` segmentés. Les étapes faites sont cliquables ; les étapes à venir sont désactivées avec info-bulle.
   Sous `md`, le stepper tient sur une ligne (numéros + libellé court).
3. **Étape 1 — diptyque** `lg:grid-cols-12` : à gauche (`col-span-7`) la fiche de poste (`JobInput`, sur le
   papier, `h2` sur filet ; en lecture après analyse avec « Modifier »), puis les résultats en sections sur le
   papier : « Score » (chiffre mono 1.75 rem coloré par `scoreTone()`, fiabilité en texte avec info-bulle,
   « Relancer l'analyse » en `outline` `sm`, avertissement de contexte périmé en `Alert` `warning`-teinté :
   `border-warning/40 bg-warning/8`) ; « Contexte pris en compte » en `<details>` ; « Compétences » ;
   « Expériences » ; « Lacunes » (liste à puces sobres, pas de « ! »). À droite (`col-span-5`, sticky) un seul
   panneau « Lecture du matching » : barres horizontales **par catégorie de compétence** (une teinte `primary`,
   segments par clarté, pourcentage en mono), en remplacement des radars ; rien d'autre. **Chaque information
   n'apparaît qu'une fois** : lacunes et pertinence des expériences restent à gauche, le panneau de droite ne les
   répète pas. Les sous-vues « Questions et affinage » et « Historique » deviennent deux liens-onglets texte
   (`border-b-2` sur l'actif) **sous le `h2` des résultats**, pas des onglets segmentés : « Résultats ·
   Questions · Historique ». « Synthèse du matching » n'apparaît qu'une fois (dans Résultats). Le bouton
   « Générer » de `QuestionsPanel` est retiré : la primaire de l'en-tête fait ce travail.
4. **Étape 2** : « Client » et « Candidat » en deux colonnes `lg:grid-cols-2` sur le papier, chaque `h2` sur
   filet, les trois variantes du mail client en liens-onglets texte ; `EmailEditor` garde TipTap, perd le verre
   (`border rounded-xl bg-card` : c'est un document, la carte est justifiée). Pendant la génération, squelettes à
   la forme des deux colonnes et le `WorkflowStepList` dans la zone `status` ; plus de spinner centré.
   « Régénérer » en `outline` `sm` à droite du `h2`.
5. **Étape 3 — diptyque** : `TailoredCvForm` à gauche (`col-span-7`) sur le papier ; à droite (`col-span-5`,
   sticky) **`PdfPreview` importé de `app/review/components/PdfPreview.tsx`** à la place de la copie locale
   (adapte les props existantes ; si une prop manque vraiment, demande-la par message `question` au
   coordinateur, qui la fera ajouter côté CV). « Exporter le PDF » est la primaire de l'en-tête ; « Régénérer »
   `outline` `sm`. `Dialog` « Comparaison des CV » conservé, ouvert par un bouton `ghost` « Comparer ».
6. Retire l'import mort `PositioningAnalysisHistoryFloatingTrigger` (vérifie qu'il n'est utilisé nulle part
   ailleurs avant de supprimer le composant lui-même ; sinon laisse le fichier).
7. `PositioningMissionAnalysisInline` : même traitement sobre que la zone d'état (texte + `WorkflowStepList`),
   sans boîte grisée.

## Conserver

Tous les hooks et les deux flux ; `useAutoSave` et son indicateur (à placer en `meta`) ; l'historique des
analyses et ses actions ; les trois variantes de mail et TipTap ; l'export et la comparaison ; la suppression
avec `AlertDialog` ; `AiGenerationInfoIcon` partout où il est ; les info-bulles de fiabilité et de doublon.
