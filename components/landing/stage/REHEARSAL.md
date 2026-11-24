# Rehearsal: visite de la landing (4 scènes)

Composants : `extract-stage.tsx` (01), `mission-stage.tsx` (02), `ranking-stage.tsx` (03),
`email-stage.tsx` (04), montés par `tour-stage.tsx` (bouton « Rejouer »), styles `stage.css`.
Kit copié dans `components/stageshow/kit/` ; seules les pièces utiles sont importées (`kit.ts`).

## Compositions (r17) : quatre layouts de `references/framing.md`, un par histoire

r17 corrige la relecture à froid r15 (`261112-27s-REVIEW-STAGESHOW-R15.md`). Avant/après dans
`.media/esneo/apercu/r17/` (`avant/` : images du relecteur ; `apres/` : nos stills et planches).

- Gouttière unique de la série au bureau : 24 px en haut (01, 02, 03, 04). Hauteurs fixes
  440 / 424 / 456 / 500 (bureau) et 368 / 372 / 356 / 496 (compact).
- Les documents (CV en 01, demande en 02) sont des **cartes sombres** de la matière de la fenêtre,
  un cran plus claires (`--ss-raised`), filet `--glass-line-strong`, ombre de satellite ; textes
  `ink` / `ink-2` / `muted` / `accent-text` (7:1 au moins), surlignage `--ss-accent-soft` (le
  texte dessus reste à 7:1). Plus de dalle `--color-sheet` grise.
- 01, **fenêtres qui se chevauchent** (gold `overlap`) : la fenêtre à 24 px en haut et à droite
  (son coin est gardé, plus de coupe nette au bord de la scène), dans une colonne de 120 px à
  gauche, qui file par le bas (scène ramenée à 440 : la fiche remplit la hauteur). Le CV à la
  gouttière, 220 px, ne couvre que la barre latérale, dont toutes les lignes sont sous lui (plus
  de carré ni de barre qui dépassent). Pendant le vol, la ligne du fichier du CV reste en fantôme
  (40 %). Compact (colonne ≤ 37,5rem) : la fenêtre pleine largeur, coins gardés, à 22 px du
  haut ; le CV réduit à sa **puce de fichier** (gold `corner-chip`) posée sur la barre de titre,
  chrome seul, à la gouttière en haut et à droite (titre de la barre effacé dessous) : le
  fichier en part et vole jusqu'à la zone. (Une puce à cheval sur le bord haut fait sortir le
  film en `framing` : un satellite garde la gouttière de la fenêtre, d'où la puce dans la barre.)
- 02, **panneau sur le produit** (gold `panel-annotation`) : inchangé au bureau, sauf le panneau
  descendu à 80 px (net sous le filet de la barre), le trait qui finit à 12 px de la pastille et
  part avec le point 4 (le passage s'allume, la ligne en sort pendant que le point entre), le
  surlignage qui ne mange plus la virgule. Compact (≤ 30rem) : la demande réduite à une **puce**
  posée sur la barre de titre, à la gouttière (« Demande du client » et son premier passage,
  « Java et Spring Boot », marqué avec le point 1) ; la fenêtre pleine largeur, coins gardés, qui
  file par le bas.
- 03, **gros plan** (gold `close-up`) : la fenêtre à 1,4 fois (1,2 en compact), à 24 px en haut
  et à gauche (12 en compact), coupée par la scène à droite dans sa marge vide et au pied à
  travers une quatrième ligne de remplissage : on lit un zoom, plus une fenêtre dans une boîte
  (en compact, la part visible reste plus large que haute).
  Sous la première place, la **citation du CV** (« Citation du CV » « Tech lead d'une squad de
  5 », verbatim du CV de 01) : elle entre avec la confiance, les lignes suivantes glissent pour lui
  faire place, sur une courbe plus lente (0,5 s). Colonnes nom 128 px puis barre : plus de vide au milieu des lignes ; le score du
  premier en 600.
- 04, **cartes empilées** (gold `stacked-cards`) : le brouillon devant et en haut, le plus grand ;
  la photo en bande basse plus courte que lui (172 px, 136 en compact), entière, cadrée sur les
  deux visages ; la mention « Photographie générée par IA, personnes fictives » passe sous l'image
  (aucun visage couvert). Rien ne file : pas de fondu sur cette scène.

## Mouvement

- 01 `upload` + `loading` : le CV se soulève, son fichier vole (Fly, 900 ms, taille de la ligne
  d'arrivée), la source en fantôme, la zone s'allume, relais sur la ligne identique ; jauge ;
  rubriques : la barre part, les mots arrivent ; statut en `Roll`.
- 02 `choreography` + `loading` : niveau en `Roll`, indispensables ensemble (60 ms), souhaité,
  puis bonus avec sa ligne, passage source marqué à chaque point, point à clarifier.
- 03 `reorder` + `table-edit` : scores (Count et barre sur la même horloge, tiret et chiffre en
  fondu croisé : la case n'est jamais vide), puis une ligne à la fois ; la ligne qui fait place
  part tout de suite et plus vite que la ligne soulevée (elles se croisent en un éclair, plus de
  ligne cachée 100 ms) ; confiance et citation en dernier.
- 04 `ai-chat` : squelette et « Rédaction du brouillon… » sortent, le premier mot entre pendant
  qu'ils finissent de sortir (plus de blanc de 200 ms), puis l'e-mail vouvoyé s'écrit.
- « Rejouer » et le lien direct : le contenu sort en fondu, l'ouverture revient en fondu, la
  scène joue. Poster = état final (rendu serveur, sans script, mouvement réduit). Opacité et
  transform ; exceptions du kit : `Roll` (largeur), jauge en `clip-path`, coche et ligne en
  `stroke-dashoffset`, teinte de la pastille.

## Gate (r17)

`film.mjs` de la copie du relecteur (il centre la scène : le héros fait 100vh), `--states
--gate`, 4 scènes × 1440/390 (planches et journaux dans `.media/esneo/apercu/r17/apres/`). Les
8 films finissent sur `rehearsal failed: 3 never-intentional line(s)` : ces 3 lignes sont
toujours les `kit override` (`.ss-avatar`, `.ss-check__fill`, `.ss-check[data-on]
.ss-check__fill`), fausses alertes (CSS du kit regroupé par Next avec celui de l'app). Aucune
autre ligne du gate. Couverture `inconclusive` (serveur de dev, écarts jusqu'à ~160 ms).

Lignes levées en cours de r17 : `uneven inset` de la barre de 01 (coin gardé : bouton « ⋯ »,
titre aligné à gauche comme en 02), `touching` (squelettes de 01 raccourcis), `framing` des puces
compactes (à la gouttière en haut et à droite), `uneven padding` de la puce de 02 (11 px partout),
`framing` de 03 compact (part visible plus haute que large : 356 px), `settle snap` de 03
(glissement de la citation sur 0,5 s). Restent hors gate (candidats) : `jump` de la pastille
qui roule en 01 et des lignes qui se croisent en 03 (~4 px en une image, le `scale` de la ligne
soulevée), `vanishes with no exit` du fichier qui vole (relais voulu), `appears` du compteur et
`near-empty frames` à l'ouverture en 03 (fondu du premier coup d'œil ; un rechargement de la page
par l'autre agent a aussi fait rejouer 03 en plein film à 1440).

## Composition (teaching.md, Whole scenes), sur chaque still final

- 01 : la fiche mène, le CV (carte sombre plus claire que la fenêtre) est la cause, plus petit,
  sur la barre latérale seule ; la fenêtre garde son coin à droite, rien d'utile sous la coupe.
- 02 : la fiche mène (grande, derrière), le panneau est l'outil (petit, devant, sur la marge) ;
  la ligne relie une cause à un effet, une seule ; aucun mot coupé.
- 03 : un zoom (coupe à droite et au pied) ; le résultat (Camille en tête, confiance élevée, sa
  citation du CV) est ce que l'œil voit d'abord.
- 04 : l'e-mail mène (en haut, le plus grand) ; la photo, plus courte, donne le sens ; la mention
  IA sous l'image.

## Non vérifié

Build de production ; Safari, Firefox, tactile ; largeurs intermédiaires (768, 1024) ; revue
« fresh eye » sur r17. Finitions restantes : le relais du fichier qui vole en 01 (a-M1), la
pastille d'ouverture mi-roulée (a-M3), le bouton « ⋯ » qui dépasse de quelques pixels à droite
des puces compactes (01, 02), le saut de ~4 px des lignes qui se croisent en 03.
