# Brief v2 — Positionnement

Lis `COMMUN.md`, `v2-COMMUN.md`, `DESIGN.md` § Révision v2, et ton `positionnement-PLAN.md` v1. Branche
`refonte-positionnement` (déjà à jour du tronc). Même périmètre qu'en v1 ; tu consommes `SectionShell` et
`PdfPreview` (l'agent CV les fait évoluer à API constante ; leurs nouvelles props optionnelles arriveront par
fusion du tronc, ne les attends pas).

## Vu à l'écran (v1)

L'espace de positionnement : en-tête et stepper corrects ; à gauche « Fiche de poste », « Résultats », les
liens-onglets, « Score » et le texte, « Compétences »… tout posé nu, titres flottants ; à droite, le seul panneau
(« Lecture du matching ») montre ce que le reste devrait être. Les lignes de compétences (nom, « Fort » en vert,
deux lignes de texte) sont lisibles mais sans structure.

## Direction v2

### Nouveau positionnement (`positioning/page.tsx`)

`PageHeader` conservé. Les missions dans un **`Panel`** « Fiches de mission » (icône `Briefcase`, compteur,
action « Nouvelle mission ») avec une liste `divide-y` : chaque ligne = titre, entreprise, date en mono,
compteur de positionnements en mono, `StatusBadge` si la fiche est analysée ou non (`ok` « Analysée » /
`neutral` « À analyser »). La ligne choisie se déplie **dans le panneau** sur un corps `bg-panel-soft` : fiche en
lecture, état de l'analyse (`WorkflowStepList`), et « Analyser le matching » (`default`). État vide : `Empty` +
« Créer une mission ».

### Espace de positionnement (`[positioningId]/page.tsx`)

1. `PageHeader` et stepper conservés ; la zone d'état (`WorkflowStepList` + alerte) devient un `Panel` compact
   comme sur l'écran CV (icône `Sparkles`, « Analyse » ou « Génération », compteur d'étapes, replié en une ligne
   une fois fini).
2. **Étape 1, gauche** (`col-span-7`, `space-y-4`) :
   - `Panel` « Fiche de poste » (`FileText`, action « Modifier » ou le bouton d'analyse selon l'état).
   - `Panel` « Score » : corps en deux colonnes : à gauche le chiffre mono 2.25 rem coloré par `scoreTone` avec
     « / 100 » et la fiabilité en `StatusBadge` ; à droite le texte d'analyse ; action « Relancer l'analyse » dans
     l'en-tête ; avertissement de contexte périmé en `Alert` dans le corps. « Contexte pris en compte » en
     `PanelFooter` dépliable.
   - Les liens-onglets « Résultats · Questions · Historique » deviennent l'en-tête d'un `Panel` « Résultats »
     (`Tabs variant="line"` dans l'en-tête, contenu dans le corps) **ou** trois panneaux séparés (Compétences,
     Expériences, Lacunes) sous le panneau Score, avec Questions et Historique en panneaux repliés dessous : choisis
     dans ton plan ce qui fait le moins de vide ; la seconde option est recommandée.
   - `Panel` « Compétences » (`Wrench`, compteur « 12 fortes sur 15 ») : **`Table`** compétence · niveau
     (`StatusBadge` ok « Fort » / warn « Partiel » / err « Manquant ») · commentaire (une ligne, dépliable).
   - `Panel` « Expériences » (`Briefcase`) : lignes avec titre, pertinence en `StatusBadge`, texte.
   - `Panel` « Lacunes » (`AlertTriangle`, compteur) : liste `divide-y`.
   - `Panel` « Questions » (`MessageSquare`) : `QuestionsPanel` dans le corps, deux colonnes candidat / client ;
     `Panel` « Historique » (`History`, compteur) replié par défaut.
3. **Étape 1, droite** (`col-span-5`, collant) : le `Panel` « Lecture du matching » existant, inchangé dans sa
   logique, en-tête au format `PanelHeader` (icône `BarChart3`).
4. **Étape 2** : deux `Panel` « E-mail client » (`Mail`, les variantes en `Tabs variant="line"` dans l'en-tête,
   action « Régénérer ») et « E-mail candidat », `EmailEditor` dans le corps sans bordure propre.
5. **Étape 3** : `Panel` « CV retravaillé » (`FileText`, action « Régénérer », corps = `TailoredCvForm` en
   panneaux de section ou en sections `divide-y`) et `PdfPreview` à droite (devient un panneau via l'agent CV).
6. Toile : rien de nu ; `space-y-4` ; `px-6 py-6`.

## Conserver

Tout v1 (hooks, flux, actions, dialogues, info-bulles, auto-sauvegarde).
