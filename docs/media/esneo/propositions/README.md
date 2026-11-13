# Propositions de directions pour la landing Esneo

Quatrième agent (« designer ») de la tâche GSD `261112-27s` : des directions visuelles pour la landing, présentées
uniquement en maquettes générées par GPT Image 2.6 (aucun code, aucune modification de l'app). Les trois juges
(direction artistique, acheteur ESN, UX / mobile / accessibilité) les jugent, puis l'utilisateur choisit.

> **État au 2026-11-12 : tour 2 généré et relu.** 12 maquettes retenues (3 variantes × hero, page, mobile,
> motion), 26 images générées au total, une seule maquette régénérée. Dépense ≈ 1,30 $ (solde 19,92 $ → 18,73 $
> d'après `/v1/credits`, environ 0,05 $ l'image).

## Tour 2 — la direction de l'utilisateur

Ses mots : « Une landing page moderne avec des effets glassy comme sur iOS, du backdrop, dark first, du glow, du
sophistiqué… quelque chose d'animé. Dans le futur il servirait d'outil de prospection aussi, avec possibilité de
brancher son propre Claude via MCP ou connecteur. Bref, l'outil ultime pour le chasseur de têtes qui veut gagner
du temps sur la paperasse et passer plus de temps sur le contact humain entre ses candidats, collaborateurs et
clients. »

Ces mots priment sur DESIGN.md, sur les règles maison de l'ancienne direction et sur le brief du jury : verre
façon Liquid Glass (iOS 26 / visionOS), sombre d'abord, lumière venue d'une vraie source dans la scène,
animation signature. Restent interdits : le cliché « SaaS IA sombre » (dégradé violet-bleu, puces flottantes,
illustration réseau, comme *Deep Signal*), les rangées de cartes à icônes, les surtitres en pastilles, toute
preuve sociale, tout prix, toute marque réelle, le logo d'Anthropic ou de Claude (le mot « Claude » en texte
seulement). L'azur `#3466e6` reste la couleur d'action et la teinte de la lumière. Les fonctions futures
(prospection, « Branchez votre propre Claude » par serveur MCP ou connecteur) sont toujours marquées « Bientôt ».

| Slug | Nom | Idée de scène | Animation signature | Titre | Police |
|---|---|---|---|---|---|
| `flou` | Le flou se lève | une vraie rencontre (recruteur et candidat au café, au crépuscule) derrière une vitre givrée qui porte la paperasse | le givre recule au fil du défilement et des validations ; les cartes validées filent vers un dock ; la rencontre devient nette | « Moins de paperasse. Plus de face-à-face. » | Inter |
| `lampe` | La lampe | nature morte de nuit : bureau, lampe de laiton, pile de CV ; au-dessus, des dalles de verre qui émettent l'azur | la lampe s'allume, la feuille se lève et devient verre ; l'arête du verre suit le pointeur ; à la fin le bureau est libre, puis une poignée de main de jour | « Le papier pour l'IA. Les gens pour vous. » | Instrument Serif + Inter |
| `file-de-verre` | La file de verre | scène spatiale à la visionOS : une pièce de nuit et une file de fenêtres de verre en cover flow, la fenêtre de face éclairée | la file se lance d'un geste (élan projeté, ressort qui hérite de la vitesse, élastique en bout de file) ; la fenêtre qui s'arrête de face se dégivre | « Chassez les talents. Pas la paperasse. » | Geist |

Détail de chaque variante (matière et lumière, palette, copie complète, composition, animation pas à pas avec
ses replis `prefers-reduced-motion` et `prefers-reduced-transparency`, difficultés d'intégration) :
`<slug>/brief.md`.

Points communs à intégrer, quelle que soit la variante : `backdrop-filter` coûte cher sur mobile (trois couches
floutées visibles au plus, jamais d'animation du rayon de flou : fondu entre une couche pré-floutée et une
couche nette) ; contraste du texte à mesurer sur le pire pixel de la photo sous le verre ; la réfraction de
Liquid Glass montrée par les maquettes n'existe en CSS que dans Chromium (`backdrop-filter: url()` avec un
filtre SVG), ailleurs arêtes et reflets seulement.

### Prompts

Chaque dossier contient `_spec.txt` (bloc commun à la variante) et quatre fichiers de maquette (`hero.txt`,
`page.txt`, `mobile.txt`, `motion.txt`). Chaque fichier de maquette contient le prompt complet tel qu'il sera
envoyé : `_spec.txt` en tête, puis la description de la maquette. Génération avec `--no-style`.

| Maquette | Taille | Contenu |
|---|---|---|
| `hero` | 2048x1152 | premier écran desktop |
| `page` | 1152x2880, repli 1024x1536 | la landing entière |
| `mobile` | 1536x1024 | trois écrans de téléphone : héros, une section du milieu, l'action finale |
| `motion` | 1536x1024 | storyboard 2×2 de l'animation signature, avec légendes |

### Modèle

`openai/gpt-image-2.6-sunburst`, `--n 2` : c'est le modèle retenu au tour 1 pour sa fiabilité sur le texte
français (voir plus bas).

### Page entière

**1152x2880 accepté** par sunburst du premier coup, pour les trois variantes (pas de repli nécessaire). WebP
gardé à 1152×2880 (sous la limite de 1200 px).

### Retenues

Relecture de chaque image : marques ou logos réels, logo Anthropic ou Claude, preuve sociale, prix, texte
fautif dans les titres et boutons, autre marque qu'« esneo », fonction future sans « Bientôt », dégradé
violet-bleu, puces flottantes, illustration réseau, cartes à icônes, surtitres en pastilles. Aucune marque
réelle, aucun logo Claude, aucune preuve sociale ni aucun prix sur les 26 images. WebP q82 dans
`.media/esneo/propositions/_retenues/`.

| Maquette | `flou` | `lampe` | `file-de-verre` |
|---|---|---|---|
| hero (1600×900) | `hero-1` : les deux visages entiers, meilleure lumière | `hero-1` : la lampe éclaire le titre, apostrophe typographique | `hero-1` : du vrai texte dans toutes les fenêtres |
| page (1152×2880) | `page-r2-2` (régénérée) | `page-2` : statuts en une seule barre de verre | `page-1` : action dans la navigation, plus complète |
| mobile (1536×1024) | `mobile-1` : le givre recule d'écran en écran | `mobile-1` : titre éclairé par la lampe | `mobile-1` : sans faute |
| motion (1536×1024) | `motion-1` : les quatre temps lisibles | `motion-2` : cadrage constant, cartes lisibles | `motion-2` : montre l'élastique en bout de file |

Défauts mineurs gardés, sans incidence sur l'intégration (les fragments seront codés) : `lampe/page-2`, coquille
« téléravail » dans un petit texte d'interface ; `flou/motion-1`, copie reformulée par le modèle (« Essayer
esneo ») ; les cartes de verre de `lampe` et `file-de-verre` ont un liseré azur lumineux qui frôle l'esthétique
« SaaS IA » : à tempérer à l'intégration.

### Rejetées

| Image | Raison |
|---|---|
| `flou/page-1`, `flou/page-2` | rangée de trois cartes à icônes sous le héros (« Un CV / Une fiche de mission / Un dossier de compétences ») ; `page-1` a aussi une coquille (« métter ») et une liste numérotée 1-2-3. **Régénérée** avec un prompt corrigé (`flou/page.txt` ; ancien prompt dans `flou/page-v1.txt`) : cartes de statut sans icônes, « pas de rangée de cartes », points clés sans numéros |
| `flou/page-r2-1` | valide ; écartée au profit de `page-r2-2` (FAQ mieux tournée) |
| `flou/motion-2` | invente une navigation « Équipe » et un bouton « Demander une démo », barres grises vides |
| `file-de-verre/motion-1` | invente « Produit / Cas d'usage / Contact » et « Demander une démo » (aucun contact commercial n'existe) |
| `file-de-verre/mobile-2` | libellé corrompu (« E-mtôs ») dans la pile |
| `file-de-verre/hero-2` | trois fenêtres remplies de barres grises factices |
| autres variantes 2 (ou 1) | valides, moins bonnes que la retenue (voir tableau) |

### Commandes utilisées

Vérifier d'abord le solde :

```bash
node --env-file=.env.local -e 'fetch("https://ai-gateway.vercel.sh/v1/credits",{headers:{Authorization:"Bearer "+process.env.AI_GATEWAY_API_KEY}}).then(r=>r.text()).then(console.log)'
```

Puis, depuis la racine du dépôt (douze commandes indépendantes, à lancer trois ou quatre à la fois) :

```bash
G='node --env-file=.env.local docs/media/esneo/outils/gw-image.mjs --no-style --model openai/gpt-image-2.6-sunburst --n 2'
P=docs/media/esneo/propositions; O=.media/esneo/propositions
for s in flou lampe file-de-verre; do
  $G --prompt-file $P/$s/hero.txt   --size 2048x1152 --out $O/$s/hero
  $G --prompt-file $P/$s/page.txt   --size 1152x2880 --out $O/$s/page   # repli : --size 1024x1536
  $G --prompt-file $P/$s/mobile.txt --size 1536x1024 --out $O/$s/mobile
  $G --prompt-file $P/$s/motion.txt --size 1536x1024 --out $O/$s/motion
done
```

---

## Tour 1 — rejeté par l'utilisateur

Trois directions proposées puis rejetées par l'utilisateur au profit de la sienne (tour 2). Leurs dossiers sont
conservés pour mémoire ; **elles ne sont plus développées** (les six maquettes manquantes ne seront pas
générées).

| Slug | Nom | Thèse | Palette | Police de page |
|---|---|---|---|---|
| `surligneur` | Le surligneur | Un positionnement, c'est une demande client et un CV lus côte à côte, surligneur en main : Esneo tient le surligneur, vous gardez le dernier mot. | celle du produit : `#f1f3f6`, `#ffffff`, `#0d0e11`, azur `#3466e6` (+ `#d6e0fa`) | Newsreader + Geist |
| `avant-midi` | Avant midi | Une demande client se gagne dans la matinée : la page est cette matinée, de 9 h 02 à midi. | `#0d0e11`, aube `#1b2436`, ciel d'hiver `#c9d5e8`, `#f1f3f6`, `#ffffff`, azur | Archivo |
| `vivier` | Le vivier | Le capital d'une ESN, c'est son vivier : la page en est la planche-contact, réordonnée par chaque demande client. | ardoise `#dde2e8`, `#ffffff`, `#0d0e11`, `#273041`, azur | Geist |

### Modèle (comparaison faite au tour 1)

Sur le héros du `surligneur` (même prompt, `--n 2`, 2048×1152) : `sunburst` sans faute sur ses deux variantes ;
`flare` plus aéré et plus rapide (10 s contre 43 s) mais une variante sur deux au titre corrompu
(« Tech l̶ead »). **Modèle retenu : `openai/gpt-image-2.6-sunburst`**, parce que le texte est le critère qui fait
rejeter une maquette.

### Images du tour 1

| Image | Statut |
|---|---|
| `surligneur/hero-flare-1.png` | retenue → `_retenues/surligneur-hero.webp` (1600×900, q82) |
| `surligneur/hero-sunburst-1.png`, `-2.png` | valides, non retenues (composition serrée ; étiquettes colorées) |
| `surligneur/hero-flare-2.png` | rejetée : titre de la demande client corrompu |

Défaut commun aux quatre héros, venu du prompt : « Kafka apprécié » (accord fautif) dans le texte courant de la
demande. Copie : le bouton est écrit « Essayer sur vos CV », comme sur le site en ligne.
