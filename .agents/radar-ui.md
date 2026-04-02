# Radar Prospect — Guide UX/UI

## Philosophie de design

Cette app est un outil de travail quotidien pour des commerciaux/recruteurs d'ESN. Ils l'ouvrent chaque matin à 8h30 pendant 15 à 30 minutes. Le design doit être rapide à scanner (pas d'éléments décoratifs), orienté action (chaque écran doit mener à une action : appeler, envoyer un mail, creuser une fiche), et dense en information sans être surchargé.

### Direction esthétique

- **Ton** : Utilitaire-raffiné. Penser Bloomberg Terminal rencontre Linear. Dense mais aéré. Aucune décoration inutile.
- **Densité** : Haute — beaucoup d'info par écran, mais hiérarchisée clairement par la typographie et l'espacement.
- **Couleurs** : Fonctionnelles, jamais décoratives. Les couleurs codent la chaleur du prospect (du bleu froid au rouge brûlant) et la source du signal (un code couleur constant).
- **Typographie** : Inter pour le body (lisibilité maximale à petite taille), JetBrains Mono pour les chiffres/métriques. Pas de serif.
- **Coins arrondis** : `rounded-lg` (8px) partout. Pas de sharp corners, pas de full-round sauf avatars.
- **Borders** : Très fines (1px, `border-gray-200` en light, `border-gray-800` en dark). Jamais de box-shadow sauf focus rings.
- **Mode sombre** : Obligatoire dès le premier jour. Toutes les couleurs via Tailwind `dark:` variants.

### Code couleur — Chaleur prospect (constant dans toute l'app)

```
Brûlant (80-100) : bg-red-50 text-red-800 / dark:bg-red-950 dark:text-red-200
Chaud (60-79)    : bg-orange-50 text-orange-800 / dark:bg-orange-950 dark:text-orange-200
Tiède (30-59)    : bg-amber-50 text-amber-800 / dark:bg-amber-950 dark:text-amber-200
Froid (0-29)     : bg-gray-100 text-gray-600 / dark:bg-gray-800 dark:text-gray-400
```

### Code couleur — Sources de signaux (constant dans toute l'app)

```
Offres d'emploi  : bg-blue-50 text-blue-800 / dark:bg-blue-950 dark:text-blue-200
LinkedIn         : bg-emerald-50 text-emerald-800 / dark:bg-emerald-950 dark:text-emerald-200
Marchés publics  : bg-amber-50 text-amber-800 / dark:bg-amber-950 dark:text-amber-200
Presse           : bg-pink-50 text-pink-800 / dark:bg-pink-950 dark:text-pink-200
Vivier (match)   : bg-violet-50 text-violet-800 / dark:bg-violet-950 dark:text-violet-200
```

### Composants Tailwind réutilisables

Créer ces classes utilitaires via `@apply` ou comme composants React :

```
pill : inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium
card : bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg
stat-card : bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4
metric-value : text-2xl font-semibold tabular-nums tracking-tight
section-header : text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium
```

---

## Écran 1 — Dashboard principal (`app/(dashboard)/radar/page.tsx`)

C'est l'écran d'atterrissage. Le recruteur doit voir en 3 secondes : combien de prospects chauds, quels sont les top prospects, et quelles actions sont en attente.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header bar                                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Stat card │ │ Stat card │ │ Stat card │ │ Stat card │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                               │
│  ┌ Quick filters (pills) ─────────────────────────────────┐  │
│  │ [Tous] [Banque 12] [Assurance 8] [Énergie 6] [+5]     │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌ Heat filters ──────────────────────────────────────────┐  │
│  │ [🔴 Brûlant 7] [🟠 Chaud 14] [🟡 Tiède 23] [⚪ Froid] │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌ Advanced filters row ──────────────────────────────────┐  │
│  │ Technos [select]  Ville [select]  Taille [select]      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Result bar ────────────────────────────────────────────┐  │
│  │ 48 prospects trouvés          Tri: score décroissant ▼ │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Prospect card ─────────────────────────────────────────┐  │
│  │  [SG] Société Générale — ITEC        92/100  brûlant   │  │
│  │  Banque · La Défense · 45 000 emp.                      │  │
│  │  [12 offres Java] [8 externes] [AO transfo] [+1]      │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌ Prospect card ─────────────────────────────────────────┐  │
│  │  [AX] AXA France — DSI              78/100  chaud      │  │
│  │  ...                                                    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ... (liste scrollable)                                      │
└──────────────────────────────────────────────────────────────┘
```

### Détails composants

#### Header bar

```
- Titre "Radar prospect" (text-lg font-semibold)
- Sous-titre dynamique : "{date} — {n} nouveaux signaux aujourd'hui" (text-sm text-gray-500)
- Bouton "Paramètres" (icône Settings, lien vers /radar/settings)
```

#### Stat cards (grille 4 colonnes sur desktop, 2 sur mobile)

4 métriques clés, chacune dans un `stat-card` :

```
1. "Prospects chauds" — nombre en rouge (uniquement heat=burning+hot)
2. "Nouveaux signaux" — nombre des signaux détectés dans les dernières 24h
3. "Matchs vivier" — nombre de matchs consultant actifs
4. "Actions en attente" — nombre d'actions avec outcome=pending
```

Le nombre utilise `metric-value`. Le label utilise `section-header` sans uppercase, text-sm.

#### Filtres rapides par secteur (pills horizontaux)

- Pill "Tous" toujours visible, sélectionné par défaut
- Chaque secteur est un pill avec le nombre de prospects entre parenthèses : "Banque (12)"
- Multi-select : cliquer un secteur l'active (couleur violet), re-cliquer le désactive
- Les compteurs se mettent à jour dynamiquement quand d'autres filtres sont actifs
- Pill actif : `bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900 dark:text-violet-200`
- Pill inactif : `bg-white border-gray-200 text-gray-600 hover:border-gray-300`
- Si plus de 8 secteurs, afficher les 7 premiers + pill "+N" qui ouvre un dropdown

#### Filtres chaleur (pills horizontaux, ligne séparée)

- 4 pills fixes : Brûlant, Chaud, Tiède, Froid
- Chaque pill utilise le code couleur chaleur défini plus haut
- Même logique multi-select que les secteurs
- Le compteur indique le nombre de prospects à ce niveau

#### Filtres avancés (ligne de selects inline)

3 selects natifs côte à côte :
```
Technos : Toutes | Java/Spring | Angular/React | DevOps/Cloud | Data/IA | .NET/C#
Ville   : Toutes | Paris/IDF | Lyon | Toulouse | Nantes | Bordeaux | Lille
Taille  : Toutes | +5 000 emp. | 500-5 000 | 50-500
```

Quand au moins un filtre est actif, afficher un bandeau sous les filtres :
```
bg-blue-50 dark:bg-blue-900/30 — "Filtres modifiés" + bouton "Sauvegarder comme défaut" + bouton "Réinitialiser"
```

La sauvegarde persiste dans `user.preferences` (JSONB dans la table users Clerk metadata ou Supabase).

#### Barre de résultats

```
Gauche : "{n} prospect{s} trouvé{s}" — text-sm text-gray-500
Droite : "Tri: score décroissant ▼" — select ou dropdown avec options :
  - Score décroissant (défaut)
  - Dernier signal (plus récent d'abord)
  - Nombre de signaux
  - Alphabétique
```

#### Carte prospect (composant `prospect-card.tsx`)

C'est LE composant le plus important. Il doit être scannable en 1 seconde.

```tsx
// Structure de la carte
<div className="card p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer">
  {/* Ligne 1 : Avatar + Nom + Score */}
  <div className="flex items-center gap-3">
    {/* Avatar initiales */}
    <div className="w-9 h-9 rounded-full bg-{heat-color}-100 text-{heat-color}-800 flex items-center justify-center text-xs font-medium shrink-0">
      SG
    </div>
    {/* Nom + meta */}
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium truncate">Société Générale — ITEC</p>
      <p className="text-xs text-gray-500">Banque · La Défense · 45 000 emp.</p>
    </div>
    {/* Score */}
    <div className="text-right shrink-0">
      <div className="text-lg font-semibold tabular-nums text-{heat-color}-700">92</div>
      <div className="text-xs text-gray-400">score</div>
    </div>
  </div>

  {/* Ligne 2 : Pills signaux */}
  <div className="flex flex-wrap gap-1.5 mt-2.5">
    <span className="pill bg-{heat-bg} text-{heat-text}">brûlant</span>
    <span className="pill bg-blue-50 text-blue-800">12 offres Java</span>
    <span className="pill bg-emerald-50 text-emerald-800">8 externes</span>
    <span className="pill bg-amber-50 text-amber-800">AO transfo</span>
    <span className="pill bg-pink-50 text-pink-800">nouveau DSI</span>
    <span className="pill bg-violet-50 text-violet-800">3 matchs vivier</span>
  </div>
</div>
```

- La carte est cliquable → navigue vers `/radar/{companyId}`
- La carte sélectionnée (si vue split-panel sur desktop) a `border-blue-500 border-2`
- Couleur de l'avatar = couleur de chaleur du prospect
- Les pills sont tronqués à 5 max. Si plus, afficher "+N" dans un pill gris
- L'ordre des pills : heat level en premier, puis par poids décroissant des signaux

---

## Écran 2 — Fiche prospect détaillée (`app/(dashboard)/radar/[companyId]/page.tsx`)

C'est l'écran le plus riche. Le recruteur passe 2-3 minutes dessus avant de lancer une action. Il doit comprendre immédiatement POURQUOI ce prospect est chaud et QUOI faire.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ┌ Header prospect ───────────────────────────────────────┐  │
│  │  [SG] Société Générale — ITEC       [brûlant]    92   │  │
│  │  Banque · La Défense · 45 000 emp. · SIREN 552120222  │  │
│  │  [Java] [Angular] [Spring Boot] [DevOps]              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Stat cards (4 colonnes) ───────────────────────────────┐  │
│  │ Signaux: 5  │ Externes: 8  │ Matchs: 3  │ Dernier: 2h │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Score breakdown (card) ────────────────────────────────┐  │
│  │  Offres d'emploi    ████████████████████████████  25   │  │
│  │  Marchés publics    ████████████████████████████  25   │  │
│  │  Externes LinkedIn  ██████████████████████░░░░░  20   │  │
│  │  Presse / timing    ███████████████░░░░░░░░░░░  15   │  │
│  │  Match vivier       ███████████████░░░░░░░░░░░  15   │  │
│  │  ───────────────────────────────────────────────────   │  │
│  │  Sous-total: 100  [Bonus convergence x5: +35 pts]     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Signal timeline (card) ────────────────────────────────┐  │
│  │  [OE] 12 offres Java/Angular publiées        +25  2h  │  │
│  │       Indeed (7), APEC (3), WttJ (2)                   │  │
│  │  ─────────────────────────────────────────────         │  │
│  │  [LI] 8 consultants externes identifiés      +20 hier │  │
│  │       Capgemini (3), Sopra (2), Atos (2)               │  │
│  │  ─────────────────────────────────────────────         │  │
│  │  [MP] AO transformation digitale             +25  3j  │  │
│  │       BOAMP réf. 2026-0342 · Budget 2,4M€             │  │
│  │  ... (liste complète des signaux)                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Consultants proposés (card) ───────────────────────────┐  │
│  │  [ML] Marie Lambert         Java Senior    94%         │  │
│  │       8 ans · Env. bancaire · TJM 550€ · [Dispo]      │  │
│  │  ─────────────────────────────────────────────         │  │
│  │  [TN] Thomas Nguyen         Angular Mid    87%         │  │
│  │       4 ans · Fintech · TJM 420€ · [Dispo 15/04]      │  │
│  │  ... (matchs triés par score décroissant)              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Brief IA (card) ──────────────────────────────────────┐  │
│  │  Généré il y a 2h · Claude API                 [🔄]   │  │
│  │  ┌ bg-gray-50 rounded ───────────────────────────────┐ │  │
│  │  │ **Contexte :** La SG-ITEC recrute massivement...  │ │  │
│  │  │ **Opportunité :** L'arrivée de Jean-Marc Dupont...│ │  │
│  │  │ **Angle recommandé :** Proposer Marie Lambert...  │ │  │
│  │  └───────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Historique actions (card) ─────────────────────────────┐  │
│  │  28/03  Fiche créée automatiquement         [auto]     │  │
│  │  28/03  Brief IA généré                     [IA]       │  │
│  │  ──     En attente de votre action...                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌ Actions rapides ──────────────────────────────────────┐  │
│  │  [Générer email] [Message LinkedIn] [Fiche consultant] │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Composants détaillés

#### Header prospect

```tsx
<div className="flex items-center gap-4 mb-6">
  {/* Avatar large */}
  <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 flex items-center justify-center text-lg font-semibold shrink-0">
    SG
  </div>
  <div className="flex-1 min-w-0">
    <div className="flex items-center gap-2 flex-wrap">
      <h1 className="text-xl font-semibold">Société Générale — ITEC</h1>
      <span className="pill bg-red-50 text-red-800">brûlant</span>
    </div>
    <p className="text-sm text-gray-500 mt-0.5">
      Banque d'investissement · La Défense · 45 000 employés · SIREN 552 120 222
    </p>
    {/* Pills technos */}
    <div className="flex gap-1.5 mt-2">
      <span className="pill bg-blue-50 text-blue-700">Java</span>
      <span className="pill bg-blue-50 text-blue-700">Angular</span>
      <span className="pill bg-blue-50 text-blue-700">Spring Boot</span>
    </div>
  </div>
  {/* Score grand */}
  <div className="text-center shrink-0">
    <div className="text-4xl font-semibold tabular-nums text-red-700 dark:text-red-400 leading-none">92</div>
    <div className="text-xs text-gray-400 mt-1">/ 100</div>
  </div>
</div>
```

#### Score breakdown (`score-breakdown.tsx`)

Chaque source a une barre de progression colorée selon la source du signal, le nombre de points à droite, et le nom de la source à gauche.

```
Structure par ligne :
[label 120px fixe]  [barre flex-1 h-1.5 rounded-full]  [points 40px texte droit]
```

- La barre utilise la couleur de la source (bleu pour offres, vert pour LinkedIn, etc.)
- La largeur de la barre = `(points / 25) * 100%`
- Sous les barres, un separator + ligne résumé : "Sous-total: {n} pts" à gauche, pill bonus convergence à droite
- Le pill bonus est en `bg-orange-50 text-orange-800` et affiche "Bonus convergence x{n}: +{pts} pts"

#### Signal timeline (`signal-timeline.tsx`)

Liste verticale de signaux, triés par date (plus récent en haut). Chaque signal :

```tsx
<div className="flex gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
  {/* Icône source (carré arrondi avec initiales) */}
  <div className="w-8 h-8 rounded-md bg-{source-color}-50 text-{source-color}-800 flex items-center justify-center text-xs font-medium shrink-0">
    OE {/* OE=offres, LI=linkedin, MP=marchés, PR=presse, VI=vivier */}
  </div>

  {/* Contenu */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium">12 offres Java/Angular publiées</p>
    <p className="text-xs text-gray-500 mt-0.5">
      Indeed (7), APEC (3), WttJ (2) · CDI et freelance · TJM 450-650€
    </p>
  </div>

  {/* Points + temps */}
  <div className="text-right shrink-0">
    <div className="text-sm font-medium">+25 pts</div>
    <div className="text-xs text-gray-400">il y a 2h</div>
  </div>
</div>
```

Les initiales de l'icône source sont :
- OE = Offres Emploi (bleu)
- LI = LinkedIn (emerald)
- MP = Marchés Publics (amber)
- PR = Presse (pink)
- VI = Vivier (violet)

#### Consultants proposés (`consultant-matches.tsx`)

Liste de matchs consultant, triés par `matchScore` décroissant.

```tsx
<div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
  {/* Avatar initiales */}
  <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 text-violet-800 dark:text-violet-200 flex items-center justify-center text-xs font-medium shrink-0">
    ML
  </div>

  {/* Info consultant */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium">Marie Lambert</p>
    <p className="text-xs text-gray-500">Java Senior · 8 ans exp. · Env. bancaire (BNP, CA)</p>
    <div className="flex gap-1.5 mt-1">
      <span className="pill bg-green-50 text-green-700">Disponible</span>
      <span className="pill bg-gray-100 text-gray-600">TJM 550€</span>
    </div>
  </div>

  {/* Score match */}
  <div className="text-right shrink-0">
    <div className="text-base font-semibold text-emerald-700 dark:text-emerald-400">94%</div>
    <div className="text-xs text-gray-400">Best match</div>
  </div>
</div>
```

Pills de disponibilité :
```
Disponible    : bg-green-50 text-green-700
Dispo le {date} : bg-amber-50 text-amber-700
En mission    : bg-gray-100 text-gray-500
```

#### Brief IA (`ai-brief.tsx`)

Le brief utilise le Vercel AI SDK `useChat` pour streamer la réponse.

```tsx
// Structure du composant
<div className="card p-4">
  {/* Header */}
  <div className="flex items-center justify-between mb-3">
    <h3 className="section-header">Brief IA</h3>
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Généré il y a 2h · Claude API</span>
      <button className="text-xs text-gray-400 hover:text-gray-600">Régénérer</button>
    </div>
  </div>

  {/* Contenu du brief */}
  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm leading-relaxed">
    {/* Le texte streame ici. Les mots apparaissent un par un. */}
    {/* Format attendu du brief : */}
    {/* **Contexte :** paragraphe */}
    {/* **Opportunité :** paragraphe */}
    {/* **Angle recommandé :** paragraphe */}
  </div>
</div>
```

Pendant le streaming :
- Afficher un curseur clignotant (petit carré `w-2 h-4 bg-gray-400 animate-pulse inline-block`)
- Le bouton "Régénérer" est désactivé pendant le streaming
- L'animation est un fade-in par mot, pas par caractère

État initial (avant génération) :
- Afficher un bouton "Générer le brief" centré dans la zone grise
- Le clic déclenche l'appel API + streaming

#### Historique actions

Liste chronologique inversée (plus récent en haut). Chaque action a un dot coloré, une date, un texte, et un pill de type.

```
Types de pills :
auto     : bg-gray-100 text-gray-500
IA       : bg-violet-50 text-violet-700
email    : bg-blue-50 text-blue-700
appel    : bg-green-50 text-green-700
linkedin : bg-emerald-50 text-emerald-700
meeting  : bg-amber-50 text-amber-700
```

La dernière ligne est toujours un placeholder en opacité réduite :
```
"— En attente de votre action..." en italic, text-gray-400, opacity-50
```

#### Barre d'actions rapides

Barre horizontale fixe en bas de la fiche ou juste après l'historique. Boutons `outline` style :

```tsx
<div className="flex gap-2 flex-wrap">
  <button>Générer email de prospection</button>
  <button>Message LinkedIn DSI</button>
  <button>Fiche consultant {nom}</button>
  <button>Marquer comme contacté</button>
  <button className="text-gray-400">Ignorer ce prospect</button>
</div>
```

- Les 3 premiers boutons déclenchent une génération IA (ouvrent un panel/modal avec le résultat streamé)
- "Marquer comme contacté" ouvre un petit formulaire inline : type d'action (select) + note optionnelle (input)
- "Ignorer" est visuellement atténué et crée une action de type "dismissed"

---

## Écran 3 — Paramètres Radar (`app/(dashboard)/radar/settings/page.tsx`)

Écran de configuration par tenant. L'admin ESN configure ses sources, ses seuils, et ses filtres par défaut.

### Sections

#### Sources actives

Toggle on/off pour chaque source avec indicateur de dernière collecte :

```
[✓] Offres d'emploi     Dernière collecte : il y a 3h    [Configurer]
[✓] Marchés publics      Dernière collecte : hier         [Configurer]
[✓] LinkedIn             Dernière collecte : hier         [Configurer]
[ ] Presse               Non configuré                    [Configurer]
```

Le bouton "Configurer" ouvre un panel avec les paramètres spécifiques :
- Offres : queries de recherche (liste éditable de termes), fréquence
- BOAMP : mots-clés IT à filtrer, budget minimum
- LinkedIn : URLs d'entreprises à surveiller
- Presse : flux RSS sources (URLs)

#### Seuils de scoring

Sliders ou inputs numériques pour ajuster les seuils de chaleur :
```
Brûlant : >= [80] pts
Chaud   : >= [60] pts
Tiède   : >= [30] pts
```

#### Poids des sources

Sliders pour ajuster les poids de chaque source (défaut rappelé) :
```
Offres d'emploi   : [25] pts (défaut: 25)
Marchés publics   : [25] pts (défaut: 25)
LinkedIn          : [20] pts (défaut: 20)
Presse            : [15] pts (défaut: 15)
Match vivier      : [15] pts (défaut: 15)
```

#### Notifications

```
[✓] Email digest matinal        Heure: [08:30]  Destinataires: [emails]
[ ] Alertes Slack                Canal: [#prospection]
[✓] Dashboard temps réel        Seuil alerte: [60] pts
```

---

## Composant — Génération d'email (modal/panel)

Quand le recruteur clique "Générer email de prospection", un panel slide depuis la droite (ou un modal) avec :

### Layout du panel

```
┌──────────────────────────────────────────┐
│  Générer un message de prospection    [X] │
│                                           │
│  Type:  [Email ▼]  (email/linkedin/autre) │
│                                           │
│  ┌ Variante 1 ─────────────────────────┐ │
│  │ [Approche directe valeur]            │ │
│  │ Objet: 3 profils Java/Angular...     │ │
│  │                                      │ │
│  │ Bonjour,                             │ │
│  │ Je me permets de vous contacter...   │ │
│  │                                      │ │
│  │ [Copier] [Ouvrir dans Mail]          │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  ┌ Variante 2 ─────────────────────────┐ │
│  │ [Approche contextualisée DSI]        │ │
│  │ ...                                  │ │
│  └──────────────────────────────────────┘ │
│                                           │
│  ┌ Variante 3 ─────────────────────────┐ │
│  │ [Approche réseau courte]             │ │
│  │ ...                                  │ │
│  └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- L'IA génère 2-3 variantes avec des angles différents
- Chaque variante a un label court (pill coloré), un objet, et le corps du message
- Boutons "Copier" (copie dans le presse-papier) et "Ouvrir dans Mail" (mailto:)
- Un clic sur "Copier" crée automatiquement une action "email_sent" dans l'historique

---

## Responsive design

### Desktop (>= 1024px)
- Dashboard : layout pleine largeur, stat cards en 4 colonnes, cartes prospects en liste
- Fiche prospect : colonne unique scrollable avec toutes les sections empilées

### Tablette (768-1023px)
- Stat cards passent en 2 colonnes
- Les filtres avancés passent sur 2 lignes
- Les boutons d'action passent en 2 colonnes

### Mobile (< 768px)
- Stat cards en 2 colonnes, plus compactes (nombre seul, pas de label)
- Filtres secteur scrollable horizontalement (masquer les compteurs)
- Filtres avancés dans un sheet/drawer "Filtres" avec un bouton trigger
- Cartes prospects : layout identique mais sans les pills au-delà de 3
- Fiche prospect : sections collapsibles (seul le score breakdown et le brief sont ouverts par défaut)
- Barre d'actions : bouton principal "Contacter" + menu "..." pour les autres

---

## Micro-interactions et animations

### Transitions
- Changement de filtre : la liste de prospects fait un `transition-all duration-200` (re-tri fluide)
- Carte prospect hover : `border-color` transition 150ms
- Pills toggle : `background-color` et `color` transition 150ms

### Streaming du brief IA
- Les mots apparaissent avec un très léger fade-in (`opacity 0→1` sur 100ms)
- Le curseur clignotant à la fin du texte en cours de génération
- Quand le streaming est terminé, le curseur disparaît avec un fade-out

### Score animation
- Quand la fiche s'ouvre, les barres du score breakdown s'animent de 0% à leur valeur finale (300ms ease-out, délai progressif de 50ms entre chaque barre)
- Le nombre du score principal fait un count-up de 0 à la valeur finale (400ms)

### Notifications
- Quand un nouveau signal est détecté en temps réel, une notification toast apparaît en haut à droite
- Toast : `bg-white border-l-4 border-{source-color}` avec le titre du signal et le nom de l'entreprise
- Auto-dismiss après 5 secondes, ou clic pour naviguer vers la fiche

---

## États vides et edge cases

### Aucun prospect trouvé (filtres trop restrictifs)
```
Centré verticalement dans la zone de liste :
Icône : Search (lucide-react) en gray-300, taille 48px
Titre : "Aucun prospect ne correspond à ces filtres"
Sous-titre : "Essayez d'élargir vos critères ou de réinitialiser les filtres"
Bouton : "Réinitialiser les filtres"
```

### Aucun signal (nouveau tenant, collecte pas encore lancée)
```
Icône : Radar (lucide-react) en gray-300, taille 48px
Titre : "Le radar est en cours de calibrage"
Sous-titre : "La première collecte de signaux est en cours. Les résultats apparaîtront dans quelques minutes."
Progress bar indéterminée sous le texte
```

### Brief IA pas encore généré
```
Dans la card brief, au lieu du contenu :
Bouton centré : "Générer le brief pour cette entreprise" (style primary)
Sous le bouton : "~15 secondes · Claude analysera les 5 signaux détectés"
```

### Erreur de collecte
```
Dans les paramètres, à côté de la source en erreur :
Pill rouge : "Erreur"
Tooltip ou texte : "La dernière collecte a échoué : {raison}. Prochaine tentative dans 6h."
```

---

## Icônes

Utiliser `lucide-react` pour toutes les icônes. Icônes clés :

```
Radar / Dashboard     : <Radar />
Prospect card         : <Building2 />
Signaux              : <Zap />
Score                : <TrendingUp />
Consultants          : <Users />
Brief IA             : <Sparkles />
Email                : <Mail />
LinkedIn             : <Linkedin /> (ou <MessageSquare />)
Paramètres           : <Settings />
Filtres              : <Filter />
Recherche            : <Search />
Notifications        : <Bell />
Actions              : <CheckCircle />
Téléphone            : <Phone />
Calendrier/Meeting   : <Calendar />
Ignorer              : <XCircle />
Régénérer            : <RefreshCw />
Copier               : <Copy />
External link        : <ExternalLink />
```

Taille par défaut : `w-4 h-4` (16px). Dans les stat cards : `w-5 h-5`. Jamais plus grand sauf écrans vides.

---

## Règles UI/UX à respecter

1. **Chaque nombre doit être `tabular-nums`** — les chiffres dans les scores, métriques, et compteurs doivent utiliser `font-variant-numeric: tabular-nums` pour que les colonnes s'alignent quand les valeurs changent
2. **Les pills ne dépassent jamais 5 par carte** — au-delà, afficher "+N" dans un pill gris
3. **Le score est toujours visible** — dans le dashboard comme dans la fiche, le score numérique est toujours visible sans scroller
4. **Le code couleur est sacré** — ne jamais utiliser une couleur de source pour autre chose, ne jamais mélanger le code couleur chaleur avec le code couleur source
5. **Les filtres sont persistants** — quand le recruteur revient sur le dashboard, il retrouve ses derniers filtres actifs (via URL search params ou préférences Supabase)
6. **Le brief IA est à la demande** — ne pas le pré-générer (coût tokens), mais une fois généré, le cacher pour la session
7. **Les actions créent toujours un historique** — chaque clic sur un bouton d'action crée une entrée dans `radar_actions`. Le recruteur ne doit pas pouvoir agir sans que ce soit tracé (c'est le feedback loop)
8. **Le temps est relatif** — afficher "il y a 2h", "hier", "il y a 3j", jamais de dates absolues sauf si > 7 jours. Utiliser une lib comme `date-fns` ou `timeago.js`
9. **Le dark mode n'est pas un afterthought** — toutes les couleurs de fond custom doivent avoir leur variante dark. Les pills, les barres de score, les avatars, tout.
10. **Mobile-first dans le CSS, desktop-first dans la conception** — les maquettes sont pensées desktop car c'est l'usage principal, mais le CSS part du mobile et ajoute les breakpoints vers le haut