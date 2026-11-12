# Brief du jury — propositions du designer (maquettes GPT Image 2.6)

**Produit.** Esneo est un SaaS français pour les ESN (sociétés de conseil IT qui placent des consultants chez des
clients). Il extrait les CVs des consultants (PDF/Word → fiche structurée), analyse les fiches de mission des clients
(points clés classés, niveau attendu, « à clarifier »), et calcule un score de positionnement consultant × mission
(pondéré, citations du CV, confiance affichée). Promesse : l'utilisateur a toujours un retour clair quand l'IA
travaille — statuts visibles, aucun doublon lancé en silence, erreurs affichées avec leur cause. « L'IA propose,
vous validez. » Cibles : ingénieurs d'affaires, chargés de recrutement, managers de consultants.

**Direction imposée par l'utilisateur (tour 2, prime sur tout le reste).** « Une landing page moderne avec des
effets glassy comme sur iOS, du backdrop, dark first, du glow, du sophistiqué… quelque chose d'animé. Dans le futur
il servirait d'outil de prospection aussi, avec possibilité de brancher son propre Claude via MCP ou connecteur.
L'outil ultime pour le chasseur de têtes qui veut gagner du temps sur la paperasse et passer plus de temps sur le
contact humain entre ses candidats, collaborateurs et clients. » Le verre, le flou d'arrière-plan, le fond sombre,
la lumière et le mouvement sont donc **voulus** : ne les pénalise pas en soi. Juge leur exécution : sophistication
contre cliché « SaaS IA sombre » (dégradé violet, puces flottantes, illustration réseau), lisibilité et contraste
du texte posé sur le verre, coût réel de `backdrop-filter` et des animations sur téléphone, repli
`prefers-reduced-motion`. La prospection et « Branchez votre propre Claude (MCP / connecteur) » n'existent pas
encore : une maquette qui les présente comme disponibles, sans libellé « Bientôt », est en faute. La cible s'élargit
aux chasseurs de têtes et recruteurs (ESN et cabinets) ; la nouvelle copie peut remplacer l'ancienne.

**Ce que tu juges.** Un quatrième agent, le designer, propose trois **variantes de cette direction** pour la landing. Ce ne
sont **pas** des pages codées : ce sont des maquettes entièrement générées par GPT Image 2.6. Pour chaque direction
`<slug>` (liste et briefs : `docs/media/esneo/propositions/README.md` et `docs/media/esneo/propositions/<slug>/brief.md`) :
- `.media/esneo/propositions/_retenues/<slug>-hero.webp` : premier écran desktop 1440 ;
- `.media/esneo/propositions/_retenues/<slug>-page.webp` : la page entière desktop ;
- `.media/esneo/propositions/_retenues/<slug>-mobile.webp` : trois écrans de téléphone ;
- `.media/esneo/propositions/_retenues/<slug>-motion.webp` : storyboard de l'animation signature en quatre images.

**Référence.** Le site actuel (direction « Le produit en action », que tu as noté 9.0 / 9.2 / 9.0 avec les deux
autres juges) : `.media/esneo/actuel/home-1440-01.jpg` … `-13.jpg`, `home-390-01.jpg` … `-13.jpg`,
`sign-in-1440.jpg`. Ouvre au moins les 3 premiers segments 1440 et 390 pour te recaler.

**Contraintes non négociables (ne pas pénaliser leur respect, pénaliser leur violation) :**
- Aucune preuve sociale n'existe (logos clients, chiffres d'usage, témoignages, notes) ; aucun prix public. Une
  maquette qui en montre est en faute.
- Aucune marque réelle (banque, client, tour d'un groupe connu) dans les images.
- Consultants, missions et membres montrés sont fictifs ; photos générées par IA, personnes fictives.
- La copie doit rester vraie : fonctions existantes = extraction de CV, analyse de mission, positionnement validé
  par l'humain, CV adapté et e-mails prêts ; tout le reste porte « Bientôt ».
- Pas de logo Anthropic / Claude (le mot « Claude » en texte seulement).
- L'azur `#3466e6` reste la couleur d'action et la lumière principale (cohérence avec l'application derrière la
  connexion).

**Comment lire une maquette générée.** Ignore les petits défauts propres à la génération d'image (micro-texte
approximatif, pixel près) ; juge la direction : l'idée, la composition, la voix typographique, le rythme, la
crédibilité, et ce qu'elle deviendrait intégrée au niveau du site actuel. Mais signale ce que l'image promet et
qu'une page réelle ne pourrait pas tenir (texte impossible à composer, photo-montage irréaliste, densité illisible
sur téléphone, effet qui ne passe qu'en image fixe).

**Barème.** **10** = exceptionnel ; **9** = premium, on l'intégrerait tel quel ; **8** = solide mais faiblesses
visibles ; **7** = bon gabarit, sans plus ; **≤ 6** = problèmes sérieux. Ne gonfle pas, ne sabre pas.

**Rends** (≤ 550 mots, en français), pour chaque variante :
1. `<slug> — NOTE : x.x/10` et `Mieux que l'actuel : oui / non / égal`
2. Deux forces, deux faiblesses (une ligne chacune).
3. Risque d'intégration fidèle : faible / moyen / fort, en une phrase.
Puis : **classement** des trois variantes (et de l'actuelle, pour mémoire), la variante que tu recommanderais
d'intégrer avec une phrase, et ce qu'il faudrait corriger dans la maquette pour qu'elle vaille 9. Ne modifie aucun
fichier.
