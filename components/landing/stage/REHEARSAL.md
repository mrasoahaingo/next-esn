# Rehearsal: visite de la landing (4 scènes)

Composants : `extract-stage.tsx` (01), `mission-stage.tsx` (02), `ranking-stage.tsx` (03),
`email-stage.tsx` (04), montés par `tour-stage.tsx` (bouton « Rejouer »), styles `stage.css`.
Kit copié dans `components/stageshow/kit/` ; seules les pièces utiles sont importées (`kit.ts`).

## Compositions (r15) : quatre layouts de `references/framing.md`, un par histoire

Golds filmés depuis la copie du skill du relecteur (`scratchpad/review/stageshow`), stills côte
à côte avec les nôtres dans `.media/esneo/apercu/r15/`.

- 01, **fenêtres qui se chevauchent** (gold `overlap`) : le CV reçu, du papier sans chrome,
  devant la fenêtre de la fiche. Fenêtre en retrait de 24 px en haut, dans une colonne de
  120 px à gauche, qui file à droite et en bas ; barre latérale de remplissage de 148 px ; le CV
  à la gouttière (24 px), 220 px de large, s'arrête à 24 px de la ligne de la barre latérale :
  il ne couvre que du remplissage. Le fichier part du pied du CV et vole jusqu'à la zone.
  Compact (colonne ≤ 37,5rem : 1024, téléphone) : le CV est retiré (framing.md, Small formats),
  la fenêtre seule ; le fichier arrive de juste au-dessus de la zone, qui s'allume d'abord.
- 02, **panneau sur le produit** (gold `panel-annotation`) : la fiche de mission épinglée en
  haut à gauche (gouttière 24 px), 400 px, qui file par le bas, marge droite de 96 px ; la
  demande du client, panneau de papier devant, à cheval sur le bord droit au-dessus de la
  marge seule, à la gouttière de droite. Les passages se marquent quand leur point arrive ;
  une seule ligne, en encre neutre, du passage « culture assurance » au point qu'il produit,
  par le sol vide, après coup. Compact (≤ 30rem) : panneau retiré (il couvrirait la liste),
  la fenêtre seule.
- 03, **gros plan** (gold `close-up`) : la fenêtre entière, chrome compris, à 1,3 fois, en
  retrait de 18 px en haut et sur les côtés, qui file par le bas ; les trois lignes classées
  entières ; la confiance dans l'en-tête. Compact : 1,15 fois (l'en-tête tient sur une ligne,
  les trois lignes entières dans une fenêtre visible au moins carrée).
- 04, **cartes empilées** (gold `stacked-cards`) : une colonne centrée (gouttière 48 px), deux
  cartes à la même largeur, 12 px d'écart : le brouillon d'e-mail en haut, entier (le sujet) ;
  la photo du face-à-face dessous, qui file par le bas sous les visages (le temps rendu au
  contact). Compact : gouttière 16 px.

Barres de titre entières (02, 03) : un bouton « ⋯ » à droite (toolbar du kit) tient la même
marge aux deux bouts.

## Mouvement (inchangé depuis r14, adapté aux cadres)

- 01 `upload` + `loading` : le CV se soulève (4 px), son fichier vole (Fly, 900 ms, taille de
  la ligne d'arrivée), la zone s'allume, son libellé sort avant l'arrivée, relais sur la ligne
  identique ; jauge ; rubriques : la barre part, les mots arrivent ; statut en `Roll`.
- 02 `choreography` + `loading` : niveau en `Roll`, indispensables ensemble (60 ms), souhaité,
  bonus en contour, passage source marqué à chaque point, ligne, puis point à clarifier.
- 03 `reorder` + `table-edit` : scores (Count et barre sur la même horloge), puis une ligne à
  la fois, soulevée et passant devant, l'autre lui fait place ; confiance en dernier.
- 04 `ai-chat` : squelette et « Rédaction du brouillon… » sortent, puis l'e-mail vouvoyé s'écrit.
- « Rejouer » et le lien direct : le contenu sort en fondu, l'ouverture revient en fondu, la
  scène joue. Poster = état final (rendu serveur, sans script, mouvement réduit). Opacité et
  transform ; exceptions du kit : `Roll` (largeur), jauge en `clip-path`, coche et ligne en
  `stroke-dashoffset`, teinte de la pastille. Hauteurs fixes en CSS (CLS 0) : 496/352,
  424/352, 440/344, 500/500 (large/compact).

## Gate

`film.mjs` de la copie du relecteur (il centre la scène : le héros fait 100vh), avec
`film-checks.mjs` qui reconnaît `@layer stageshow` (les 3 lignes `kit override` du relecteur
sont des faux positifs : CSS du kit regroupé par Next), 16 films : 4 scènes × 1440/390 ×
planche/`--states` :
`rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)`

Film, corrigé en r15 : `empty pane` (barre latérale de 01 remplie), `framing` (CV soulevé sans
mise à l'échelle ; fenêtre de 02 saignée par le bas et carrée ; satellites retirés en compact,
la gouttière unique ne tenait pas), `uneven inset` (barres entières : bouton « ⋯ »), `tight
inset` (carte de 04). Restent hors gate : `jump`/`appears` au départ (poster remplacé par
l'ouverture hors écran), `vanishes with no exit` du fichier qui vole (relais voulu),
`near-empty frames` (scores pas encore là en 03 ; temps vide voulu avant le premier mot en 04).

## Composition (teaching.md, Whole scenes), sur chaque still final

- 01 : l'œil va d'abord au CV clair puis à la fiche verte (cause puis résultat) ; une fenêtre
  mène, le papier est un satellite plus petit qui ne couvre que la barre latérale ; matériau
  clair sur sombre lisible ; rien de cassé sous la coupe (la barre latérale et le bas de la
  fiche sont du remplissage).
- 02 : la fiche mène (grande, derrière), le panneau est l'outil (petit, devant, sur la marge) ;
  la ligne relie une cause à un effet, une seule ; aucun mot coupé ; le panneau ne cache ni
  niveau, ni point, ni badge.
- 03 : une seule fenêtre, lue à 17 px ; le résultat (Camille en tête, confiance élevée) est ce
  que l'œil voit d'abord ; rien d'autre ne concurrence.
- 04 : l'e-mail (carte du haut, texte réel) mène ; la photo, plus calme sous son voile, donne
  le sens sans recouper de visage ; deux cartes, une largeur, un bord gauche.

## Non vérifié

Build de production ; Safari, Firefox, tactile ; revue « fresh eye » par un autre regard
(references/review.md) sur ces nouvelles compositions.
