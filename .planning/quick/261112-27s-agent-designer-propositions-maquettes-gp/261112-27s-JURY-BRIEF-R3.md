# Brief du jury — tour 3 : la landing construite (`/apercu`)

**Produit.** Esneo, SaaS français pour les chasseurs de têtes, ingénieurs d'affaires et chargés de recrutement (ESN
et cabinets). Il extrait les CV (PDF/Word → fiche structurée), analyse les fiches de mission (points clés classés,
niveau attendu, « à clarifier »), calcule un positionnement consultant × mission (score pondéré, citations du CV,
confiance affichée), prépare le CV adapté et les e-mails, à relire. Promesse : moins de paperasse, plus de contact
humain ; « L'IA propose, vous validez » ; statuts visibles, aucun doublon lancé en silence, erreurs affichées avec
leur cause. À venir, marqués « Bientôt » : prospection, et brancher son propre Claude (MCP / connecteur).

**Direction voulue par l'utilisateur (prime sur tout).** Une **vraie landing SaaS** (il a rejeté les maquettes
précédentes : « on dirait une pub ou une affiche »), moderne, **verre façon iOS** (backdrop), **sombre d'abord**,
lumière (glow), sophistiquée, animée. Police **Albert Sans** (pas de serif), nouveau mot-symbole typographique
(pas le logo script). Le verre, le fond sombre et la lumière sont voulus : juge leur exécution (sophistication
contre cliché « SaaS IA sombre », lisibilité sur le verre, coût sur téléphone), pas leur présence.

**Construction.** Skill Hallmark : macrostructure Workbench (le produit en fenêtres de verre est le contenu
principal), nav qui devient une pilule de verre au défilement, pied à grand mot-symbole. Code :
`app/apercu/page.tsx`, `app/apercu/apercu.css`, `components/apercu/*.tsx`.

**Captures** (`.media/esneo/apercu/r1/`) : `home-1440-01.jpg` … `-09.jpg` (segments de 900 px), `home-390-01.jpg`
… `-13.jpg` (téléphone @2x, segments de 844 px), `live-1440-a-reviewed.jpg`, `-b-generating.jpg`, `-c-done.jpg`
(et `live-390-*`) : le positionnement du héros relu, en génération, terminé ; `menu-390.jpg`.
**Référence** : le site actuel, noté 9.0 / 9.2 / 9.0 par ce jury (`.media/esneo/actuel/home-1440-*.jpg`,
`home-390-*.jpg`), à dépasser.

**Contraintes non négociables (ne pas pénaliser leur respect) :** aucune preuve sociale (logos clients, chiffres
d'usage, témoignages), aucun prix, aucune certification ou région d'hébergement inventées ; consultants et missions
fictifs ; photo générée par IA légendée comme telle ; « Bientôt » sur les fonctions futures ; azur `#3466e6` =
couleur d'action. Le badge « N » de Next.js en dev est masqué.

**Barème.** **10** exceptionnel ; **9** premium, on le met en ligne tel quel ; **8** solide, faiblesses visibles ;
**7** bon gabarit ; **≤ 6** problèmes sérieux. Ne gonfle pas, ne sabre pas.

**Rends** (≤ 450 mots, en français) :
1. `NOTE : x.x/10` et `Mieux que l'actuel : oui / non / égal`
2. Trois forces (une ligne chacune).
3. Les 5 problèmes les plus importants, classés : où (fichier de capture), ce qui ne va pas, correction concrète
   (tu peux lire le code pour la préciser).
4. Ce qui plafonne la note (ce qu'il faudrait pour gagner un point).
Ne modifie aucun fichier.

## Itération r2 (captures `.media/esneo/apercu/r2/`, mêmes noms)
Annoncé par l'intégrateur, à vérifier sur les captures et dans le code plutôt qu'à croire :
- héros : conséquence réelle par type de point (point fort mis en avant ; « Le CV adapté ne survendra pas Kafka » ;
  question ajoutée à l'e-mail au consultant ; « Retiré de l'analyse ») ; vue finale « Vos décisions, appliquées »
  avec l'e-mail à Camille ; relecture et documents rendus conditionnellement, hauteur animée, 0 px de vide ;
- verre : héros flouté à 20 px, remplissage 0,5, sans voile dessous, zone de lecture foncée (4,67:1 au pire
  pixel) ; flou réservé aux vitres posées sur photo ou feuille, panneaux opaques ailleurs, aucun flou sous 60rem ;
  halos ancrés au héros et à la bande fiabilité ;
- feuilles : seule la tête dépasse, masque, `oklch(62%)`, rotation 2°, masquées sous 40rem ;
- rythme : bande fiabilité éclairée avec la photo `staffing`, étape 4 sur `esplanade`, écrans numérotés 01 → 04 avec
  fil de progression, titres d'étape plus grands, 5rem entre étapes, action finale en verre azur ;
- signature : mot-symbole du pied pleine largeur avec pastille qui respire, H1 à 6rem, chapeau sur 3 lignes,
  reflet qui glisse au défilement (`animation-timeline: view()`) ;
- données : faits vérifiés dans le code (bucket privé rangé par organisation et protégé par RLS, rôles
  administrateur / membre, passage par l'AI Gateway de Vercel, suppression des positionnements et de la fiche ;
  la suppression n'efface pas le PDF du stockage, la page ne le prétend donc pas) ; nav : Fonctionnement · Fiabilité
  · Vos données · Questions ; suite du parcours et « Sans carte bancaire » revenus ; vocabulaire (fiche de poste ou
  de mission, vivier, intercontrat, « structuré une fois, réutilisé ») ;
- survol du bouton principal à L50, bouton inactif en paper-4 / ink-2, vrais onglets dans « Documents », fil
  d'Ariane réduit au nom sur téléphone.

## Itération r3 (captures `.media/esneo/apercu/r3/`, mêmes noms)
Annoncé, à vérifier : scène du héros stable (photo à hauteur fixe, hauteur réservée sur l'état le plus haut, plus
aucun décalage en dessous) ; fin de démo au téléphone (barre collante en phase terminée, focus sur « Rejouer » sans
défilement) ; visite au téléphone (numéro en surtitre, fil masqué, fenêtres pleine largeur, plus de troncature) ;
mot-symbole du pied en `cqi` (99 % de la colonne), pastille à 0,13em ; étape 4 sur une photo existante en face à
face (`face-a-face.webp`, légendée IA) ; « Bientôt » en mini-interfaces nettes sous un givre de 4 px, pastille en
lavis azur ; jargon traduit (« Gemini 2.5 Flash (Google), via la passerelle de Vercel », « Votre assistant Claude,
branché sur Esneo »), e-mails vouvoyés, « Score inchangé » quand on écarte un point (vérifié dans le code) ;
étape 3 « Tech lead Java : 3 profils, du plus proche au moins proche » (la page mission trie déjà par score) ;
« Générer » verrouillé avec cadenas et compteur ; fil de progression en `animation-timeline`, reflet en
`transform` à partir de 60rem ; chapeau à 40rem, bords de la bande fiabilité fondus, bouton blanc aligné, voile du
menu corrigé.

## Itération r4 (captures `.media/esneo/apercu/r4/`, mêmes noms)
Annoncé, à vérifier : reflet en bande inclinée à −14°, bords fondus par masque, retiré du verre azur (planche
`sweep-board.jpg` dans le scratchpad) ; halo de la bande fiabilité recentré au téléphone ; pastille du pied plate à
0,11em ; « Bientôt » en interfaces nettes éteintes à 45 %, sans givre, schéma Claude ↔ esneo à la hauteur de la
carte voisine ; légende de la photo du héros « Avant Esneo : la soirée au téléphone à relancer des dossiers. » ;
fin de démo au téléphone avec l'aperçu de l'e-mail avant les documents ; CLS 0 (aperçu réservé sous un squelette) ;
une seule région `aria-live` ; `aria-current` + « fiche ouverte » sur la ligne de l'étape 3, note du score sans
cadre ; « Esneo le règle tâche par tâche » ; carte « Votre organisation » masquée sous 40rem ; rythme au téléphone
resserré.

## Itération r6 — bascule et alignement (captures `.media/esneo/apercu/r6/`)
Validé par l'utilisateur : la landing est maintenant sur `/` (code déplacé dans `components/landing/` et
`app/landing.css`). Nouveau dans ce tour : connexion, inscription, erreur de connexion et 404 refaites dans la même
direction (`sign-in-1440/390`, `sign-up-1440/390`, `sign-in-error-1440/390`, `404-1440/390`), et le nouveau
mot-symbole partout, y compris dans la barre latérale de l'app (`sidebar-logo-light` / `-dark`). « Vos données »
dit maintenant que la suppression efface aussi le PDF d'origine : c'est vrai, la correction est commitée
(`app/api/candidates/[id]/route.ts`, `lib/utils/candidate-storage.ts`, tests). Juge d'abord les pages
d'authentification et la 404 (au niveau de la landing ? cohérentes ? accessibles ?), puis confirme qu'il n'y a
aucune régression sur la landing (`home-*`, `live-*`, `menu-390`). Rends une note globale pour l'ensemble des pages
publiques, au même format.

## Itération r7 (captures `.media/esneo/apercu/r7/`)
Annoncé, à vérifier : `/`, connexion, inscription et 404 rendues sans attendre Clerk (h1 dans le HTML serveur,
visible sans JS ; `app/loading.tsx` racine déplacé dans les dossiers de l'app) ; vraie 404 (middleware : liste
explicite `lib/config/app-routes.ts` + `/api(.*)`, test qui échoue si une page de l'app n'est pas couverte) ;
formulaire : titre h1 « Se connecter » / « Créer votre compte », halo, `aria-label`, séparateur « ou » centré,
flèche de la landing, champs de 44 px, focus ramené sur le champ en erreur, message « Aucun compte n'utilise cette
adresse… », plus de défilement interne ; téléphone : bande photo de 9rem, formulaire visible dès l'arrivée
(375×667 : champ à 342 px, « Continuer » à 462 px) ; carte photo qui laisse voir la feuille ; textes (« fiches de
poste ou de mission », 404 « Si vous avez un compte… », légende « personnes fictives », métadonnées de `/`) ; logo
vectorisé en tracés (Albert Sans 700, crénage conservé).
