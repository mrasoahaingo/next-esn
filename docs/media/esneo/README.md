# Médias des pages publiques Esneo

Photos de la landing, des pages de connexion / inscription et de la page 404 (refonte du 2026-11-11, voir
`DESIGN.md`). Méthode reprise de la refonte `legal-advisor-juris-gps` (ADR-0084) : prompts figés et versionnés,
génération par l'AI Gateway, revue à l'œil de chaque image, finals en WebP.

| Fichier final (`public/media/esneo/`) | Prompt (`prompts/`) | Variante retenue | Usage |
|---|---|---|---|
| `hero-droite.webp` (2000×1125) | `hero-droite.txt` | 2 sur 2 | scène du héros (itération 5 : personne à l'extrême droite, visible à côté de la carte) |
| `hero.webp` (2000×1125) | `hero.txt` | 1 | première scène du héros, conservée pour `og-hero.jpg` |
| `staffing.webp` (1536×1024) | `staffing.txt` | 1 sur 2 | planche photo, point staffing |
| `esplanade.webp` (1024×1536) | `esplanade.txt` | 1 sur 2 | planche photo, ingénieur d'affaires |
| `consultant.webp` (1024×1536) | `consultant.txt` | 2 sur 2 | planche photo, premier jour chez le client |
| `dossier-anonyme.webp` (1536×1024) | `dossier-anonyme.txt` | 1 sur 2 | grande case des preuves (dossier anonymisé, sans portrait) |
| *(retirée)* | `salle.txt` | 1 sur 2 | tuile d'action des itérations 1-2, remplacée par `fin.webp` |
| `fin.webp` (1024×1536) | `fin.txt` | 2 sur 2 | tuile d'action (itération 3) |
| `connexion-cour.webp` (1024×1536) | `connexion-b.txt` | 1 sur 2 | `/sign-in` (itération 3 : sans tour Eiffel) |
| `inscription.webp` (1024×1536) | `inscription.txt` | 2 sur 2 | `/sign-up` |
| `bureau.webp` (1024×1024) | `bureau.txt` | 2 sur 2 | scène du fragment épinglé « en quatre temps » |
| `couloir.webp` (2000×1125) | `couloir.txt` | 2 sur 2 | page 404 |

Itération 7 : sources HD (`esplanade-hd`, `consultant-hd` en 4:3 à 2048 px, `bureau-hd` à 2048 px, prompts
`*-4x3.txt` et `bureau.txt`) et photo de fin `fin-ecran.webp` (`fin-ecran.txt`), qui remplacent les versions
précédentes.

Chemins, dimensions et textes de remplacement : `components/site/images.ts` (source unique). Une image
remplacée change de nom de fichier : `/_next/image` et le CDN la mettent en cache par URL.

## Règles

- Modèle : **GPT Image 2.6 Flare** (`openai/gpt-image-2.6-flare`) via l'AI Gateway Vercel, qualité `high`.
- Chaque prompt se termine par le bloc commun `prompts/_style.txt` : photo éditoriale réaliste du monde des ESN à
  Paris (La Défense, bureaux haussmanniens, sièges de clients), étalonnage graphite et azur, fin d'automne sans
  neige, peau réelle, **aucun texte lisible**, aucun logo, aucune enseigne.
- Personnes **fictives et anonymes** : jamais nommées, jamais présentées comme des clients, des utilisateurs ou
  l'équipe. Mention visible sur la page : « Photographies générées par IA : scènes d'illustration, personnes
  fictives. » (sous la planche photo, dans le pied de page et sur les pages d'authentification).
- Chaque image est relue à l'œil (mains, texte fantôme, architecture) avant d'être retenue.

## Outil

`outils/gw-image.mjs`, depuis la racine du dépôt ; la clé `AI_GATEWAY_API_KEY` est lue par Node dans `.env.local` :

```bash
node --env-file=.env.local docs/media/esneo/outils/gw-image.mjs \
  --prompt-file docs/media/esneo/prompts/hero.txt --size 2048x1152 --n 2 --out .media/esneo/hero
```

Bruts PNG et journal `prompts.jsonl` dans `.media/esneo/` (ignoré par git). Conversion en WebP q80, 2000 px au
plus, avec `sharp`. Le 2026-11-11 : 35 photos et 10 planches d'inspiration générées, environ 10 s chacune.
