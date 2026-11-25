---
name: Esneo
description: IA de staffing pour ESN et cabinets — extraction de CV, analyse de mission, positionnement
direction: "Verre de nuit"
colors:
  paper: "oklch(14% 0.012 265)"        # #07090e
  paper-2: "oklch(17.5% 0.014 265)"    # #0d1017
  paper-3: "oklch(21.5% 0.016 265)"    # #161921
  paper-4: "oklch(27% 0.02 265)"       # #222630
  ink: "oklch(95.5% 0.008 265)"        # #edf0f6
  ink-2: "oklch(83% 0.014 265)"        # #c3c7d1
  muted: "oklch(72% 0.016 265)"        # #a0a5af
  rule-2: "oklch(38% 0.02 265)"        # #3d424d
  accent: "oklch(55% 0.2 264)"         # #3266e4 (azur de marque #3466e6)
  accent-hover: "oklch(50% 0.2 264)"   # #2456d3
  accent-text: "oklch(79% 0.12 262)"   # #90baff
  focus: "oklch(80% 0.14 262)"         # #8cbdff
  ok: "oklch(81% 0.14 158)"            # #66dc9e
  warn: "oklch(86% 0.12 82)"           # #f8c970
  err: "oklch(76% 0.15 25)"            # #ff8880
typography:
  display:
    fontFamily: "Albert Sans"
    fontSize: "clamp(2rem, 10.3vw - 0.15rem, 4.75rem)"
    fontWeight: 600
    letterSpacing: "-0.03em"
  head:
    fontFamily: "Albert Sans"
    fontSize: "clamp(1.75rem, 1rem + 3.2vw, 3.5rem)"
    fontWeight: 600
  body:
    fontFamily: "Albert Sans"
    fontSize: "1rem – clamp(1.0625rem, 0.98rem + 0.35vw, 1.25rem)"
    fontWeight: 400
    lineHeight: 1.6
  interface:
    fontFamily: "Geist"
    fontSize: "13–15px"
  data:
    fontFamily: "Geist Mono"
rounded:
  window: "22px"
  panel: "18px"
  control: "12px"
  sheet: "6px"
  pill: "999px"
---

# Design System: Esneo — pages publiques

Deux systèmes coexistent et restent séparés. **L’UI produit** (tout ce qui est derrière la connexion) a son
propre système, « L’établi », décrit en seconde partie de ce document : jetons shadcn « Graphite Pro » de
`app/globals.css`, sans verre ni halo. **Les pages publiques** (landing `/`,
`/sign-in`, `/sign-up`, 404) suivent la direction ci-dessous, entièrement sous la classe `.eg`
(`app/landing.css`). Rien n'en sort, sauf deux règles conditionnées par `:has(.eg)` (débordement horizontal coupé,
défilement doux sur la landing). Seul **le logo** est commun aux deux mondes (voir « Logo »).

## Historique

1. *Dossier* (papier, ruban rouge) : jugé trop administratif.
2. *Kinetic* (dégradé violet → magenta → ambre, capitales italiques) : générique.
3. *Deep Signal* (fond quasi noir, halo bleu, puces flottantes, illustration réseau) : non commité, copie locale
   dans `.media/wip-deep-signal/`. C'est le cliché « SaaS IA sombre » que la 5ᵉ direction évite.
4. *Le produit en action* (2026-11-11, commits `quick-261111-q9p`) : sur le modèle de la refonte
   `legal-advisor-juris-gps`. De vrais fragments de l'interface (`data-ui`) sur des photos éditoriales du monde
   des ESN ; le dossier de compétences comme forme de la page (onglets de dossier suspendu en `clip-path`) ;
   Hanken Grotesk ; graphite et blanc, azur seule couleur d'action. Jury 9.0 / 9.2 / 9.0. Remplacée le
   2026-11-12 ; ses fichiers ne sont plus importés (voir « Fichiers »).
5. **« Verre de nuit »** (2026-11-12, tâche GSD `261112-27s`, ce document).

Entre 4 et 5, deux tours de maquettes GPT Image 2.6 (`docs/media/esneo/propositions/`, images dans
`.media/esneo/propositions/`), sans code :

- **Tour 1, rejeté par l'utilisateur avant le jury.**
  - *Le surligneur* : demande client et CV lus côte à côte, surligneur en main.
  - *Avant midi* : la page est la matinée où se gagne une demande client.
  - *Le vivier* : la planche-contact du vivier, réordonnée par chaque demande.
- **Tour 2, sur la consigne de l'utilisateur** : « verre façon iOS, backdrop, sombre d'abord, glow, sophistiqué,
  animé ; la paperasse à l'IA, le contact humain au chasseur de têtes ».
  - *Le flou se lève* : 8.6. Recommandée, la seule où le verre porte le message.
  - *La lampe* : 7.9. Hologrammes à liseré néon, risque de performance.
  - *La file de verre* : 7.6. *Deep Signal* passé au verre, sans humain.

  Aucune ne battait le site en ligne (9.1).

La 5ᵉ direction garde ce que le jury du tour 2 a retenu : le verre posé sur la paperasse et sur les gens, et la
carte de positionnement interactive de la 4ᵉ. Le titre de *flou* (« Moins de paperasse. Plus de face-à-face. »),
repris d'abord, a été remplacé en r10 à la demande de l'utilisateur par **« Vous choisissez le profil. Esneo fait
le dossier. »** : le partage des rôles en une phrase, que la démonstration du héros prouve aussitôt.

Construite avec Hallmark (macrostructure Workbench, registre atmosphérique « Lumen », nav N10, pied Ft1 jusqu’en r9), elle a été
itérée sur six tours de jury (r1 → r5 : 7.8 / 8.4 / 8.3 → 9.2 / 9.3 / 9.2). L'utilisateur l'a validée, puis elle a
remplacé `/` en r6, avec connexion, inscription et 404. En r10, le pied devient sobre. En r11, le héros est refait
avec tasteskill 2.5.1 (`design-taste-frontend`, tirage `hero: split`) : texte sur cinq colonnes, la fenêtre du
produit sur six, une carte plate dessous ; la photo du héros sort. En r12, la photo de La Défense revient en fond
plein cadre sous des voiles, la fenêtre redevient du verre. En r13, les quatre écrans de la visite deviennent des
scènes animées (skill stageshow), jouées une fois à l'entrée à l'écran.

## Thèse

**La page est une visite de l'outil.** Des fenêtres de verre posées sur la paperasse qu'elles remplacent (CV et
fiches de mission en feuilles éteintes) et sur les gens à qui elles rendent du temps (photos, personnes fictives).
Le verre n'est pas un décor : il est l'interface d'Esneo, et ce qu'on voit à travers est ce qu'elle libère.

**L'élément vivant.** Dans le héros, un positionnement tel que l'IA le propose (Camille Durand, tech lead Java,
84/100).

- Le visiteur valide ou écarte chaque point. Le score ne bouge pas, et une note dit pourquoi : il dépend des points
  clés de la fiche, pas des décisions de relecture.
- « Générer le CV adapté » reste inactif tant que tout n'est pas relu, puis pendant la génération.
- La fenêtre s'agrandit ensuite pour montrer le CV adapté et les deux e-mails.

C'est le contrat produit en un geste : l'IA propose, vous validez, pas de doublon, un statut toujours visible.

## Couleurs

Graphite bleuté, élévation par la clarté (jamais par l'ombre seule). L'azur est à la fois la couleur d'action et
la couleur de la lumière (halos, verre teinté de l'action finale). Les jetons sont en OKLCH dans
`app/landing.css`.

| Jeton (`--color-*`) | Valeur | Rôle |
|---|---|---|
| `paper` → `paper-4` | 14 % → 27 % L, teinte 265 | fond, panneaux, surfaces surélevées |
| `ink` / `ink-2` / `muted` | 95,5 % / 83 % / 72 % L | texte, texte secondaire, mentions |
| `rule` / `rule-2` | 30 % / 38 % L | filets, bordures des champs |
| `accent` / `-hover` / `-press` | `oklch(55% 0.2 264)` / 50 % / 46 % | boutons pleins (texte blanc ≥ 4,8:1) |
| `accent-text`, `focus` | 79 % / 80 % L | liens azur sur fond sombre, anneau de focus |
| `ok` / `warn` / `err` / `info` (+ `-wash`) | vert 158, ambre 82, rouge 25, bleu 262 | statuts Validé, À valider, Échec, À clarifier |
| `sheet`, `sheet-ink` | 62 % / 24 % L | papier sous le verre, éteint pour ne pas éblouir |
| `band`, `azur-1` / `azur-2` | 22 % L teinté ; 42 % → 27 % L | bande éclairée de la fiabilité ; verre azur de l'action finale |
| `halo-1` / `halo-2` | azur à 32 % / 22 % d'opacité | deux halos, ancrés au héros et à la bande éclairée |
| `veil`, `veil-mid`, `veil-soft` | paper à 92 / 62 / 22 % | voiles sous le texte posé sur photo |

Clerk ne lit pas l'OKLCH : `components/auth/auth-screen.tsx` en reprend les équivalents sRGB (même nom, même rôle).

## Typographie

- **Albert Sans** (`--font-albert`, `app/layout.tsx`) pour la voix de la page : titres en 600, romain, interlettrage
  −0,03 em, casse de phrase ; texte courant en 400. Titre du héros (tasteskill, `--ly-h1`) : 500, interligne 1,02, −0,03 em ; 40 px au
  téléphone, puis `clamp(2.5rem, 14.4cqi, 4.5rem)` réglé sur la largeur de sa colonne (environ 71 px à 1440 dans
  493 px), trois lignes au plus à toutes les largeurs. Échelle : `--text-h2`, `--text-step`, `--text-h3`, `--text-lg`, `--text-base`, `--text-sm`, `--text-xs`,
  `--text-2xs`.
- **Geist**, la police du produit, dans les fenêtres d'interface (`.eg-win`, `.eg-review`, `.eg-sheet`), à la
  vraie taille de l'app (13–15 px).
- **Geist Mono** pour les données seulement (compteur « 0/3 relus », durées).
- Pas d'italique dans les titres, pas de serif (choix de l'utilisateur), pas de capitales espacées en surtitre.

## Composition

Conteneur `--page-max` 76rem, marges `--gutter` `clamp(1rem, 4vw, 3rem)`, espacement sur une base de 4 pt
(`--space-3xs` → `--space-4xl`). Points de rupture : 40rem (tablette), 60rem (bureau, et seuil du flou).

| Section | Composition |
|---|---|
| Nav (N10) | barre transparente qui devient une pilule de verre flottante au défilement (classe `is-floating`) ; sur téléphone, « Créer un compte » et un bouton menu ouvrant une feuille de verre sur un voile |
| Héros | tasteskill 2.5.1, `hero: split` (tirage `deal.mjs --type software --has ui,photo`). Exactement le premier écran (`100svh`, 120 / 64 px de marge ; 96 / 24 au téléphone). Fond (r12, sans personne depuis le 2026-11-13) : la photo de La Défense à l'heure bleue, bureau vide (`hero-vide.webp`) bord à bord, `img.layer` sous le contenu (`next/image` `fill`, préchargée, `sizes` réglé sur le rapport d'aspect pour ne jamais l'agrandir), cadrée pour que la ville passe derrière le texte ; assombrie par les voiles de la direction : dense sous le texte (`--color-veil`, puis `--color-veil-mid`, `--color-veil-soft` vers la droite ; presque uniforme au téléphone), la lumière azur du haut, et un fondu vers `--color-paper` sur les 8 derniers rem. Texte du héros à 4,84:1 au moins sur le pire pixel, à toutes les largeurs. À partir de 64rem, grille de 12 colonnes (24 px) sur la ligne de la page : texte sur cinq (annonce de 14 px à y 120 « Logiciel de positionnement pour ESN et cabinets de recrutement », h1 16 px dessous, chapeau 20/30 sur trois lignes au plus et 42ch, « Essayer sur vos CV » et « Voir comment ça marche » à 44 px, « Sans carte bancaire. ») ; la fenêtre de positionnement, seule boîte, dans un cadre de six colonnes à partir de la colonne 7 (596 × 716 à x 732, y 120), sans fond ni filet, rayon sur les quatre coins, finissant sur la ligne de droite ; depuis r12, la fenêtre est du verre (remplissage 0,74, flou 20 px, arête spéculaire ; opaque sous 60rem et en transparence réduite) posé sur la photo de fond ; dessous, une seule carte plate et opaque de 300 px, 24 px en retrait du coin bas-gauche du cadre, « Extraction 5/5 · Validé · CV_Camille_Durand.pdf », son point respire toutes les 2,4 s ; elle ne couvre jamais la fenêtre. À 1440 × 900 la fenêtre tient entière en relecture ; quand elle dépasse (documents, 1280, 1024, tablette, téléphone), elle défile dans le cadre, barre d'action collée au bas à partir de 640 px. Sous 1024 px, le texte puis le cadre dans ce qui reste (240 px au moins), la carte retirée ; au téléphone, boutons empilés pleine largeur, la fenêtre recadrée se fond au bas du cadre. Aucune légende sur ni sous l'image (règle 1 du skill) : la mention IA reste dans la ligne du pied. Entrée une fois au chargement (`data-enter`, `html.m-enter`) |
| Visite (Workbench) | « Du CV reçu au positionnement prêt. » ; quatre écrans numérotés 01–04, reliés par un fil qui se remplit au défilement ; chaque écran est posé sur ce qu'il remplace (CV, fiche de mission, classement, photo du face-à-face). Depuis r13, chaque écran est une scène animée (`components/landing/stage/`, kit stageshow), « Rejouer » sur la ligne de la légende, à droite. Depuis r15, quatre compositions de `framing.md`, une par histoire : 01 fenêtres qui se chevauchent (le CV papier devant la fiche, sur sa barre latérale), 02 panneau sur le produit (la demande du client sur la marge de la fiche, une ligne neutre du passage au point), 03 gros plan (la fenêtre à 1,3 fois), 04 cartes empilées (le brouillon d'e-mail au-dessus de la photo du face-à-face) ; en compact, les papiers sont retirés. Hauteurs fixes : 496 / 424 / 440 / 500 px (352 / 352 / 344 / 500 en compact) |
| Fiabilité | bande éclairée : « L'IA propose, vous validez. », quatre engagements, et le tableau de suivi sur la photo du point staffing (« Réessayer » est cliquable) |
| Vos données | « Ce que deviennent vos CV. » : quatre faits vérifiés dans le code (espace par organisation, droits par rôle, chemin vers l'IA, suppression y compris le PDF d'origine), en quatre colonnes |
| Bientôt | deux vitres restées givrées sur une mini-interface éteinte : Prospection ; Claude branché sur Esneo via un connecteur (MCP) ; chacune marquée « Bientôt » |
| Questions | titre à gauche, accordéon à droite (empilés sur téléphone) |
| Action finale | verre teinté azur (opaque) : « Essayez Esneo sur vos propres CV. », la suite en clair, bouton clair, phrase sur l'usage des données |
| Pied | sobre : le logo à la taille de celui de la nav (lettres ≈ 120 px) et une ligne d'accroche ; les liens (Fonctionnement, Fiabilité, Vos données, Questions, Se connecter, Créer un compte) ; puis, sous un filet, la mention des photos IA et des exemples fictifs, et le copyright |
| Connexion / inscription | colonne du formulaire : titre « Se connecter » ou « Créer votre compte » (le seul h1 : 1,75rem au téléphone, 2rem au bureau), formulaire Clerk aligné à gauche jusqu'à « Secured by Clerk », sur un halo azur discret (hauteur réservée, CLS nul), puis la phrase sur les données. Téléphone : photo en bande de 9rem, marque en haut, la promesse réduite à une ligne discrète (`ink-2`, 400) sur le voile ; « Sans carte bancaire. » sous le titre de l'inscription ; légende IA sous le formulaire ; sur 375 × 667, le premier champ et « Continuer » sont visibles dès l'arrivée. Bureau ≥ 60rem : deux colonnes, photo pleine hauteur à gauche (marque en haut, légende en pastille à droite, vitre de 30rem en bas : promesse en 500, plus petite que le h1, et son chapeau), cadrée pour laisser voir le CV papier de la photo de connexion |
| 404 | page entière pour tout chemin inconnu (le middleware ne protège que les routes de l'app) ; téléphone : photo du couloir en tête, puis marque, « Cette page n'existe pas. », texte, « Retour à l'accueil » et « Se connecter » (« Ouvrir l'app » une fois connecté, même bascule que la landing) ; bureau : texte 5/12 à gauche, photo 7/12 à droite. Les voiles de la photo partent du papier plein (3rem) : aucune couture |

## Verre

Le verre a été demandé par l'utilisateur (dérogation explicite à l'interdit du genre). Ses règles :

- **Le flou seulement là où il réfracte quelque chose.** `.eg-glass` est par défaut un panneau opaque (arête
  spéculaire `inset`, reflet radial, ombre portée longue), sans `backdrop-filter`. Le flou n'existe qu'avec
  `.eg-glass--blur` (sur une feuille ou une photo : écrans 1, 2 et 4 de la visite, tableau de suivi) et
  `.eg-glass--photo` (fenêtre du héros sur sa photo de fond, vitre des pages d'authentification au bureau),
  **à partir de 60rem**. En dessous, les
  mêmes fenêtres sont opaques. L'écran 3 (classement) ne recouvre que le fond : il reste opaque partout.
- **Trois couches floutées au plus à l'écran**, rayon jamais animé : `--glass-blur` 24px, `--glass-blur-photo`
  20px, `--nav-blur` 22px, givre de « Bientôt » 4px. Saturation 165 %.
- **Où** : fenêtres produit, pilule de navigation et menu, vitres givrées de « Bientôt », vitre de la promesse
  (connexion, inscription, bureau seulement : au téléphone, la promesse se pose sur le voile de la bande photo).
  Ni cartes de contenu en verre, ni verre sur fond uni.
- **Reflet** : une bande claire masquée et inclinée (`skewX(-14deg)`) glisse sur la vitre pendant qu'elle traverse
  l'écran (`animation-timeline: view()`). Seulement à partir de 60rem, sans mouvement réduit, si le navigateur le
  permet, et toujours sous le contenu (il ne touche pas le contraste). Aucun reflet sur le verre azur.
- **Replis** : sans `backdrop-filter` (`@supports not`) ou avec `prefers-reduced-transparency: reduce`, tous les
  remplissages passent à leur version opaque (`--glass-fill-solid`, `--nav-fill-solid`, `--frost-fill-solid`) et
  le flou est retiré.
- **Contraste mesuré sur le pire pixel** derrière chaque texte posé sur du verre ou une photo (script Playwright :
  texte rendu transparent, capture, luminance maximale sous chaque ligne). Minimum r11 : 4,84:1 sur la landing
  (texte du héros 4,84:1, carte 11,7:1),
  9,3:1 sur la vitre des pages d'authentification, 7,7:1 pour leur légende, 9,9:1 pour la marque (flèche et
  logo, élément non textuel) sur la photo, grâce à un voile d'angle dédié.

## Mouvement

- **Signature** : la démonstration du héros. Les panneaux apparaissent en fondu ; la zone de travail glisse en
  hauteur (`transition: height`, dérogation acceptée, hauteur mesurée hors animation) quand les documents
  apparaissent.
- **Entrée du héros**, une fois au chargement (tasteskill, motion.md) : l'annonce et le h1 montent (700 ms), puis
  le chapeau, les boutons et la mention (12 px, 520 ms, en cascade de 60 ms) ; le cadre de la fenêtre se pose de
  0,98 à 1 en 900 ms sans jamais disparaître. Transform et opacité seulement ; sans script ou en mouvement réduit,
  le héros reste tel qu'écrit. Les boutons avancent d'un pixel au survol et s'enfoncent à l'appui (1 px, 0,985).
- Le fil de la visite se remplit au défilement (`animation-timeline: view()`, `scaleY`). Repli JavaScript qui écrit
  `--p` et n'écrit `data-state` que lorsqu'il change.
- Nav : morphose barre → pilule sur `transform` et `opacity` (520 ms, `--ease-out`). Menu : entrée 220 ms.
- **Scènes de la visite** (r13, `components/landing/stage/`, voir `REHEARSAL.md`) : chacune joue une fois quand
  elle entre à l'écran (IntersectionObserver du kit), garde son état final, se remet à son départ si on la quitte
  avant la fin, et se met en pause hors écran. Déjà à l'écran au chargement (lien direct, rechargement), son
  contenu sort en fondu, revient à l'ouverture et la scène joue ; sans réponse de l'observateur, le contenu
  reste visible. 01 : le PDF se pose dans la zone de dépôt, jauge d'envoi, rubriques
  résolues de haut en bas depuis un squelette, « Fiche prête à relire ». 02 : le niveau attendu change dans sa
  case, les points clés se résolvent par importance, leur niveau un temps après, puis « À clarifier ». 03 : les
  scores roulent un à un, puis les profils glissent à leur rang, « Confiance élevée ». 04 : l'e-mail vouvoyé
  s'écrit mot à mot, question de disponibilité, « Brouillon à relire ». r14 (relecture à froid) : en 01 le CV
  papier se soulève et son fichier descend se poser dans la zone de dépôt ; en 02 chaque passage de la demande
  du client se marque quand son point arrive ; en 03 le reclassement se fait une ligne à la fois, soulevée et
  passant devant (gold `reorder`) ; plus aucun fondu croisé de deux textes (Roll, ou sortie avant l'entrée) ;
  « Rejouer » et le lien direct font sortir le contenu en fondu puis rentrer l'ouverture, jamais de coupe. Opacité et transform seulement, rien ne se
  remet en page. Le poster (état final) est le rendu serveur, sans script et en mouvement réduit. « Rejouer »
  (44 px, nom accessible explicite) n'existe qu'après hydratation et disparaît en mouvement réduit. Rien n'est lié
  au défilement.
- Durées : 120 / 220 / 420 / 520 / 900 ms ; courbes `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`.
- `prefers-reduced-motion: reduce` : fondus de 150 ms au plus, pas de transformation, pas de
  reflet ni de fil animé, défilement instantané. Le contenu est intact.

## Logo

- **Le logo script d'origine d'Esneo**, inchangé : `components/esneo-full-logo.tsx` (tracé SVG, `viewBox` 2816 × 510,
  même géométrie que `public/esneo-full.svg`), en `currentColor`. Sur les pages publiques, il prend l'encre de la
  page (`--color-ink`, clair sur fond sombre) ; dans l'app, `text-foreground` (sombre en thème clair, clair en
  thème sombre).
- Sur les pages publiques, la classe `.eg-logo` (`app/landing.css`) le règle par sa hauteur (`--logo-h`) et rogne
  les marges latérales de la `viewBox` (le tracé occupe x 199,5 → 2606,7) pour que les lettres s'alignent sur la
  colonne : nav 1,5rem de haut (dans une pilule de 60 px) ; connexion et inscription 1,25rem au téléphone, 1,375rem
  au bureau, sur le voile d'angle de la photo (9,9:1 au moins sur le pixel le plus clair) ; 404 1,5rem ; pied
  1,625rem (lettres ≈ 120 px).
- Dans l'app, rien ne change : barre latérale 120 × 22 px, centré (`w-30`) ; sélection d'organisation 240 px.
- La carte de partage (`app/opengraph-image.tsx`) reprend le même tracé (`PATH_D`, exporté par le composant sans
  changer son rendu), rogné sur ses lettres.
- Historique : un mot-symbole typographique (Albert Sans 700 et pastille azur) a été essayé pendant cette
  direction, puis abandonné à la demande de l'utilisateur, qui garde son logo.

## Honnêteté

- Aucune preuve sociale, aucun logo client, aucun témoignage, aucun prix, aucun chiffre d'usage (`PRODUCT.md`).
- Candidats, consultants, missions et prospects affichés sont des exemples fictifs, et la page le dit (sous-titre
  de la visite, pied).
- Les photos sont générées par IA ; chacune porte sa légende (« Photographie générée par IA, personne(s)
  fictive(s) »).
- « Vos données » ne dit que ce que le code fait. Chaque fait est référencé en commentaire dans
  `components/landing/landing.tsx` : stockage privé, filtrage par organisation, rôles, GPT-6 Luna via la
  passerelle de Vercel (inférence UE, sans conservation), suppression de la fiche avec son PDF d'origine.
- Les fonctions à venir sont marquées « Bientôt », sous un givre, sans bouton. « Claude » est écrit en texte, sans
  logo.
- Une seule phrase sur les données, partout où l'on s'inscrit (sous le formulaire de connexion et d'inscription,
  et dans l'action finale) : « Vos CV ne sont confiés à des modèles d'IA tiers que pour l'extraction, l'analyse
  et la rédaction. »
- Les messages d'erreur de Clerk les plus vus sont réécrits en français courant (`app/layout.tsx`), par exemple :
  « Aucun compte n'utilise cette adresse. Vérifiez-la ou créez un compte. »

## Accessibilité

- **Rendu sans attendre Clerk** : la coque (`components/authenticated-shell.tsx`) rend les pages publiques
  (landing, connexion, inscription, 404) avant que Clerk soit chargé, côté serveur comme sans JavaScript. Sur la
  landing, la bascule déconnecté / connecté (`components/landing/auth-switch.tsx`) rend d'emblée la variante
  déconnectée et n'attend jamais `auth()` : la page reste statique. Le middleware ne protège que la liste explicite
  des routes de l'app (`lib/config/app-routes.ts`) et `/api` ; un chemin inconnu reçoit la vraie 404. Aucune
  frontière Suspense ne coiffe les pages publiques : le repli « Chargement… » vit dans le `loading.tsx` de chaque
  dossier de l'app (`components/route-loading.tsx`), plus à la racine.
- Un seul `h1` visible par page (sur les pages d'authentification, le titre de la colonne du formulaire ; celui de
  Clerk est masqué par `appearance.elements.header`). Lien d'évitement, régions nommées (« Connexion »,
  « Inscription », « Présentation d'Esneo »), une seule région `aria-live` dans la démonstration, `aria-pressed`
  sur Valider / Écarter, `aria-current` sur le profil ouvert du classement.
- Cibles de 44 px au moins : boutons, champs Clerk (`minHeight`), bouton œil, liens du pied de Clerk, liens de
  marque.
- Focus visible : anneau de 2 px `--color-focus`. Champs bordés sur leurs quatre côtés, rouge `--color-err` en
  erreur (l'anneau de focus passe aussi au rouge : un seul signal), message sous l'anneau. Après un envoi en erreur, le focus revient sur le champ fautif (son
  message est relié par `aria-describedby`) ; sinon, ou pour une alerte générale, le message passe par une région
  `polite` (`components/auth/auth-form-a11y.tsx`). Les libellés anglais du bouton œil sont traduits.
- Titres et descriptions propres à chaque page : « Se connecter · Esneo », « Créer votre compte · Esneo »,
  « Page introuvable · Esneo » (avec `noindex`) ; description par défaut alignée sur la landing (`app/layout.tsx`).
- Aucune règle CSS ne vise les classes de Clerk : tout passe par son apparence (sinon Clerk signale du « CSS
  structurel » fragile).
- Aucun débordement horizontal de 320 à 1280 px ; CLS hors interaction nul au téléphone comme au bureau, pages
  d'authentification comprises (hauteur du formulaire réservée). Les pages publiques défilent normalement (pas de
  défilement interne), pour que la barre d'adresse se replie au téléphone.

## Fichiers

| Rôle | Fichier |
|---|---|
| Styles et jetons (tampon Hallmark en tête) | `app/landing.css` |
| Landing | `components/landing/*` (`landing.tsx`, nav, héros interactif, fenêtres de la visite, FAQ) |
| Connexion, inscription | `components/auth/auth-screen.tsx` (coquille et apparence Clerk), `auth-brand-panel.tsx`, `auth-form-a11y.tsx` ; messages Clerk dans `app/layout.tsx` |
| Routes publiques et protégées | `lib/config/app-routes.ts` (middleware et coque), `middleware.ts`, `components/authenticated-shell.tsx` |
| 404 | `app/not-found.tsx` |
| Logo | `components/esneo-full-logo.tsx` (logo script d'origine), classe `.eg-logo` dans `app/landing.css` |
| Photos | `components/site/images.ts`, `public/media/esneo/` ; prompts dans `docs/media/esneo/` |
| Journal Hallmark | `.hallmark/log.json` |

L'ancien système des pages publiques (4ᵉ direction) a été supprimé : `components/marketing/landing.tsx`, les
composants de `components/site/` sauf `images.ts` et `fr.ts`, `app/esneo-site.css`, la police Hanken Grotesk et les
photos qui ne servaient plus (`bureau-hd`, `esplanade-hd`, `consultant-hd`, `dossier-anonyme`, `fin-ecran`,
`hero.webp`).


---

# Design System: Esneo — UI produit (« L'établi »)

Tout ce qui est derrière la connexion : tableau de bord, édition du CV, positionnement, puis, à leur tour, les
réglages, les modèles et l'administration. Ce système est **distinct** de « Verre de nuit » (pages publiques,
ci-dessus) : même logo, même azur d'action, mais ni verre, ni halo, ni photo. Il s'appuie sur les jetons shadcn de
`app/globals.css` (« Graphite Pro », thème clair et thème sombre, tous deux de premier rang).

Construit avec Hallmark, verbe `redesign`, flux multi-pages (2026-11-24) : **genre modern-minimal**, famille de
macrostructure **Workbench** pour les pages de l'app. Les trois premiers écrans refaits : `/dashboard`,
`/review/[id]`, `/review/[id]/positioning` et `/review/[id]/positioning/[positioningId]`. La règle de diversification
de Hallmark est **inversée** ici : les pages d'une même app partagent tout (thème, type, voix des boutons) et ne
varient que par la composition de leur établi.

## Thèse

**L'écran est un établi.** Le document au centre (le CV, la fiche de mission, le positionnement), les outils autour,
et l'état du travail de l'IA toujours au même endroit : sous le titre. Une seule action principale par écran.
Rien ne brille, rien ne flotte : l'interface se tait pour que le dossier parle.

La valeur du produit (« l'utilisateur a toujours un feedback clair et fiable quand l'IA travaille ») se lit dans la
forme : la zone d'état est fixe, les étapes sont nommées, les doublons sont impossibles (bouton `disabled` avec
l'explication en info-bulle), l'erreur est un bandeau avec « Réessayer », jamais un spinner muet.

## Ce qui disparaît (la 3ᵉ direction des pages de l'app : « SaaS IA sombre »)

L'UI produit portait les tics du genre que la landing a déjà quittés. Dans les pages refaites, **interdits** :

- `title-gradient` (texte en dégradé), `glass-panel` (verre sur fond uni), `neon-ring` / `violet-ring` (halos),
  `grid-noise` (fond quadrillé des états vides), `animate-shimmer` (balayage), `animate-ping` (point qui pulse),
  `app-surface` (taches radiales du fond). Les utilitaires seront retirés de `globals.css` quand plus aucune page ne
  les importe.
- La pastille-surtitre (« CV Builder », « Positionnement ») au-dessus d'un titre qui répète le fil d'Ariane ;
  l'icône carrée lumineuse à gauche du titre ; le double titre (coque + page) : le fil d'Ariane de la coque dit où
  l'on est, le `h1` de la page dit quoi.
- Les rangées de tuiles identiques « icône colorée + libellé + chiffre » ; les cartes toutes pareilles empilées sur
  trois colonnes ; le pied de carte explicatif en 10 px ; les textes de 8 à 11 px.
- Les onglets segmentés imbriqués ; le « ! » comme icône de lacune ; la phrase d'aide centrée en bas de page ;
  l'anglais dans les titres de sections (« Personal Info », « Experiences ») ; le tutoiement.
- Les palettes à huit couleurs dans les graphiques ; les radars en grille ; les cartes candidat / mission teintées
  « neon » et « violet » reliées par une icône ronde.

## Couleurs

Les jetons shadcn de `app/globals.css`, et rien d'autre : `background`, `card`, `panel-soft`, `border`,
`foreground`, `muted-foreground`, `primary` (azur), `ring`, `destructive`, et les deux nouveaux `success` et
`warning` (clair et sombre). Jamais une couleur Tailwind nommée (`amber-400`, `emerald-500`) dans une page.

| Rôle | Jeton | Règle |
|---|---|---|
| Papier, panneau, surface relevée | `bg-background`, `bg-card`, `bg-panel-soft` | l'élévation se dit par la clarté et un filet 1 px `border-border`, jamais par une ombre au repos (les `Dialog`, `Popover`, `Sheet` gardent l'ombre shadcn) |
| Action, sélection, focus, lien | `primary`, `ring` | l'azur est la seule couleur chromatique décorative ; ≤ 5 % de l'écran |
| Statut | `success` / `warning` / `destructive` / `muted-foreground` | Validé, À relire ou partiel, Échec, neutre ; un score passe par `scoreTone()` (`lib/utils/score-tone.ts`) : ≥ 70 solide, ≥ 40 partiel, sinon faible, mêmes seuils partout |
| Graphiques | `primary` + gris, et les trois statuts quand ils signifient quelque chose | une teinte par graphique ; les séries d'un même graphique se distinguent par la clarté (`primary`, `primary/60`, `primary/30`) |

`--neon` et `--violet` restent pour la coque (barre latérale, en-tête) jusqu'à leur propre refonte ; **aucune page
refaite ne les utilise**.

## Typographie

- **Geist** partout dans l'app (`font-sans`), une seule famille. Albert Sans reste à la landing.
- **Geist Mono** (`font-mono`, `tabular-nums`) pour les données seulement : scores, pourcentages, durées,
  compteurs d'étapes, dates courtes, noms de fichiers.
- Échelle : `h1` de page 1.25 rem / 600 / `tracking-[-0.01em]` (`PageHeader`) ; `h2` de section 0.9375 rem / 600 ;
  corps 0.875 rem / 400 / interligne 1.5 ; mentions et méta 0.75 rem. **Rien sous 0.75 rem.** Un chiffre mis en
  avant (score en tête de positionnement) : 1.75 rem / 600 en mono.
- Casse de phrase partout. Pas d'italique, pas de capitales espacées, pas de dégradé.
- Un seul `h1` par page, rendu par `components/app/page-header.tsx`.

## Composition

- **En-tête de page** (`PageHeader`) : titre = le nom de l'objet quand il existe (« Camille Durand »,
  « Camille Durand × Tech lead Java, Acme ») ; une phrase de description ; une ligne de faits en mono ; les actions
  à droite (une seule `Button` `default`, les autres `outline` ou `ghost`, le destructif en `ghost` derrière un
  `AlertDialog`) ; la zone `status` dessous, pleine largeur, où vit l'état de l'IA.
- **Grille** : 4 pt via Tailwind. Tableau de bord dans `max-w-6xl` ; écrans de travail pleine largeur,
  `px-4 md:px-6`, `py-5`. Entre panneaux `gap-6`, dans un panneau `gap-3` ; entre sections d'une colonne
  `space-y-8`. Les écrans de travail sont des **diptyques asymétriques** à partir de `lg` (document 7/12 ou 8/12,
  aperçu 5/12 ou 4/12), une colonne en dessous ; l’aperçu PDF est `lg:sticky lg:top-6 lg:self-start`, hauteur
  maximale `lg:max-h-[calc(100svh-7rem)]`. Le conteneur de défilement est le `main` de la coque, sous
  l’en-tête : un élément collant se cale sur le padding haut de la page (`top-6` avec le `py-6` de la v2), jamais sur `top-16`.
- **Un seul niveau de carte.** Une liste vit sur le papier avec des filets (`divide-y divide-border`), pas en
  cartes empilées ; une section de formulaire est un `h2` sur un filet, pas une carte. La carte (`bg-card border
  rounded-xl`) est réservée à ce qui est vraiment un objet à part : l'aperçu PDF, un graphique, un panneau latéral.
- **Rayons** : `rounded-xl` pour les panneaux (`--radius` 0.625 rem), `rounded-md` pour les contrôles, `rounded-full`
  pour les pastilles de statut.
- **Asymétrie voulue** : les colonnes ne sont jamais égales, les rangées de chiffres ne sont jamais des tuiles ;
  une ligne de faits (`dl` horizontale, séparée par des filets verticaux) remplace la rangée de cinq tuiles.
- **États vides** : `components/ui/empty.tsx` (titre, une phrase, l'action), sur le papier, sans icône décorative
  ni fond quadrillé. Un tableau de bord sans donnée est **un seul** panneau d'invitation, pas six cartes vides.
- **Mobile** : 320 → 1440 px sans débordement horizontal ; les actions de l'en-tête passent à la ligne ;
  cibles ≥ 36 px (44 px pour les actions principales sur téléphone).

## L'état de l'IA (le cœur)

- Un workflow = **un** `WorkflowStepList` (`components/workflow/`, inchangé ce tour), placé dans la zone `status`
  de l'en-tête de page, ou en tête du panneau qu'il remplit. Jamais deux indicateurs pour le même travail.
- Pendant le travail, ce qui attend est un **squelette calme** (`Skeleton`, sans balayage) ; la section en cours
  porte un filet gauche `border-l-2 border-primary` et le mot « En cours » ; la section finie ne porte rien de
  plus (le contenu est là, c'est la preuve). Une seule région `aria-live="polite"` par workflow.
- Terminé : la zone d'état se replie en une ligne mono (« Extraction terminée en 42 s · 5 étapes ») avec le détail
  dans un `<details>`.
- Échec : `Alert` `destructive` avec le message d'étape et « Réessayer » ; l'action qui relancerait un doublon est
  `disabled` avec `Tooltip` (« Une analyse est déjà en cours »).
- Le spinner centré plein écran n'existe qu'au chargement initial d'une route (`components/route-loading.tsx`).
- Pas de confirmation pour ce qui est réversible ; `AlertDialog` seulement pour supprimer.

## Mouvement

- Durées 120 / 220 ms, courbe `--ease-out` (`cubic-bezier(0.16, 1, 0.3, 1)`) ; `transform` et `opacity`
  seulement. Pas de balayage, pas de pulsation, pas de fond animé, pas d'animation de largeur de barre au-delà de
  220 ms.
- `motion-reduce:` sur toute transition : fondu ≤ 150 ms, rien ne bouge.
- Succès silencieux (le contenu change, un `Badge` passe à « Validé ») ; un toast (`sonner`) seulement pour ce qui
  s'est passé hors de l'écran (export prêt, suppression).

## Composants partagés de l'UI produit

| Rôle | Fichier | Qui peut le modifier |
|---|---|---|
| En-tête de page | `components/app/page-header.tsx` | le tronc (`refonte-app-ui`) ; les écrans le consomment |
| Ton d'un score | `lib/utils/score-tone.ts` | le tronc |
| Étapes d'un workflow | `components/workflow/WorkflowStepList.tsx` | gelé ce tour ; propositions par message |
| Mention IA | `components/ai/ai-generation-info.tsx` | gelé ce tour |
| Coque | `components/unified-sidebar.tsx`, `components/app-header.tsx`, `components/authenticated-shell.tsx` | gelés ce tour (prochaine étape : retirer `app-surface` et les teintes neon/violet de la coque) |
| Enveloppe de section (attente / en cours / fini) | `app/review/components/SectionShell.tsx` | l'écran CV ; le positionnement la consomme sans changer son API |
| Aperçu PDF | `app/review/components/PdfPreview.tsx` | l'écran CV ; le positionnement **réutilise** ce composant au lieu de sa copie locale |
| Primitives shadcn | `components/ui/*` | personne pendant la refonte |

## Honnêteté et copie

- Français partout, vouvoiement, phrases courtes, verbes d'action sur les boutons (« Valider le CV »,
  « Analyser le matching », « Exporter le PDF »).
- Aucun chiffre inventé : un indicateur sans donnée affiche « — » et sa raison, pas un zéro ni un exemple.
- Les durées estimées (« temps gagné ») gardent leur formule visible dans l'info-bulle.

## Journal

- `.hallmark/log.json` : une entrée `scope: "app"` pour cette refonte.
- Tampon en tête de chaque page refaite (commentaire TSX, première ligne non vide) :
  `/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: DESIGN.md · designed-as-app */`
- Briefs d'exécution par écran : `docs/refonte-app/`.


## Révision v2 — de « vide » à app moderne (2026-11-24, soir)

Première revue à l'écran par l'utilisateur, après la fusion des trois écrans v1 : « l'interface est vide, je veux
que ça ressemble à une app moderne », et le menu de gauche n'avait pas été refait. Vu à 1440 px : des blocs sans
contour posés sur un fond uni ; une liste à un seul élément dans une zone immense ; des titres de section qui
flottent ; une barre latérale d'origine (liste de CV, onglets segmentés, badges tous identiques). La v1 avait
poussé « sur le papier, sans cartes » jusqu'au document : une app n'est pas un document.

Les règles ci-dessous **remplacent** celles de « Composition » et « Un seul niveau de carte » plus haut. Tout le
reste (couleurs, typographie, état de l'IA, mouvement, interdits) tient toujours.

### Toile et panneaux

- Le `main` est une **toile** teintée : `bg-shell`. Plus aucun bloc de contenu n'est posé nu dessus.
- Chaque bloc est un **panneau** : `components/app/panel.tsx` (`Panel`, `PanelHeader`, `PanelBody`,
  `PanelFooter`) = `bg-panel border border-border rounded-xl shadow-sm` (sans ombre en sombre). L'en-tête tient
  sur une ligne : icône lucide 16 px grise, titre 0.875 rem / 600, compteur en mono sur fond `muted`, action à
  droite (`Button` `ghost` ou `outline` `sm`, ou un lien). Corps `p-4`. Un seul niveau : pas de panneau dans un
  panneau. L'aperçu PDF et l'éditeur d'e-mail sont des panneaux comme les autres.
- Les chiffres clés sont des **cartes KPI** (`components/app/kpi-card.tsx`), quatre par rangée, pas une ligne
  de faits entre deux filets.
- Les listes de trois colonnes et plus sont des **tableaux** (`Table` shadcn : en-tête, lignes de 44–48 px,
  survol `bg-muted/50`, ligne entière cliquable) ; les listes courtes restent des listes `divide-y` **dans** un
  panneau.
- Les sections d'un formulaire (CV) sont des panneaux : en-tête (icône, titre, compteur « 24 compétences »),
  champs dans le corps.

### Densité et vide

- Corps 0.8125–0.875 rem ; méta 0.75 rem ; `gap-4` entre panneaux ; page `px-6 py-6` ; tableau de bord
  `max-w-7xl`.
- **Jamais de vide.** Un panneau prend la hauteur de son contenu (`items-start`, `auto-rows-min`) ; une liste
  d'un élément ne réserve pas d'espace ; les panneaux de la colonne voisine remontent. Un état vide est un `Empty`
  (icône 20 px dans un disque `bg-muted`, titre, une phrase, **toujours une action**) et tient en 160 px.
- **Signes de vie** : avatars à initiales (`components/app/initials-avatar.tsx`) devant chaque candidat ;
  pastilles de statut à point coloré (`components/app/status-badge.tsx` : `ok` / `warn` / `err` / `info` /
  `neutral`, `pulse` pour un travail en cours) ; compteurs à côté des titres et dans le menu ; dates relatives
  courtes (« il y a 2 h », « hier », « 21 mars »).
- Les icônes **guident** : en-têtes de panneau, entrées du menu, actions. Jamais en fond, jamais dans un carré
  coloré lumineux (interdit v1 maintenu).

### Menu de gauche (coque)

La barre latérale devient une **navigation**, plus une liste de CV. Logo en haut, un bouton d'action principale
(« Importer un CV », avec « Nouvelle mission » dans un menu `+`), une recherche qui ouvre une palette ⌘K (CV,
missions, pages), puis les entrées avec icône et compteur : Tableau de bord · CVs · Missions · Modèles ; un groupe
« Réglages » (Mes technos, Organisation, Équipe, Compétences équipe, Administration si super-admin) ; en bas,
l'utilisateur (avatar Clerk, nom, organisation) et le bascule de thème. Entrée active : `bg-primary/10
text-primary` sur `rounded-md`. Repliable en rail d'icônes (`collapsible="icon"`), hors-écran sur mobile. La
liste des CV, avec ses positionnements, ses scores et ses annulations, vit désormais sur la page **`/cvs`**.

### Pages

- `/cvs` (nouvelle) : tableau des candidats (avatar, nom, titre, statut, positionnements et meilleur score, mis à
  jour, actions), recherche, filtres par statut, import ; c'est l'ancienne liste de la barre latérale, à sa place.
- Tableau de bord : cartes KPI, panneau « Derniers positionnements » en tableau, panneaux « Pipeline des CV »,
  « À reprendre », « Distribution des scores », « Compétences demandées », sans zone creuse.
- Édition du CV, positionnement : les mêmes compositions qu'en v1, chaque bloc devenu panneau.
