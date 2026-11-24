# Relecture à froid : scènes stageshow de « Fonctionnement »

Relecteur : agent neuf, sans le plan ni le REHEARSAL.md du constructeur. Tout constat ci-dessous renvoie à une image filmée. Aucun fichier du projet n'a été modifié en dehors de celui-ci.

- Page filmée : http://localhost:3217/ (serveur Next de dev), `.eg-shot--<a|b|c|d> .ss-fit`, à 1440 et 390.
- Outil : copie du skill dans le scratchpad, `scripts/film.mjs` de cette copie.
- Dossier des images (toutes les images citées sont dedans) :
  `/private/tmp/claude-973987895/-Users-mrasoahaingo-Projects-perso-next-esn/79766482-e947-4a07-a01e-1fc729896708/scratchpad/review/`
  Dans la suite, `R/` désigne ce dossier (exemple : `R/shots/c-states-1440.png` =
  `/private/tmp/claude-973987895/-Users-mrasoahaingo-Projects-perso-next-esn/79766482-e947-4a07-a01e-1fc729896708/scratchpad/review/shots/c-states-1440.png`).
- Golds filmés depuis la copie du skill (`npm install` puis `npm run dev`, tout s'est bien passé) : `R/gold/{upload,loading,choreography,reorder,ai-chat}-states.png` et `-sheet.png`.

## Gate (`film.mjs --gate`)

| Scène | 1440 | 390 | `--states` 1440 | `--states` 390 |
|---|---|---|---|---|
| a | failed, 3 lignes | failed, 3 | failed, 3 | failed, 3 |
| b | failed, 3 | failed, 3 | failed, 3 | failed, 3 |
| c | failed, 3 | failed, 3 | failed, 3 | failed, 3 |
| d | failed, 3 | failed, 3 | failed, 3 | failed, 3 |

Les 16 passages échouent sur **les mêmes trois lignes**, et seulement sur elles : `kit override: .ss-avatar`, `.ss-check__fill`, `.ss-check[data-on] .ss-check__fill`. Ces lignes sont des faux positifs, vérifiés comme suit :
- elles sortent aussi sur b et d, qui n'ont ni avatar ni coche. Le détecteur parcourt toutes les feuilles CSS de la page ;
- les règles visées sont celles du kit lui-même (`kit/parts/Check.css`, imbriquée, et Avatar), que Next a regroupées dans `/_next/static/chunks/_1d538a42._.css`. Le détecteur n'ignore que les chemins contenant `/kit/` ou `/playground/`. La seule règle de l'app qui touche une pièce du kit est `.esr-row .ss-avatar__initial { color }`, qui ne change que la couleur ;
- à l'image, la géométrie du kit est intacte : `R/polish/a-checks.png` (coches au zoom 4x) et `R/polish/c-avatars.png`.

Le gate est donc vert sur le fond, mais il reste formellement en échec. Tous les films sont aussi `inconclusive` en couverture (écarts d'échantillonnage du serveur de dev). Les golds le sont également sur cette machine.

Lignes hors gate, jugées sur image :
- c, `near-empty frames` vers 0,6 s pendant 1,4 s : écarté. Les images de 0,4 à 2,0 s de `R/shots/c-1440.png` montrent un contenu complet ; le compteur vient des bandes de chiffres de `Count`.
- a, `half-pixel glyph` sur l'icône de dépôt : rien de visible dans `R/zoom/a-file-drop.png` (ralenti x5). Non retenu.
- b-390, c-states-390, d-states-1440, `vanishes with no exit` ou `appears with no entrance` au tout début : ces lignes viennent du remplacement de l'état final rendu côté serveur par l'ouverture, pendant que la scène est hors écran. Voir « Non vérifié ».

Note d'outillage : `film.mjs` tel quel plante sur cette page (`Clipped area is either empty or outside the resulting image`). Le héros fait 100vh, donc agrandir le viewport repousse la scène sans fin, et `scroll-behavior: smooth` aggrave le problème. Dans ma copie seulement, j'ai patché le script pour centrer la scène dans un viewport de 900 px avec un défilement instantané. Le constructeur en aura besoin s'il refilme.

---

## Constat transversal (cadrage, au-dessus des quatre listes)

**Une seule mise en page, répétée quatre fois, avec un satellite qui ne joue pas.** Chaque figure montre la même fenêtre macOS sombre, alignée à gauche sur la colonne, qui dépasse de 40 px à droite (mesuré : `win.right = fit.right + 40` dans les quatre cas, aux deux largeurs) et se fond en bas. Au-dessus, en a, b et d, un objet gris incliné est décalé vers la droite et laisse le coin haut gauche vide. En a et b, ce satellite est justement l'entrée de l'histoire (le CV, l'e-mail du client). Or il ne bouge à aucune image et rien ne le relie à la fenêtre.
- Images : `R/host/a-fig-1440.png`, `R/host/b-fig-1440.png`, `R/host/d-fig-1440.png` (6 images de 0 à 7,5 s, satellite identique), `R/host/c-fig-1440.png` (sans satellite).
- Correctif : soit le satellite devient l'acteur du premier temps (il part vers la fenêtre et devient la ligne fichier, ou la phrase source s'allume), soit on le retire et on donne sa hauteur à la fenêtre.

---

## Scène a — CV déposé, fiche remplie (gold : `upload`, `loading`)

Images regardées : `R/shots/a-1440.png`, `R/shots/a-390.png`, `R/shots/a-states-1440.png`, `R/shots/a-states-390.png`, `R/host/a-fig-1440.png`, `R/host/a-sheet-zoom.png`, `R/zoom/a-file-drop.png`, `R/zoom/a-read-rows.png`, `R/zoom/a-ready-chip.png`, `R/polish/a-end-full.png`, `R/polish/a-head.png`, `R/polish/a-checks.png`, `R/scrollin/a-1440-step03.png`, `R/scrollin/a-1440-step04.png`, `R/reduced/a-1440.png`.

**Cadrage**
1. Le CV dont parle l'histoire est une plaque grise inclinée au-dessus de la fenêtre. C'est la zone la plus claire de la figure, elle attire l'œil avant l'interface, et elle reste immobile pendant que le « dépôt » se fait sans elle. → `R/host/a-sheet-zoom.png`, `R/host/a-fig-1440.png`. Correctif : la feuille vole jusqu'à la zone de dépôt (Fly) et devient la ligne `CV_Camille_Durand.pdf`, ou on la retire.

**Hiérarchie et densité**
- Rien. La fiche finale a de vrais mots partout et la coche verte porte le statut (`R/polish/a-end-full.png`).

**Mouvement**
2. Le dépôt est un fondu enchaîné de deux textes au même endroit : « Déposez un CV, PDF ou Word » et « CV_Camille_Durand.pdf » se lisent l'un sur l'autre pendant environ 4 images, et « 412 Ko » apparaît en fantôme dans la zone pointillée dès 0,00 s. → `R/zoom/a-file-drop.png` (0,04 à 0,16 s), `R/shots/a-states-390.png` (case « file »), `R/scrollin/a-1440-step04.png`. Correctif : la zone prend sa nouvelle taille, la ligne fichier arrive comme un objet (Fly depuis la feuille ou Collapse reveal), et le bord pointillé s'efface sur son propre calque.
3. Le changement de statut « Lecture en cours » vers « Fiche prête à relire » se fait par deux pastilles floutées en fondu : entre 0,04 et 0,12 s, l'emplacement est presque vide et la pastille ne change pas de forme. → `R/zoom/a-ready-chip.png`. Correctif : une seule pastille dont la largeur et la teinte se transforment, avec `Roll` sur le libellé.
4. Les valeurs apparaissent en fondu par-dessus leur barre de squelette : la barre se voit à travers les mots (0,00 à 0,08 s, puis 0,44 à 0,52 s). → `R/zoom/a-read-rows.png`. Correctif : la barre s'efface avant ou pendant l'arrivée du mot, sans qu'ils se superposent (dans `loading`, le texte entrant est flou et la barre part d'abord).
5. Le premier temps, celui qui cause tout le reste, démarre quand environ 40 % de la scène est à l'écran : le fichier arrive alors que les 60 % du bas sont encore hors écran. → `R/scrollin/a-1440-step04.png` (marque `file` à 40 % visible). Correctif : déclencher vers 60 à 70 % de visibilité, ou tenir l'ouverture environ 400 ms.

**Finition**
- Rien. Coches, icône fichier et pastilles sont nettes au zoom 3x et 4x (`R/polish/a-checks.png`, `R/polish/a-head.png`).

**Différence principale avec le gold `upload`** : dans le gold, le PDF est un objet hors de la fenêtre qui y entre, et la ligne naît là où il atterrit. Ici, le fichier apparaît par fondu à l'intérieur de la zone de dépôt, et le CV posé au-dessus ne bouge pas. Côté `loading`, le remplissage rubrique par rubrique avec indicateur rotatif puis coche tient la comparaison.

---

## Scène b — fiche de poste, points clés classés (gold : `choreography`)

Images regardées : `R/shots/b-1440.png`, `R/shots/b-390.png`, `R/shots/b-states-1440.png`, `R/shots/b-states-390.png`, `R/host/b-fig-1440.png`, `R/zoom/b-level-niveau.png`, `R/zoom/b-points-points.png`, `R/polish/b-end-full.png`, `R/polish/b-clarify.png`, `R/reduced/b-1440.png`.

**Cadrage**
1. L'e-mail du client posé au-dessus (« Objet : Tech lead Java H/F… ») est immobile : la légende « Tiré du texte de la demande » n'a aucun lien visible avec lui. → `R/host/b-fig-1440.png`. Correctif : allumer dans l'e-mail la phrase d'où sort chaque point au moment où il arrive, ou retirer la feuille.

**Hiérarchie et densité**
2. Pendant la majeure partie de l'animation, le tiers bas de la fenêtre est vide : à l'ouverture, il n'y a que 4 lignes, et le vide reste jusqu'à l'arrivée de « À clarifier », vers 6 s. → `R/shots/b-states-1440.png` (cases open, level, points, points +0,7 s), `R/shots/b-states-390.png` (open). Correctif : faire entrer le bloc « À clarifier » en poussant la fenêtre (Collapse), ou réserver moins de hauteur au départ.
3. Les pastilles « Souhaité » et « Bonus » ont le même gris : deux niveaux d'importance s'affichent avec un seul style. → `R/polish/b-end-full.png`. Correctif : un style plus discret pour le niveau 3 (contour ou texte seul).

**Mouvement**
4. « Niveau attendu » : « Analyse en cours » et « Senior, 8 ans et plus » se superposent au même endroit pendant environ 3 images (deux spans en fondu, décalés verticalement), ce qui donne un texte brouillé. → `R/zoom/b-level-niveau.png` (0,00 à 0,12 s), `R/shots/b-states-1440.png` et `R/shots/b-states-390.png` (case « level »). Correctif : `Roll` sur la valeur.
5. Tout bouge de la même façon : chaque point fait un fondu dans sa case de squelette, puis son badge fait un fondu, à intervalles réguliers, et rien ne se déplace. Le classement par importance n'est porté que par la couleur des badges. → `R/zoom/b-points-points.png`, `R/shots/b-1440.png`. Correctif : hiérarchiser l'entrée (les deux « Indispensable » ensemble et plus marqués, chevauchement de 60 ms), puis faire entrer le bloc « À clarifier » en déplaçant ce qui est dessous.

**Finition**
- Rien (`R/polish/b-end-full.png`, `R/polish/b-clarify.png`).

**Différence principale avec le gold `choreography`** : dans le gold, un seul changement déclenche une cascade qui réorganise le panneau (les champs glissent, le total roule, les temps se chevauchent). La scène b est un remplissage de squelette ligne à ligne, plus proche de `loading` que d'une chorégraphie : rien ne change de place.

---

## Scène c — trois profils, scores puis reclassement (gold : `reorder`)

Images regardées : `R/shots/c-1440.png`, `R/shots/c-390.png`, `R/shots/c-states-1440.png`, `R/shots/c-states-390.png`, `R/host/c-fig-1440.png`, `R/beats/c-rank-1440.png`, `R/zoom/c-rank-rows.png`, `R/zoom/c-score-count.png`, `R/polish/c-end-full.png`, `R/polish/c-avatars.png`, `R/replay/c-1440-before.png`, `R/replay/c-1440-r00-0ms.png`, `R/replay/c-1440-r01-127ms.png`, `R/reduced/c-1440.png`.

**Cadrage**
- Rien. La fenêtre est pleine, le vide sous le pied de tableau est court et la fenêtre se fond en bas (`R/polish/c-end-full.png`, `R/host/c-fig-1440.png`).

**Hiérarchie et densité**
1. Camille, la gagnante, et Hugo ont des avatars gris ardoise, Yanis un avatar doré : deux des trois personnes nommées se lisent comme des disques de remplissage, et c'est la première du classement qui a l'avatar le plus terne. → `R/polish/c-avatars.png`. Correctif : une teinte propre à chaque personne nommée.

**Mouvement**
2. **Le reclassement traverse les lignes.** Les trois lignes bougent ensemble, à plat, en environ 0,2 s. Hugo et Yanis se croisent et se superposent : noms, avatars, barres et « 69/77 » empilés. La première image montre aussi Camille et Hugo l'un sur l'autre, et l'emplacement du haut reste vide pendant le mouvement. → `R/zoom/c-rank-rows.png` (0,00 à 0,16 s, ralenti x5), `R/shots/c-states-1440.png` et `R/shots/c-states-390.png` (case « rank »), `R/shots/c-1440.png` (2,8 s). Correctif : une ligne à la fois. Camille monte, soulevée avec une ombre et au-dessus des autres, pendant que les autres glissent ; 500 à 700 ms sur la courbe de trajet.
3. Le nombre se pose sur 69 à 0,16 s alors que sa barre grandit encore jusqu'à environ 0,7 s : pendant une demi-seconde, le chiffre et la barre ne disent pas la même chose. → `R/zoom/c-score-count.png`. Correctif : piloter la barre et le `Count` sur la même horloge et la même durée.
4. « Rejouer » coupe net de l'état final à l'ouverture : les lignes se téléportent à leur place de départ, et les scores comme « Confiance élevée » disparaissent en une image. → `R/replay/c-1440-before.png` puis `R/replay/c-1440-r00-0ms.png`. Correctif : rembobiner sur place en décalage inverse (environ 70 ms d'écart), ou un fondu au noir du contenu puis l'ouverture.

**Finition**
- Rien. Les chiffres roulent vers le haut et se posent une seule fois (`R/zoom/c-score-count.png`). Barres et pastille sont propres (`R/polish/c-end-full.png`).

**Différence principale avec le gold `reorder`** : le gold soulève la ligne déplacée (ombre, au-dessus) pendant que les voisines lui font de la place. Ici, les trois lignes bougent à plat et très vite, donc elles se traversent.

---

## Scène d — e-mail au candidat, mot à mot (gold : `ai-chat`)

Images regardées : `R/shots/d-1440.png`, `R/shots/d-390.png`, `R/shots/d-states-1440.png`, `R/shots/d-states-390.png`, `R/host/d-fig-1440.png`, `R/host/d-photo-zoom.png`, `R/zoom/d-stream-body.png`, `R/polish/d-end-full.png`, `R/replay/d-1440-r00-0ms.png`, `R/replay/d-1440-r01-211ms.png`, `R/reduced/d-1440.png`, et le still du constructeur `/Users/mrasoahaingo/Projects/perso/next-esn/.media/esneo/apercu/r13/scene-d-1440.png`.

**Cadrage**
1. La photo occupe environ 40 % de la hauteur de la figure. À 1440, le haut de la fenêtre coupe le visage de la femme au niveau des yeux. Les visages deviennent la marque la plus forte de la figure, avant l'e-mail, et la photo (deux personnes qui rient devant un écran) pourrait illustrer n'importe quel SaaS. → `R/host/d-photo-zoom.png`, `R/host/d-fig-1440.png`, `/Users/mrasoahaingo/Projects/perso/next-esn/.media/esneo/apercu/r13/scene-d-1440.png`. À 390, le visage est entier (`/Users/mrasoahaingo/Projects/perso/next-esn/.media/esneo/apercu/r13/scene-d-390.png`). Correctif : recadrer la photo (`object-position`) pour que les visages restent au-dessus de la fenêtre, ou la réduire, voire la retirer, pour que l'e-mail mène.

**Hiérarchie et densité**
- Rien d'autre. Le texte final, au vouvoiement, est un vrai texte, et « Brouillon à relire » porte le statut (`R/polish/d-end-full.png`).

**Mouvement**
2. Le texte arrive par-dessus son espace réservé : « Rédaction du brouillon… » et « Bonjour Camille, une » se superposent pendant environ 3 images, et les barres de squelette restent visibles sous les premiers mots. → `R/zoom/d-stream-body.png` (0,08 à 0,24 s), `R/shots/d-states-1440.png` et `R/shots/d-states-390.png` (case « stream »), `R/host/d-fig-1440.png` (1,5 s). Correctif : le libellé et les barres disparaissent entièrement avant le premier mot (comme « Thinking » dans le gold), ou le premier mot remplace le libellé sur place.
3. Avec « Rejouer », l'espace réservé et ses barres reviennent en fondu par-dessus l'e-mail complet : le texte se lit sous les barres. → `R/replay/d-1440-r00-0ms.png`, `R/replay/d-1440-r01-211ms.png`. Correctif : l'e-mail sort d'abord, puis l'espace réservé entre, sans superposition.

**Finition**
- Rien. Le défilement mot à mot avec une traîne qui s'éclaircit est propre et ressemble à celui du gold (`R/shots/d-states-1440.png`, case « stream +0,7 s »).

**Différence principale avec le gold `ai-chat`** : dans le gold, « Thinking » a disparu avant que la réponse arrive, dans un espace vide. Ici, le texte arrive par-dessus « Rédaction du brouillon… » et son squelette.

---

## Réponses à verify.md (résumé, chaque point depuis une image)

- **Gate 1440, 390, `--states`** : non, formellement (3 lignes `kit override`, faux positifs prouvés plus haut). Aucune autre ligne jamais intentionnelle.
- **Gouttière unique et débord** : oui. Fenêtre alignée sur la colonne, débord de 40 px à droite, fondu en bas, pour les quatre (`R/polish/*-end-full.png`).
- **Rien de coupé qui porte des mots ou que l'œil veut entier** : oui pour a, b et c ; non pour d (visage, `R/host/d-photo-zoom.png`).
- **Pas de plaque sous l'appareil** : oui (`R/host/*-fig-1440.png`).
- **Coin vide sans raison** : coin haut gauche à côté du satellite en a, b et d (constat transversal).
- **Fenêtres pleines** : a, c et d oui ; b non pendant l'animation (b-2).
- **Différence avec le gold** : voir chaque scène.
- **Avatars nommés en couleur** : non en c (c-1).
- **Marque la plus forte sur le sujet** : non en d (visages) ; en a et b, le satellite gris est la zone la plus claire ; c oui.
- **Chaque temps filmé à 40–80 ms** : oui au ralenti x5 (`R/zoom/*`). Aux échantillons à 50 ms sans ralenti (`R/beats/*`), le serveur de dev n'a tenu qu'environ 100 à 150 ms par image.
- **Rien n'apparaît ni ne part sans entrée ni sortie** : non (fondus enchaînés au même endroit en a, b et d ; coupe nette de « Rejouer » en c).
- **Chiffres qui roulent** : bon sens et une seule pose, mais décalés de la barre (c-3).
- **Retour à l'ouverture** : scènes jouées une fois ; « Rejouer » coupe net en c et superpose en d.
- **Zoom 4x** : rien d'illisible ni de rogné (`R/polish/a-checks.png`, `R/polish/c-avatars.png`, `R/polish/a-head.png`).
- **Texte d'au moins 10 px à 390** : oui, aucune ligne `small text`.
- **Mouvement réduit** : les quatre affichent l'état final, fixe et complet (`R/reduced/*-1440.png`).

## Ce que je n'ai pas pu vérifier

- **Chargement direct sur `#fonctionnement`, ou rechargement avec la scène à l'écran.** Dans un premier essai en dev, la scène a est restée sur son état final, sans jouer, de 1,8 à 6,1 s (`R/deeplink/a-1440-t01773.png`, `R/deeplink/a-1440-t06106.png`). Dans un second essai, elle a joué normalement (`R/deeplink2/a-1440-t01239.png`). Le rendu serveur affiche donc l'état final, puis l'hydratation repasse à l'ouverture. En build, ce passage devrait se voir comme un saut. À confirmer sur un build de production, que je n'ai pas lancé.
- « Rejouer » pour a et b (seuls c et d sont filmés) ; survol et focus du bouton.
- Largeurs intermédiaires (768, 1024) ; Safari, Firefox, tactile ; cadence réelle (rAF) sur un vrai appareil ; pause hors écran puis retour.
- Le gate sur un build de production, où la feuille du kit garderait peut-être un chemin reconnaissable : non tenté (consigne : pas de `next build`).
