# Rehearsal : héros, fenêtre de positionnement (r16)

**Gold** : `hero-demo`, un still pour la comparaison (`.media/esneo/apercu/r16/gold-hero-demo.png`). Gardé : temps nommés (`a.mark`), cibles `data-target`, un satellite qui vient devant à la fin. Changé : la scène pilote la vraie fenêtre (`HeroReview`, avec son API `restart` / `decide` / `quote`) au lieu d'une maquette. Pas de bulles d'annotation.

**Temps** (lecture unique, environ 12 s après l'apparition de la fenêtre) :
1. `fort` : le curseur valide le point fort. La conséquence s'écrit, et le compteur passe à 1/3 relus.
2. `citation` : il ouvre la citation du CV du point faible. Une carte s'ouvre sous le point avec le fichier, l'endroit dans le CV et la citation entière. Le curseur se range dans l'allée le temps de la lecture.
3. `clarifier` : il referme la citation puis valide « À clarifier ». La question est ajoutée à l'e-mail, et le compteur passe à 2/3.
4. `sortie` : le curseur sort par la droite.
5. `satellite` : « Extraction 5/5 · Validé » monte au bord de la fenêtre, devant elle (64rem et plus).

**Fin et poster** : point faible à relire, « Générer » verrouillé à 2/3, satellite en place. Le même état sert au rendu serveur, sans JS, en mouvement réduit et sous 60rem.

**La main au visiteur** : un appui ou une touche, n'importe où sur la page, arrête la scène net (`halt`). Le curseur disparaît et la fenêtre garde l'état du moment. La scène ne rejoue jamais : si elle sort du champ (défilement, onglet caché), elle s'arrête, et au retour la fenêtre est là où elle était, satellite en place. Les vrais boutons restent ceux de `HeroReview` (conséquences, verrou, un seul `aria-live`).

**Citation** : une ligne tronquée. Le clic ouvre une carte positionnée en absolu (opacité et transform), donc rien ne bouge autour. Échap ou un appui ailleurs la referme.

**Téléphone (moins de 60rem)** : le poster seul, sans curseur. La fenêtre y est recadrée et défile dans un cadre fixe. Une version compacte à 358 doublerait la vraie fenêtre, que le visiteur pilote déjà.

**Filmé** : `--gate` à 1440 (`gate-1440.png`, 20 images toutes les 0,8 s) et à 390 (`gate-390.png`), `--states` à 1440 (`states-1440.png`). Tout est dans `.media/esneo/apercu/r16/`.

**Gate** : `rehearsal failed: 3 never-intentional line(s) above` aux deux largeurs. Les 3 lignes sont des `kit override` (`.ss-avatar`, `.ss-check__fill`), de fausses alertes : Next regroupe le CSS du kit et celui de l'app. Corrigé en chemin : `loose stack` (type, texte, citation), puis `framing` et `uneven gutters` (carte de citation calée sur les gouttières du point).

**Contrôlé par script** (Playwright, Chrome) : CLS 0 sur la lecture complète. Un clic sur le h1 pendant `citation` gèle l'état, qui n'a pas bougé 9 s plus tard, et les boutons restent pilotables. Une tabulation pendant `fort` gèle aussi la scène. Après un défilement aller-retour, l'état est gardé, sans relecture. Mouvement réduit et sans JS : le poster (2/3, satellite) ; le h1 et « Générer » sont dans le HTML serveur.

**Pas vérifié** :
- un vrai navigateur à vitesse réelle, en dehors de Chrome headless ;
- Safari et Firefox ;
- le passage de 60 à 64rem (scène sans satellite visible) ;
- la `settle snap` de 28 px que film signale parfois au chargement (jamais vue sur une image, pas une ligne du gate) ;
- le lecteur d'écran sur la carte de citation ;
- LCP mesuré : la photo n'a pas été touchée.

**Plan incliné (r18)** : à partir de 60rem, la fenêtre, la carte de citation, le satellite et le curseur sont posés ensemble sur un plan incliné (`perspective: 900px`, point de fuite en haut à droite, sur le cadre ; sur `.eg-hero__live`, `rotateX(42deg) rotateY(-6deg) rotateZ(-5deg) scale(1.15)` : couché en arrière, bas le plus large, bord gauche penché vers la gauche, bord droit presque vertical ; 18 / -2 / -2deg de 60 à 64rem). Il se redresse à moitié (16 / -2 / -2deg, 520 ms) au survol du cadre ou au focus dans la fenêtre ; en mouvement réduit, il ne bouge pas. Flou progressif : deux couches `backdrop-filter` (3 px et 10 px) masquées en dégradé, sur le bord gauche et en bas, plus fort au coin bas-gauche ; rien en transparence réduite ni sous 60rem. La scène mesure ses cibles dans la mise en page (`data-ss-tilt`, `kit/measure.ts`), donc le curseur vise juste. Le `--gate` mesure à l'écran, sur les boîtes projetées : ses constats de géométrie (échelle 1,25, gouttières, `framing`) viennent de la 3D. Captures dans `.media/esneo/apercu/r18/`.
