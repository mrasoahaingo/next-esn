# Relecture à froid stageshow : visite animée, r15

Relecteur : agent « fresh eye ». Lu : `review.md`, `verify.md`, `framing.md`, `teaching.md`, `rehearse.md`, `film.mjs --help` et les golds. Je n'ai lu ni `REHEARSAL.md`, ni la relecture précédente, ni le code des scènes (le code a servi seulement à trouver des sélecteurs ; j'ai mesuré la géométrie dans le DOM et les couleurs sur les pixels).

Toutes les images sont dans `/private/tmp/claude-973987895/-Users-mrasoahaingo-Projects-perso-next-esn/79766482-e947-4a07-a01e-1fc729896708/scratchpad/review-r15/`, abrégé **`R/`** ci-dessous (chemin complet = ce dossier + le nom).

---

## Résultat des gates

| Film | Ligne finale | Lecture |
|---|---|---|
| `--states --gate`, 1440, a, b, c, d (`R/a-1440-states.png` … `R/d-1440-states.png`) | `rehearsal failed: 3 never-intentional line(s)` | Les trois lignes sont les mêmes partout : `kit override` sur `.ss-avatar`, `.ss-check__fill`, `.ss-check[data-on] .ss-check__fill` |
| `--states --gate`, 390, refilmé (`R/a-390-states2.png` … `R/d-390-states2.png`) | idem, 3 lignes | idem |
| Boucle `--gate`, 1440, 24 vues à 500 ms (`R/a-1440-gate.png` … `R/d-1440-gate.png`) | idem | idem |

**Le `kit override` est une fausse alerte.** Les règles signalées sont celles du kit lui-même (`kit/parts/Avatar.css`, `kit/parts/Check.css`), servies par Next dans le même fichier que la CSS de l'app (`_962a6587._.css`, extrait dans `R/css/`). La seule règle de l'app qui touche ces pièces est `.esr-row .ss-avatar__initial { color }` : une couleur, pas une géométrie. Sur l'image, les avatars sont des disques ronds avec l'initiale centrée, les coches sont celles du kit (`R/end/c-1440-end-shot.png`, `R/zoom/a-1440-right-edge.png`). **En lisant les lignes, il reste donc 0 ligne « jamais intentionnelle » réelle**, mais aucun film ne finit `rehearsal passed`.

**La couverture est `inconclusive` partout** : écarts d'échantillonnage au-delà de 27 ms (jusqu'à environ 200 ms) sur un serveur de dev. L'outil n'a donc pas jugé le mouvement entre deux échantillons. Je l'ai regardé moi-même aux beats listés plus bas.

Candidats (pas bloquants pour la gate) que j'ai vérifiés à l'image : a `vanishes with no exit: div.ss-fly` (confirmé, voir a-M1) ; a `jump: ss-badge width -9.7px` (pas capturé image par image, voir « Non vérifié ») ; c `appears with no entrance: ss-count` (confirmé, voir c-M2) ; c et d `near-empty frames` (c : fausse alerte due aux rouleaux de chiffres, les vues sont pleines ; d : réel mais bref, voir d-M1) ; c `jump: span "0".."9"` (rouleaux du compteur pendant le comptage, aucun saut visible sur `R/beats/c-1440-score-r1.png`).

**Le premier passage à 390 a été perturbé** (`R/a-390-states.png`, `R/d-390-states.png`) : toutes les scènes se vident et rejouent en plein film (fenêtre vide à « read +0.7s » pour a, carte vide à « done +0.7s » pour d). Les quatre films tournaient en même temps et ont été touchés au même moment : c'est un rechargement de la page (le héros était en cours de travail). Refilmé seul (`*-390-states2.png`), le défaut disparaît. Une sonde sur la page en direct confirme qu'une scène jouée garde son état final quand on la quitte puis qu'on y revient.

---

## Les plus graves, toutes scènes confondues

1. **c : le gros plan n'en est pas un, et il ne montre pas ce que dit la page.** La fenêtre est entière en largeur, avec 18 px de marge égale sur trois côtés. Son pied, vide, se fond au bord : rien n'est coupé, on lit donc une fenêtre posée dans une boîte, pas un zoom. Et la liste n'a rien d'Esneo (la « citation du CV derrière chaque point » annoncée dans le texte n'y est pas). `R/end/c-1440-end-shot.png` à côté de `R/gold/close-up-still.png`.
2. **a et b : le satellite est une dalle grise intermédiaire** (#83868c, L\* 56) sur une page presque noire. C'est la masse la plus claire de l'image, et elle se lit comme un élément désactivé. Le texte y tombe à 4,5:1, 3,8:1 pour le bleu, 3,3:1 sur les surlignages. `R/zoom/a-1440-paper.png`, `R/zoom/b-1440-highlights.png`.
3. **a (1440 et 390) et b (390) : la fenêtre « en fuite » est tranchée par le bord invisible de la scène.** On voit une coupe verticale nette, sans coin ni bordure, avec encore 113 px de page à droite (1440) ou 16 px (390). `R/end/a-1440x900-viewport.png`, `R/end/ab-390-right-cut.png`.
4. **d : la photo écrase le brouillon** et le bandeau « Photographie générée par IA » barre le front de l'homme. `R/end/d-1440-end-shot.png`, `R/zoom/d-1440-photo-label.png`.
5. **À 390, a et b perdent leur satellite, donc leur histoire** : le fichier surgit sur la zone de dépôt sans venir de nulle part, et la demande du client disparaît. `R/beats/a-390-grab-r1.png`, `R/end/all-390-end.png`.

---

## Scène a : CV papier devant la fiche consultant (gold `overlap`, mouvement `upload`)

### Composition
- **La composition répond au produit** : un CV posé devant la fiche « Nouvelle fiche » qui se remplit rubrique par rubrique, c'est bien le cœur d'Esneo. Le layout du gold tient : le satellite chevauche le bord gauche de la fenêtre au-dessus de la barre latérale (44 % dehors), la fenêtre fuit à droite, la gouttière est unique (24 px en haut et à gauche). **La seule différence avec le gold** : dans le gold, la carte avant est de la même matière que la fenêtre (blanche sur blanc, séparée par l'ombre), et la liste du tableau de bord court jusqu'en bas. Ici, la carte est une dalle grise sur fond noir, et le tiers bas de la fenêtre est vide. Images : `R/end/a-1440-end-shot.png` à côté de `R/gold/overlap-still.png`.

### Cadrage
- **a-F1. Fenêtre tranchée au bord droit.** À capturer : le bord droit de la fenêtre dans la page. À 1440, la fenêtre « fuit » de 40 px, mais la scène s'arrête à 1327 px et la page continue, sombre, sur 113 px. On voit donc une barre de titre coupée net en pleine page (`R/end/a-1440x900-viewport.png`). À 390, même chose 16 px avant le bord de l'écran, et la fenêtre colle au haut et à la gauche de la scène (géométrie : L0 T0 R-32) (`R/end/ab-390-right-cut.png`, image de gauche). Correctif : faire aller la scène jusqu'au bord du viewport à droite pour que la fuite soit réelle, ou garder la fenêtre entière, coin droit compris, à une gouttière.
- **a-F2. Tiers bas vide, coin bas gauche mort.** À capturer : la vue finale entière. La liste s'arrête 103 px au-dessus du bas de la scène, la barre latérale est vide sous le CV, et le coin bas gauche (environ 120 × 170 px) n'a rien (`R/end/a-1440-end-shot.png`). Correctif : prolonger la fiche (une rubrique de plus ou le détail d'une expérience qui sort par le bas), ou réduire la hauteur de scène pour que la fiche fuie.
- **a-F3. À 390, le CV disparaît (compact) et l'action perd sa source.** À capturer : le beat `grab` à 390. La puce du fichier est déjà sur la zone de dépôt, grossit un peu puis se pose : elle ne vient de nulle part (`R/beats/a-390-grab-r1.png`, `R/a-390-states2.png`). Correctif : empiler une bande du CV recadrée au-dessus de la fenêtre plutôt que la retirer.

### Hiérarchie et densité
- **a-H1. Le CV gris prend l'œil et se lit « désactivé ».** À capturer : le CV à 4x. Fond #83868c, sous-titre à 4,5:1, « Expériences » en bleu à 3,8:1 (`R/zoom/a-1440-paper.png`). Sur la vue finale, la masse la plus claire est le CV, pas la fiche remplie avec ses coches vertes (`R/end/a-1440-end-shot.png`). Correctif : un vrai papier clair (blanc cassé, texte encre) sous l'ombre satellite, ou la même surface sombre que la fenêtre avec un filet.
- Densité de la fiche : de vrais mots sur les cinq rubriques, des lignes au bon pas. Rien à redire.

### Mouvement
- **a-M1. Passage de relais à l'arrivée : la puce disparaît d'un coup et le nom saute.** À capturer : les vues 1,0 s puis 1,1 s après `grab`. La puce sombre en vol disparaît en une image (ligne `vanishes with no exit: div.ss-fly`), et l'icône et le nom de la zone apparaissent environ 10 px plus à droite et 2 à 3 px plus haut (`R/beats/a-1440-grab-land.png`, dernière vue, comparée à `R/beats/a-1440-grab-land2.png`, première vue). Correctif : poser le `Fly` sur le rect mesuré de la ligne fichier de la zone et faire un fondu enchaîné.
- **a-M2. La source ne s'éteint pas pendant le glisser.** À capturer : la vue 0,5 s. La ligne « CV_Camille_Durand.pdf » du CV est redessinée pleine pendant que sa copie vole (`R/beats/a-1440-grab-row1.png`). Dans le gold `upload`, l'icône source reste en fantôme pendant le vol (`R/gold/upload-sheet.png`, de 1,2 à 2,0 s). Correctif : passer la ligne du CV à environ 40 % pendant le vol et la rétablir au dépôt.
- **a-M3. La pastille d'état est mi-roulée sur la vue d'ouverture.** À capturer : la vue `open`. On lit « En attente du… » avec « CV » encore en roulement (`R/a-1440-states.png` vue `open`, `R/zoom/a-badge-open.png` à 0,00 s). Le film signale aussi `jump: ss-badge width -9.7px`. Correctif : ouvrir sur la pastille posée, le roulement étant réservé aux changements d'état.
- Le reste se tient : la zone s'allume au survol, la barre de progression, les rubriques qui se remplissent une à une avec leur spinner puis leur coche, la pastille qui passe à « Fiche prête à relire » (`R/a-1440-states.png`).

### Finition
- **a-P1. Débris dans la barre latérale.** À capturer : le haut du CV à 4x. Un carré sombre de 22 px dépasse au-dessus du CV et une barre de 74 × 8 px en dessous (`R/zoom/a-1440-sidebar-top.png`, `R/zoom/a-1440-paper.png`). Avec rien d'autre dans la barre, ils se lisent comme des restes. Correctif : les retirer, ou donner à la barre latérale de vrais éléments qui dépassent du CV.

---

## Scène b : fiche de poste et demande du client en panneau (gold `panel-annotation`, mouvement `choreography`)

### Composition
- **La composition répond au produit** : la demande du client est à droite, des passages y sont surlignés, et la fiche en tire des points classés par importance, plus une ligne « À clarifier ». C'est propre à Esneo. Le layout du gold tient : le panneau chevauche le bord droit de la fenêtre sur sa marge vide, jamais sur la liste, et un seul trait de rappel passe par du vide. **La seule différence avec le gold** : son panneau est de la même matière blanche que le produit et plus grand (environ 37 % de la largeur) ; le nôtre est une dalle grise plus petite (184 px sur 560, 33 %). Images : `R/end/b-1440-end-shot.png` à côté de `R/gold/panel-annotation-still.png`.

### Cadrage
- **b-F1. À 390, la scène perd son sujet.** À capturer : la vue finale à 390. Le panneau, les surlignages et le trait disparaissent, il ne reste qu'une liste qui se remplit. La légende « Tiré du texte de la demande » renvoie alors à un texte absent (`R/end/all-390-end.png`, deuxième image). Correctif : empiler une bande de la demande, recadrée, au-dessus de la fenêtre, avec un passage surligné.
- **b-F2. À 390, fenêtre tranchée au bord droit**, comme a-F1 (géométrie L0 T0 R-32) (`R/end/ab-390-right-cut.png`, image de droite). Correctif : comme a-F1.
- À 1440, la gouttière est juste : 24 px à gauche, en haut et à droite du panneau, et la fenêtre sort de 60 px par le bas avec un fondu.
- Coin bas droit vide sous le panneau (environ 136 × 190 px) (`R/end/b-1440-end-shot.png`). Le gold a le même : je le note sans le pousser.

### Hiérarchie et densité
- **b-H1. Même dalle grise qu'en a.** Fond #83868c ; texte surligné à 3,3:1 sur le surlignage ardoise #666f83 (`R/zoom/b-1440-highlights.png`). Les passages marqués se lisent comme une sélection de texte terne, pas comme un marquage. Correctif : comme a-H1, avec un surlignage qui garde au moins 4,5:1.
- Environ 55 px de vide sous « Télétravail : non précisé » avant le fondu (`R/end/b-1440-end-shot.png`) : mineur.

### Mouvement
- Les paires passage et point marchent : « Java et Spring Boot » et « encadrer une équipe » s'allument quand les lignes 1 et 2 se remplissent, puis 3 et 4 (`R/beats/b-1440-points-r1.png`).
- **b-M1. Le trait arrive après coup.** À capturer : le beat `link` de 0,1 à 1,0 s. Il part de « culture assurance » et descend vers la ligne 4 près d'une seconde après que cette ligne est apparue, ce qui en fait une décoration plutôt qu'une cause (`R/beats/b-1440-link.png`). Correctif : tracer le trait pendant que la ligne 4 entre, en partant du passage qui s'allume.
- Le roulement de « Analyse en cours » vers « Senior, 8 ans et plus » laisse « cours » décroché sur la vue d'ouverture (`R/b-1440-states.png`, vues `open` et `level`) : même remarque qu'a-M3, en moins visible.

### Finition
- **b-P1. Quasi-tangence : le haut du panneau passe 2 px sous le filet de la barre de titre** (panneau T64, corps de la fenêtre T62) (`R/zoom/b-1440-panel-top.png`). Correctif : descendre le panneau d'au moins 12 px, ou le monter franchement sur la barre de titre.
- **b-P2. Le point d'arrivée du trait est à 4,5 px de la pastille « Bonus »** (`R/zoom/b-1440-leader-dot.png`). Correctif : finir le trait à 8 px de la pastille.
- **b-P3. Le surlignage de « Java et Spring Boot, » englobe la virgule** (`R/zoom/b-1440-highlights.png`). Correctif : arrêter le surlignage avant la ponctuation.

---

## Scène c : gros plan sur trois profils positionnés (gold `close-up`, mouvement `reorder`)

### Composition
- **c-C1. La composition ne répond ni au gold ni au produit.** À capturer : la vue finale à côté du gold. Le gold agrandit une fenêtre qui sort par le bas en coupant une ligne : on sent le zoom (`R/gold/close-up-still.png`). Ici, la fenêtre fait 719 px sur une scène de 755, avec 18 px de marge à gauche, en haut et à droite. Sous Hugo, son pied est un corps vide de 27 px qui se fond au bord. Rien n'est coupé : on lit une fenêtre entière dans une boîte (`R/end/c-1440-end-shot.png`, `R/end/c-1440x900-viewport.png`). Côté produit, ce qu'on voit est un classement générique (nom, barre, nombre) que n'importe quel outil de scoring pourrait montrer. La page promet « la citation du CV derrière chaque point » et la légende « chaque point renvoie au CV », mais rien dans l'image ne le montre. Correctif : agrandir à environ 1,4x avec une 4e ligne coupée par le bas, et mettre sous le premier profil une ligne de citation du CV (le point clé suivi de l'extrait) à la place du vide central.

### Cadrage
- **c-F1. À 390, la liste s'arrête à 55 px du bord droit de la fenêtre.** La ligne surlignée de Camille finit loin du bord droit, alors qu'elle commence à 18 px du gauche (liste L30, R67 ; fenêtre L12, R12). Le score flotte au milieu d'une colonne vide (`R/end/c-390-end-shot.png`). Correctif : étirer la liste et la ligne surlignée à la largeur de la fenêtre, score calé à droite.
- **c-F2. À 390, il y a environ 70 px de corps vide sous Hugo avant le fondu** (`R/end/c-390-end-shot.png`). Correctif : comme c-C1, une ligne de plus coupée par le bas.

### Hiérarchie et densité
- **c-H1. Un vide d'environ 210 px coupe chaque ligne entre le nom et la barre** à 1440 (`R/end/c-1440-end-shot.png`). Correctif : y loger la citation du CV (voir c-C1), ou rapprocher barre et score des noms.
- Le premier se lit bien (fond plus clair, avatar bleu, pastille verte « Confiance élevée »). Les scores sont tous en graisse normale : faire porter un peu plus de poids au « 84 » serait juste, mais c'est secondaire.

### Mouvement
- **c-M1. Au croisement, une ligne disparaît entièrement.** À capturer : le beat `rank` ralenti 3x, vue 0,42 s, puis la seconde permutation à 0,38 s. Les deux lignes passent à la même hauteur, la ligne levée recouvre tout à fait l'autre, et pendant environ 100 ms la liste n'a plus que deux lignes, avec un trou (`R/beats/c-1440-rank-slow.png`, `R/beats/c-1440-rank-slow2.png`). Dans le gold `reorder`, les voisins glissent pour faire place à la ligne levée (`R/gold/reorder-sheet.png`, de 1,2 à 1,6 s). Correctif : faire glisser la ligne passive en premier, ou la décaler, pour qu'elle ne soit jamais masquée à 100 %.
- **c-M2. Le « – » s'efface avant que le score n'apparaisse.** À 0,0 s, la case de Hugo est vide pendant que sa barre pousse (`R/beats/c-1440-score-r1.png`, ligne `appears with no entrance: ss-count`). Correctif : faire rouler le chiffre depuis le tiret, sans case vide.
- Les nombres montent dans le bon sens et ne se posent qu'une fois (68 puis 69, 84 posé) (`R/beats/c-1440-score-r1.png`). « Rejouer » revient à l'état initial et rejoue en entier, le focus reste sur le bouton (testé).

### Finition
- Rien de plus que c-F1. Avatars et initiales du kit, intacts à l'image (le `kit override` est faux, voir les gates).

---

## Scène d : brouillon d'e-mail au-dessus d'une photo de face-à-face (gold `stacked-cards`, mouvement `ai-chat`)

### Composition
- **d-C1. Le layout tient, l'histoire non.** Le brouillon et la photo ont la même largeur et le même bord gauche, 12 px d'écart, centrés, et la photo sort par le bas en fondu : la géométrie du gold est respectée. **La seule différence avec le gold** : dans `stacked-cards`, la carte du bas est le détail que pilote celle du haut (une offre au-dessus de son usage). Ici, la carte du bas est une photo d'illustration qui ne dit rien d'Esneo et occupe 45 % de la scène. Le titre de l'étape, « CV adapté et e-mails, prêts à relire », n'a pas d'image : le « dossier de compétences à la charte » n'apparaît nulle part (`R/end/d-1440-end-shot.png` à côté de `R/gold/stacked-cards-still.png`, contexte dans `R/end/bcd-1440-viewport.png`). Correctif : mettre sous le brouillon la première page du dossier à la charte, recadrée. Si la photo est imposée par le brief, la ramener à une bande basse plus courte que le brouillon.

### Cadrage
- La gouttière est de 48 px, alors que les trois autres scènes sont à 24, 24 et 18 : la carte en paraît plus petite que sa place (géométrie : stack L48 T48 R48). Correctif : une seule gouttière pour les quatre scènes.

### Hiérarchie et densité
- **d-H1. La photo est l'élément le plus lourd.** Visages, couleur et surface l'emportent sur le brouillon, qui est l'histoire (une IA qui écrit en vouvoyant) : l'œil va aux visages, pas au texte (`R/end/d-1440-end-shot.png`). Correctif : voir d-C1. À défaut, assombrir et réduire la photo pour que le brouillon reste la masse principale.
- **d-H2. Le bandeau « Photographie générée par IA, personnes fictives » barre le front de l'homme, juste au-dessus des yeux** (`R/zoom/d-1440-photo-label.png`). Correctif : le placer dans le coin bas gauche, sur le fondu, hors des visages.

### Mouvement
- **d-M1. Un blanc d'environ 200 ms entre « Rédaction du brouillon… » et le premier mot.** Le squelette s'efface entièrement avant que « Bonjour » n'apparaisse (`R/beats/d-1440-clear-r1.png`, de 0,0 à 0,3 s ; ligne `near-empty frames`). Le gold `ai-chat` marque une pause comparable après « Thinking » (`R/gold/ai-chat-sheet.png`, 3,6 s). Mineur. Correctif : faire entrer « Bonjour » pendant que le squelette sort.
- Le flux mot par mot en fondu, puis l'arrivée de la pastille « Brouillon à relire » : conformes au gold (`R/d-1440-states.png`).

### Finition
- Rien de plus que d-H2. À 390, le bandeau tombe sur la façade, pas sur un visage (`R/end/all-390-end.png`).

---

## La série sur la page

- Quatre gouttières différentes (24, 24, 18, 48), quatre largeurs de scène (657, 560, 755, 657), et deux conventions de barre de titre : titre centré en a, à gauche en b et c, pas de fenêtre en d (`R/end/a-1440-end-shot.png` … `R/end/d-1440-end-shot.png`, `R/end/bcd-1440-viewport.png`). Correctif : une gouttière, une convention de chrome et des hauteurs de scène proches pour la série.
- Posters en mouvement réduit : les quatre montrent l'état final complet, ce qui est juste (`R/beats/reduced-1440-all.png`).

---

## Ce que je n'ai pas pu vérifier

- **Un `rehearsal passed`** : il est impossible sans faire taire la fausse alerte `kit override`. Ma lecture donne 0 ligne réelle, mais aucun film ne le dit.
- **Couverture complète** : tous les films sont `inconclusive` (écarts jusqu'à environ 200 ms) sur le serveur de dev. Je n'ai pas lancé de build de production, comme demandé.
- **Le saut de largeur de la pastille en a** (`-9.7px` en une image) : la capture zoomée ne prend qu'une vue toutes les 0,3 s environ (`R/zoom/a-badge-ready.png`, `R/zoom/a-badge-open.png`). Je n'ai pas vu l'image fautive.
- **La ligne `some layout geometry was still moving at the final shot`** (a, b) : mesuré au repos après 12 s, rien ne bouge et aucune animation ne tourne. Je n'ai pas identifié ce qui bougeait à la dernière vue du film.
- **La cause du rejeu en plein film au premier passage à 390** : je l'attribue à un rechargement de la page, sans pouvoir le prouver. Le second passage est propre.
- **Non filmés** : les largeurs intermédiaires (768, 1024), le tactile ou un appareil réel, Safari et Firefox, la bascule du mouvement réduit pendant la lecture (seulement des posters fixes), le rythme réel en rAF, et le retour depuis un onglet masqué.
- **Les golds à 390** n'ont pas de design compact (ils se tassent et sont signalés par le film) : la comparaison à 390 se fait donc sans référence.

## Images regardées

États : `R/{a,b,c,d}-1440-states.png`, `R/{a,b,c,d}-390-states.png` (passage perturbé), `R/{a,b,c,d}-390-states2.png`. Boucles : `R/{a,b,c,d}-1440-gate.png`. Fin : `R/end/*-1440-end-shot.png`, `R/end/*-390-end-shot.png`, `R/end/*-1440x900-viewport.png`, `R/end/all-390-viewport.png`, `R/end/ab-390-right-cut.png`. Beats : `R/beats/a-1440-grab*.png`, `R/beats/a-1440-land-slow.png`, `R/beats/a-390-grab-r1.png`, `R/beats/b-1440-points-r1.png`, `R/beats/b-1440-link.png`, `R/beats/c-1440-score-r1.png`, `R/beats/c-1440-rank.png`, `R/beats/c-1440-rank-slow.png`, `R/beats/c-1440-rank-slow2.png`, `R/beats/d-1440-clear-r1.png`, `R/beats/reduced-1440-all.png`. Zooms 4x : `R/zoom/*`. Golds : `R/gold/*-still.png`, `R/gold/{upload,reorder,ai-chat,choreography}-sheet.png`.
