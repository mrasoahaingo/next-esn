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

Deux systèmes coexistent et restent séparés. **L'UI produit** (tout ce qui est derrière la connexion) garde
« Graphite Pro » (`app/globals.css`, jetons shadcn) : elle ne change pas. **Les pages publiques** (landing `/`,
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

La 5ᵉ direction garde ce que le jury du tour 2 a retenu : le titre de *flou* (« Moins de paperasse. Plus de
face-à-face. »), le verre posé sur la paperasse et sur les gens. Elle garde aussi la carte de positionnement
interactive de la 4ᵉ.

Construite avec Hallmark (macrostructure Workbench, registre atmosphérique « Lumen », nav N10, pied Ft1), elle a été
itérée sur six tours de jury (r1 → r5 : 7.8 / 8.4 / 8.3 → 9.2 / 9.3 / 9.2). L'utilisateur l'a validée, puis elle a
remplacé `/` en r6, avec connexion, inscription, 404 et le nouveau logo.

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
  −0,03 em, casse de phrase ; texte courant en 400. Échelle : `--text-display` (héros, deux lignes à toutes les
  largeurs), `--text-h2`, `--text-step`, `--text-h3`, `--text-lg`, `--text-base`, `--text-sm`, `--text-xs`,
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
| Héros | titre sur deux lignes, chapeau, « Essayer sur vos CV » / « Sans carte bancaire. » / « Voir comment ça marche » ; une consigne, puis la scène : photo assombrie (légende « Avant Esneo : 21 h, encore des CV à ressaisir. ») portant la fenêtre de positionnement. Hauteur de scène réservée (CLS 0) |
| Visite (Workbench) | « Du CV reçu au positionnement prêt. » ; quatre écrans numérotés 01–04, reliés par un fil qui se remplit au défilement ; chaque écran est posé sur ce qu'il remplace (CV, fiche de mission, classement, photo du face-à-face) |
| Fiabilité | bande éclairée : « L'IA propose, vous validez. », quatre engagements, et le tableau de suivi sur la photo du point staffing (« Réessayer » est cliquable) |
| Vos données | « Ce que deviennent vos CV. » : quatre faits vérifiés dans le code (espace par organisation, droits par rôle, chemin vers l'IA, suppression y compris le PDF d'origine), en quatre colonnes |
| Bientôt | deux vitres restées givrées sur une mini-interface éteinte : Prospection ; Claude branché sur Esneo via un connecteur (MCP) ; chacune marquée « Bientôt » |
| Questions | titre à gauche, accordéon à droite (empilés sur téléphone) |
| Action finale | verre teinté azur (opaque) : « Essayez Esneo sur vos propres CV. », la suite en clair, bouton clair, phrase sur l'usage des données |
| Pied (Ft1) | une ligne d'accroche et les liens, puis le mot-symbole en mât pleine largeur (taille en `cqi`), puis la ligne des mentions (photos IA, exemples fictifs) |
| Connexion / inscription | colonne du formulaire : titre « Se connecter » ou « Créer votre compte » (le seul h1 : 1,75rem au téléphone, 2rem au bureau), formulaire Clerk aligné à gauche jusqu'à « Secured by Clerk », sur un halo azur discret (hauteur réservée, CLS nul), puis la phrase sur les données. Téléphone : photo en bande de 9rem, marque en haut, la promesse réduite à une ligne discrète (`ink-2`, 400) sur le voile ; « Sans carte bancaire. » sous le titre de l'inscription ; légende IA sous le formulaire ; sur 375 × 667, le premier champ et « Continuer » sont visibles dès l'arrivée. Bureau ≥ 60rem : deux colonnes, photo pleine hauteur à gauche (marque en haut, légende en pastille à droite, vitre de 30rem en bas : promesse en 500, plus petite que le h1, et son chapeau), cadrée pour laisser voir le CV papier de la photo de connexion |
| 404 | page entière pour tout chemin inconnu (le middleware ne protège que les routes de l'app) ; téléphone : photo du couloir en tête, puis marque, « Cette page n'existe pas. », texte, « Retour à l'accueil » et « Se connecter » (« Ouvrir l'app » une fois connecté, même bascule que la landing) ; bureau : texte 5/12 à gauche, photo 7/12 à droite. Les voiles de la photo partent du papier plein (3rem) : aucune couture |

## Verre

Le verre a été demandé par l'utilisateur (dérogation explicite à l'interdit du genre). Ses règles :

- **Le flou seulement là où il réfracte quelque chose.** `.eg-glass` est par défaut un panneau opaque (arête
  spéculaire `inset`, reflet radial, ombre portée longue), sans `backdrop-filter`. Le flou n'existe qu'avec
  `.eg-glass--blur` (sur une feuille ou une photo : écrans 1, 2 et 4 de la visite, tableau de suivi) et
  `.eg-glass--photo` (fenêtre du héros, vitre des pages d'authentification au bureau), **à partir de 60rem**. En dessous, les
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
  texte rendu transparent, capture, luminance maximale sous chaque ligne). Minimum r7 : 4,84:1 sur la landing,
  9,3:1 sur la vitre des pages d'authentification, 7,7:1 pour leur légende, 9,9:1 pour la marque (flèche et
  logo, élément non textuel) sur la photo, grâce à un voile d'angle dédié.

## Mouvement

- **Signature** : la démonstration du héros. Les panneaux apparaissent en fondu ; la zone de travail glisse en
  hauteur (`transition: height`, dérogation acceptée, hauteur mesurée hors animation) quand les documents
  apparaissent.
- Le fil de la visite se remplit au défilement (`animation-timeline: view()`, `scaleY`). Repli JavaScript qui écrit
  `--p` et n'écrit `data-state` que lorsqu'il change.
- Nav : morphose barre → pilule sur `transform` et `opacity` (520 ms, `--ease-out`). Menu : entrée 220 ms.
- Apparitions de la visite (`components/landing/landing-reveal.tsx`) : chaque fenêtre part d'une opacité de 0,25
  et se pose une fois. Sans script, rien n'est masqué.
- La pastille du mot-symbole du pied respire (3,6 s).
- Durées : 120 / 220 / 420 / 520 / 900 ms ; courbes `--ease-out` `cubic-bezier(0.16, 1, 0.3, 1)`.
- `prefers-reduced-motion: reduce` : fondus de 150 ms au plus, pas de transformation, pas de respiration, pas de
  reflet ni de fil animé, défilement instantané. Le contenu est intact.

## Logo

- Le **mot-symbole** : « esneo » en minuscules, Albert Sans 700, interlettrage resserré, suivi de la **pastille de
  statut azur** `#3466e6`. C'est celle qui, dans le produit, dit qu'un traitement tourne et où il en est ; elle est
  posée comme un point.
- **Partout** : `components/esneo-full-logo.tsx` (SVG, même nom et mêmes props qu'avant). Les glyphes sont
  **vectorisés en tracés** : Albert Sans (SIL OFL 1.1), instance 700 du fichier variable du dépôt google/fonts,
  convertie avec opentype.js aux positions mesurées sur le mot-symbole de la landing (interlettrage −0,05 em,
  crénage `s` −0,008/−0,004 em, second `e` −0,01 em). Le logo ne dépend donc d'aucune police chargée et ne s'étire
  jamais. Le mot est en `currentColor` (clair en thème sombre, sombre en thème clair, via `text-foreground` par
  défaut) ; seule la pastille reste azur. Dimensionné à la largeur (`viewBox` 269,55 × 51,4) : barre latérale de
  l'app 120×23 px, centré (`w-30`) ; sélection d'organisation 240 px ; pages d'authentification 6 à 6,5rem. Les
  tracés sont exportés (`ESNEO_WORDMARK_PATH`) et servent aussi à la carte de partage (`app/opengraph-image.tsx`).
- **Variante texte** : `components/landing/esneo-wordmark.tsx` (même dessin, crénage paire par paire, taille en
  `em`), pour la nav de la landing et le mât du pied en `cqi`.
- Restent sur l'ancien dessin, hors pages et hors UI : l'icône d'onglet (`public/esneo-icon.svg`,
  `app/layout.tsx`) et le logo de repli du dossier de compétences PDF quand l'organisation n'a pas de logo
  (`public/esneo-full.svg`, `templates/cv-dossier-layout.ts`). Les tracés vectorisés permettent maintenant de
  les remplacer ; ce sont des fichiers du produit, laissés en l'état.

## Honnêteté

- Aucune preuve sociale, aucun logo client, aucun témoignage, aucun prix, aucun chiffre d'usage (`PRODUCT.md`).
- Candidats, consultants, missions et prospects affichés sont des exemples fictifs, et la page le dit (sous-titre
  de la visite, pied).
- Les photos sont générées par IA ; chacune porte sa légende (« Photographie générée par IA, personne(s)
  fictive(s) »).
- « Vos données » ne dit que ce que le code fait. Chaque fait est référencé en commentaire dans
  `components/landing/landing.tsx` : stockage privé, filtrage par organisation, rôles, Gemini 2.5 Flash via la
  passerelle de Vercel, suppression de la fiche avec son PDF d'origine.
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
| Logo | `components/esneo-full-logo.tsx`, `components/landing/esneo-wordmark.tsx` |
| Photos | `components/site/images.ts`, `public/media/esneo/` ; prompts dans `docs/media/esneo/` |
| Journal Hallmark | `.hallmark/log.json` |

Ne sont plus importés par aucune page (4ᵉ direction), conservés en attendant leur suppression :
`components/marketing/landing.tsx`, `components/site/{site-nav,hero-positioning,status-board,pipeline-pinned,reveal,carousel-hint,faq-index}.tsx`,
`app/esneo-site.css`, la police Hanken Grotesk (`app/layout.tsx`, utilisée seulement par `esneo-site.css`), et les
photos `bureau-hd`, `esplanade-hd`, `consultant-hd`, `dossier-anonyme`, `fin-ecran`, `hero.webp`.
