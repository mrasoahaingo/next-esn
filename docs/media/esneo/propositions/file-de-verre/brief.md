# La file de verre

*Tour 2 — direction de l'utilisateur : verre façon iOS, sombre d'abord, lumière, animé.*

**Thèse.** Le travail d'un chasseur de têtes est une file de dossiers ; Esneo la range en fenêtres de verre que
vous faites défiler d'un geste, et vous ne vous arrêtez que pour valider.

## L'idée de scène

Une scène spatiale à la visionOS : une pièce sombre, la nuit, une large baie sur une ville floue, un sol poli.
Dans l'espace flotte **une seule file de fenêtres de verre**, présentée comme un « cover flow » : la fenêtre de
face est nette, éclairée de l'intérieur par l'azur, et sa lumière se reflète sur le sol ; les autres, de biais,
reculent dans la profondeur, plus givrées et plus sombres. Chaque fenêtre est une étape : CV lu, mission
décortiquée, positionnement, CV adapté et e-mails. Au bout de la file, deux fenêtres restent entièrement
givrées, avec le mot « Bientôt » : la prospection et « Branchez votre propre Claude ». Le futur est montré pour
ce qu'il est : une vitre qui n'est pas encore claire.

## Matière et lumière

- Fenêtres hautes à grands rayons (28 px), `backdrop-filter: blur(24px) saturate(170%)` pour celle de face,
  givre plus fort et opacité plus faible en reculant ; arête spéculaire fine, reflet intérieur, reflet au sol.
- Une seule source de lumière dans la scène : la fenêtre de face (azur). La ville derrière la baie donne une
  lumière froide d'ambiance. Rien d'autre ne brille.

## Palette

| Rôle | Valeur |
|---|---|
| Pièce, nuit | `#0b1020`, `#07080b`, `#0d0e11` |
| Verre | `rgba(255,255,255,0.06)` (fond de file) à `rgba(255,255,255,0.14)` (face) |
| Action, lumière de la fenêtre de face | azur `#3466e6` ; lueur `#6f94ff` |
| Texte | `#f5f7fa` ; secondaire `#a6abb4` |
| Statuts | `#2fa36b` · `#e9b54c` · `#e0533c` |

## Typographie

**Geist** (Google Fonts), une seule famille, celle de l'app : titres en 500, interlettrage −0,04 em, deux
lignes au plus ; texte en 400, 16–18 px ; 450 et +0,01 em sur le verre. La page et le produit parlent la même
langue, ce qui sert aussi la promesse « Branchez votre propre Claude » : tout ressemble déjà à un outil.

## Copie

- **Titre :** « Chassez les talents. Pas la paperasse. »
- **Sous-titre :** « Pour les chasseurs de têtes, ingénieurs d'affaires et recruteurs : Esneo lit les CV,
  décortique les missions et propose les positionnements. L'IA propose, vous validez. »
- **Actions :** « Essayer sur vos CV » · « Parcourir la file » · « Se connecter », « Créer un compte ».
- **Chapitres :** « Une file, quatre étapes. » · « L'IA propose, vous validez. » · « Rien ne tourne en
  silence. » · « Bientôt » · « Questions » · fin : « Plus de temps pour les gens. »

## Composition

| Section | Composition |
|---|---|
| Héros | pièce de nuit plein cadre ; titre et boutons en haut à gauche ; la file en cover flow sur les 60 % du bas : à gauche les étapes passées (CV extrait · Validé, Mission analysée · Validé), de face le positionnement (Camille Durand · 84/100, Valider / Écarter), à droite CV adapté et e-mails puis les deux fenêtres « Bientôt » |
| Une file, quatre étapes | la même file vue à plat, en rangée, chaque fenêtre avec une ligne sous elle (lit le CV, décortique la mission, propose un positionnement, CV adapté et e-mails prêts) |
| Le contrat | « L'IA propose, vous validez. » et la fenêtre de positionnement agrandie, éclairée, son reflet au sol |
| Statuts | une fenêtre large, quatre lignes avec point de couleur ; l'échec avec sa cause et « Relancer » |
| Bientôt | les deux dernières fenêtres avancent mais restent givrées : « Prospection » ; « Branchez votre propre Claude » (serveur MCP, connecteur : vos CV, missions et positionnements depuis votre assistant) |
| Questions | accordéon de verre |
| Action | toutes les fenêtres rangées en une pile nette, doucement éclairée ; « Plus de temps pour les gens. » et les deux boutons ; pied : mot-symbole pleine largeur |

## L'animation signature : « la file qu'on lance d'un geste »

1. **Chargement (0–1,1 s).** Les fenêtres arrivent du fond de la pièce vers leur place (translation Z + échelle,
   décalage 60 ms, ressort `bounce 0.15`, `0,5 s`) ; la fenêtre de face s'éclaire en dernier et son reflet
   apparaît au sol.
2. **Le geste (glisser).** La file suit le doigt ou la souris à 1:1 (Pointer Events + `setPointerCapture`, en
   respectant le point de saisie). Au lâcher, la vitesse est projetée vers l'avant avec la fonction d'Apple
   (`(v/1000)·0,998/(1−0,998)`), la file s'arrête sur l'étape la plus proche du point projeté, avec un ressort
   qui hérite de la vitesse du geste (`bounce 0.2`, `0,4 s`) : un petit lancer suffit à traverser la file. Le
   mouvement s'interrompt et repart à tout moment, à partir de la position affichée.
3. **À l'arrêt.** La fenêtre de face se dégivre et s'allume (opacité d'un calque de lumière + flou qui baisse
   par fondu de deux couches, pas d'animation du `backdrop-filter`).
4. **Au bout de la file.** Les deux fenêtres « Bientôt » résistent en élastique (*rubber-band*) : la file ne
   va pas plus loin, elles restent givrées.
5. **Défilement de la page.** Sans geste, le défilement avance la file d'une étape par écran dans le chapitre
   « Une file, quatre étapes. » (avec `scroll-snap`), sans jamais bloquer le défilement.
6. **Clavier.** Flèches gauche / droite et deux boutons « Étape précédente / suivante » ; `aria-roledescription`
   « carrousel », chaque fenêtre annoncée « étape x sur 6 ».

**Mouvement réduit** : pas de profondeur ni d'élan ; la file devient une rangée plate, chaque changement
d'étape est un fondu de 200 ms. **Transparence réduite** : fenêtres opaques `#16181c`. **Contraste renforcé** :
fond plein, bordure nette.

## Photos nécessaires

1. La pièce de nuit sans fenêtres de verre (baie, ville floue, sol poli), 16:9 et recadrage portrait.
2. Facultatif : la même pièce un peu plus éclairée pour la fin.

Le reste (fenêtres, reflets) est construit en HTML et CSS.

## Ce qui serait difficile à intégrer fidèlement

- **`backdrop-filter` en 3D.** Le flou d'arrière-plan à l'intérieur d'éléments transformés en 3D
  (`perspective`, `rotateY`, `preserve-3d`) est mal rendu ou aplati selon les navigateurs, Safari en tête. Plan
  réaliste : vrai `backdrop-filter` sur la fenêtre de face seulement ; les fenêtres de biais en verre « peint »
  (fond semi-opaque pré-flouté, arêtes) ; la 3D limitée à `rotateY` et à l'échelle.
- **Six fenêtres floutées en même temps** : trop lourd sur mobile. Sur téléphone, la file devient un
  défilement horizontal natif (`scroll-snap`, élan du système) avec une seule fenêtre floutée ; pas de cover
  flow.
- **Le reflet au sol.** `-webkit-box-reflect` n'existe pas dans Firefox ; repli : une copie retournée de la
  fenêtre, masquée en fondu, et donc dupliquée dans le DOM (`aria-hidden`).
- **Lisibilité dans la profondeur.** Les fenêtres de biais sont givrées et petites : leur texte devient
  décoratif, il faut qu'il soit dupliqué de façon accessible (liste des étapes lue par les lecteurs d'écran).
- **Le geste et l'élan.** Projection, ressort qui hérite de la vitesse, élastique en bout de course :
  bibliothèque Motion (ou Embla), pas des transitions CSS, sinon le lancer « colle ».
- **Réfraction.** La déformation du verre montrée dans les maquettes n'existe en CSS que dans Chromium
  (`backdrop-filter: url()`).
- **Risque de cliché.** Une scène sombre avec du verre bleu peut glisser vers le « SaaS IA » générique (ce qui
  a fait rejeter *Deep Signal*). Garde-fous : une seule source de lumière, aucune particule ni réseau, aucune
  puce flottante, des fenêtres pleines de vrai contenu.
