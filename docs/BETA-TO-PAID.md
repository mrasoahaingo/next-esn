# Beta → Paid : Playbook de transition

> **Date** : 2026-03-22
> **Contexte** : 2-3 commerciaux invités en beta gratuite, aucune restriction dans le code.
> **Objectif** : Valider la valeur, convertir en clients payants, ajouter des modules au fil des versions.

---

## 1. Situation actuelle

| Élément | État |
|---------|------|
| Produit | Beta fonctionnelle, pas de limite d'usage |
| Utilisateurs | 2-3 commerciaux ESN en onboarding |
| Monétisation | Aucune — accès gratuit total |
| Restrictions techniques | Aucune dans le code |
| Vitesse de dev | Élevée (Claude Code) — fix et features livrables en heures |

**Le principe** : le gratuit est une **faveur temporaire avec contrepartie** (feedback), pas la normalité. La transition est annoncée dès le jour 1.

---

## 2. Stratégie en 2 phases

```
Phase 1 — USAGE & FEEDBACK          Phase 2 — PRICING & CONVERSION
Semaines 1-3                         Semaine 4
──────────────────────────── ► ────────────────────────────
Jour 1 : onboarding live             Call pricing avec métriques réelles
Continu : usage sur vraies missions   Offre Early Adopter
Continu : feedback WhatsApp           Conversion ou sortie gracieuse
Continu : fix & features en temps     Stripe + facturation
         réel (Claude Code)
                                     Condition de passage :
                                     10+ positionnements réalisés
                                     + verbatim positif exprimé
```

**Pourquoi 2 phases, pas 4** : avec 2-3 testeurs et une vélocité de dev élevée, les phases d'onboarding et de feedback ne sont pas séquentielles — elles sont simultanées. Le testeur utilise, il remonte, tu fixes, il re-utilise. La boucle tourne en continu.

**La condition de passage au pricing n'est pas une date — c'est un seuil** :
- **10+ positionnements réalisés** (preuve d'usage réel, pas un test)
- **Au moins 1 verbatim positif spontané** ("je ne reviens pas en arrière", "j'ai fait ça en 5 min")
- **Au moins 1 fix livré suite à son feedback** (il a contribué au produit)

Si ces conditions sont atteintes en 2 semaines, tu passes au pricing en semaine 3. Si c'est pas atteint en 3 semaines, le problème est ailleurs (produit, profil du testeur, pas assez de missions en cours).

---

## 3. Phase 1 — Usage & Feedback (Semaines 1-3)

### 3.1 Jour 1 : Invitation + cadrage

Le message pose le cadre. Pas "c'est gratuit", mais **"tu fais partie des 3 premiers testeurs"**.

**Template de message d'invitation** :

> Salut [Prénom],
>
> Je t'invite à tester Esneo en avant-première. C'est un outil IA que je développe pour accélérer le positionnement de profils en ESN — extraction CV, matching avec les offres, génération de mails et CVs adaptés.
>
> **Ce que tu obtiens** :
> - Accès complet et illimité pendant la phase de test
> - Les nouvelles features en priorité
> - Un canal direct avec moi pour tout retour
>
> **Ce que j'attends** :
> - Que tu l'utilises sur tes vraies missions (pas juste un test)
> - Tes retours en continu (WhatsApp, pas de formalisme)
> - Ton honnêteté : ce qui marche, ce qui ne marche pas, ce qui manque
>
> **La phase de test dure 3-4 semaines.** Ensuite on parle de la suite — avec un tarif fondateur que personne d'autre n'aura.
>
> Voici ton lien : [lien]
>
> On fait un call de 20 min cette semaine ? Je te montre le workflow complet sur un de tes vrais CVs.

**Point clé** : la phrase "3-4 semaines" ancre la durée limitée dès le premier message. Pas de surprise quand le pricing arrive.

### 3.2 Call d'onboarding (20 min)

**Ce n'est pas une démo — c'est un premier positionnement ensemble sur une vraie mission.**

| Étape | Durée | Objectif |
|-------|-------|----------|
| Comprendre son quotidien | 5 min | Comment il gère ses CVs aujourd'hui ? Combien de positionnements/semaine ? Quels outils ? Quels pain points ? **Noter la baseline.** |
| Positionnement live | 10 min | Upload d'un vrai CV du testeur → extraction → positionnement sur une vraie offre qu'il a → génération emails. **Il voit le résultat sur SA donnée, pas une démo.** |
| Cadrer la suite | 5 min | "Tu utilises en autonomie, tu me fais tes retours par WhatsApp, je fixe au fur et à mesure. On fait un point dans 2 semaines." |

**Baseline à noter** (sert pour le ROI au moment du pricing) :

| Testeur | ESN | Date d'entrée | Temps moyen par positionnement avant Esneo | Positionnements/semaine | Outils actuels |
|---------|-----|--------------|-------------------------------------------|------------------------|---------------|
| | | | | | |

### 3.3 Pendant les 3 semaines : boucle continue

**Feedback** : pas de calls formels bi-hebdo. WhatsApp en continu. Le testeur envoie un message quand il veut, tu réponds dans l'heure.

**Questions à poser proactivement** (pas toutes d'un coup, au fil de l'eau) :

| Moment | Question |
|--------|----------|
| Après ses 3 premiers positionnements | "Les emails générés, tu les envoies tels quels ou tu retouches ? Qu'est-ce que tu changes ?" |
| Après 1 semaine | "Quel positionnement t'a fait gagner le plus de temps ? Tu l'estimes à combien vs avant ?" |
| Après un silence de 3+ jours | "Comment ça se passe ? T'as des missions en cours où Esneo pourrait aider ?" |
| Après 2 semaines | "Si un collègue te demande à quoi ça sert, tu lui dis quoi ?" |
| Quand il demande une feature | "Ok, je regarde ça. C'est quoi le cas concret — tu étais sur quelle mission ?" |

**Réactivité dev** (l'arme avec Claude Code) :

| Type de retour | Réaction | Délai |
|---------------|----------|-------|
| Bug bloquant | Fix + déploiement | < quelques heures |
| Friction UX | Fix | < 24h |
| Feature request petite et alignée | Implémentation | < 48h |
| Feature request hors scope | "C'est prévu pour la version [X], voilà la roadmap" | Immédiat |
| Compliment / verbatim positif | **Le noter mot pour mot** — c'est de l'or pour la conversion | — |

**Communiquer chaque fix** : "Suite à ton retour d'hier, j'ai amélioré [X]. C'est en ligne." Le testeur voit que son feedback a un impact en heures, pas en semaines. C'est ce qui crée l'attachement au produit.

### 3.4 Récap hebdomadaire (optionnel mais recommandé)

Un message court chaque vendredi :

> Hey [Prénom], ta semaine sur Esneo :
> - [X] CVs traités, [Y] positionnements
> - Temps estimé gagné : ~[Z]h
> - Côté produit, j'ai livré [feature/fix] suite à ton retour
>
> Bon week-end !

### 3.5 Collecter les preuves de valeur

Pendant ces 3 semaines, **documenter systématiquement** :

- **Verbatims exacts** : "Franchement j'ai fait le positionnement en 5 min, d'habitude je mets 1h30"
- **Métriques d'usage** : CVs traités, positionnements, temps dashboard
- **Cas d'usage marquants** : "Il a répondu à un AO 5 profils en 45 min"
- **Avant/Après** : baseline notée au call d'onboarding vs usage réel
- **Features livrées suite au feedback** : liste avec dates

Ce sont les **armes de conversion** pour la Phase 2.

---

## 4. Phase 2 — Pricing & Conversion (Semaine 4)

### 4.1 Condition de déclenchement

Passer à cette phase quand les **3 conditions** sont réunies :

| Condition | Signal |
|-----------|--------|
| Usage réel | 10+ positionnements réalisés |
| Valeur perçue | Au moins 1 verbatim positif spontané |
| Contribution | Au moins 1 fix/feature livré suite à son feedback |

Si **atteint avant la semaine 3** → lancer le call pricing plus tôt. Pas besoin d'attendre.
Si **pas atteint en semaine 3** → creuser pourquoi. Pas de missions ? Friction produit ? Mauvais profil ? Ne pas forcer la conversion sur un usage faible.

### 4.2 Le call pricing

**Par call, jamais par email.** Avec ses métriques réelles sous les yeux.

> [Prénom], ça fait [X] semaines que tu utilises Esneo. Tu as fait [Y positionnements] et gagné environ [Z heures] par rapport à avant. J'aimerais qu'on parle de la suite.
>
> Avant de lancer l'offre publique, je voulais t'en parler en premier — ton feedback a directement influencé le produit.

### 4.3 L'offre

**Règle n°1 : un seul prix, simple, pour tout ce qui existe aujourd'hui.**

Ne pas vendre des modules qui n'existent pas encore. Vendre ce qui marche maintenant, upgrader quand c'est prêt.

**L'offre Fondateur** :

| Élément | Détail |
|---------|--------|
| **Nom** | Plan Fondateur |
| **Prix** | **39 EUR/recruteur/mois** (tarif public futur : 59 EUR) |
| **Inclus** | Tout ce qui existe : extraction IA, positionnement, emails, templates, dashboard, multi-org |
| **Engagement** | Mensuel sans engagement |
| **Tarif verrouillé** | Ce prix ne bouge pas tant que l'abonnement est actif — même quand les features s'ajoutent |
| **Bonus** | Accès aux nouvelles features dès leur sortie (Velocity, Outreach, Command Center), canal direct, influence roadmap |
| **Contrepartie** | Continuer le feedback + accepter d'être cité comme utilisateur (anonyme ou nommé) |

**Template d'annonce** :

> Voici ce que je te propose :
>
> **Plan Fondateur** — 39 EUR/mois par recruteur.
>
> Ça inclut tout ce que tu utilises aujourd'hui. Et quand les prochaines versions sortent — batch, matching auto, envoi d'emails intégré — tu y as accès sans surcoût. Ce tarif est verrouillé tant que tu restes.
>
> Le tarif public sera à 59 EUR. C'est ma façon de te remercier pour tes retours.
>
> En échange :
> 1. Tu continues à me faire des retours
> 2. J'ai le droit de citer ton ESN comme utilisateur
>
> Tu commences à payer le [date, ~1 semaine]. D'ici là, rien ne change.

**Pourquoi ce pricing** :
- 39 EUR < 1h de temps recruteur (~40-50 EUR chargé)
- À 2 positionnements dans le mois, c'est rentabilisé → décision triviale
- Le "verrouillé à vie + futures features incluses" crée de l'urgence à s'inscrire maintenant
- Mensuel sans engagement = zéro friction

### 4.4 Quand les modules arrivent (futur)

Le plan Fondateur inclut tout. Pour les **futurs** clients (post-fondateurs), la structure modulaire sera :

| Plan | Contenu | Tarif public |
|------|---------|-------------|
| **Socle** | Extraction IA, positionnement, emails générés, templates, dashboard | 59 EUR/recruteur/mois |
| **+ Velocity** | Batch, auto-matching, shortlist PDF, recherche vivier | +19 EUR/recruteur/mois |
| **+ Outreach** | Envoi emails intégré, LinkedIn, brief candidat, benchmark TJM | +19 EUR/recruteur/mois |
| **+ Command Center** | Pipeline kanban, relances auto, portail candidat, rapports | +19 EUR/recruteur/mois |
| **Full** | Tout | 99 EUR/recruteur/mois |

Les fondateurs ont le Full au prix du Socle. C'est leur récompense.

### 4.5 Scénarios de réponse

| Réponse | Action |
|---------|--------|
| **"OK, on y va"** | Setup Stripe, envoi lien paiement, message de bienvenue |
| **"Je dois valider en interne"** | Préparer un one-pager ROI avec SES métriques réelles. Proposer un call à 3 avec son N+1. |
| **"C'est trop cher"** | Ne pas brader. Demander quel prix il verrait. Proposer de réduire le nombre de recruteurs, pas le tarif unitaire. Si vraiment bloqué : proposer 29 EUR les 3 premiers mois. |
| **"Je n'utilise pas assez"** | Creuser pourquoi. Si problème produit → fixer. Si pas de missions → "on reprend quand ton activité reprend, l'offre fondateur reste ouverte 30 jours." |
| **"J'attends la feature [X]"** | Donner une date. Proposer : "Tu démarres maintenant au tarif fondateur, ta première facture est décalée au mois où [X] sort." |
| **"Non merci"** | Accepter. Demander un dernier feedback. Laisser l'accès 2 semaines. Ne pas insister. |

### 4.6 Transition technique

| Étape | Outil | Détail |
|-------|-------|--------|
| Facturation | **Stripe Billing** | Produit "Plan Fondateur", prix par recruteur, abonnement mensuel |
| Portail client | **Stripe Customer Portal** | Le client gère son moyen de paiement et ses factures en autonomie |
| Contrat | PDF simple ou email de confirmation | CGV + récap offre + contrepartie (feedback + droit de citation) |

**Pas de restrictions dans le code.** Avec 2-3 clients, le suivi est humain. Les restrictions techniques viendront à 20+ clients (voir section 6).

### 4.7 Le jour J

1. **J-7** : call pricing (cette section)
2. **J-3** : envoi récap écrit + lien Stripe
3. **J-0** : premier paiement
4. **J+1** : message "Bienvenue dans le programme fondateur"
5. **J+30** : check-in — tout va bien ? Besoin de quelque chose ? Premiers résultats ?

---

## 5. Templates de communication

### 5.1 Invitation testeur (Jour 1)

> Salut [Prénom],
>
> Je t'invite à tester Esneo en avant-première — un outil IA pour accélérer le positionnement de profils en ESN.
>
> Accès complet pendant 3-4 semaines, en échange de tes retours honnêtes sur tes vraies missions. Ensuite on parle de la suite avec un tarif fondateur.
>
> Lien : [lien]
> On se cale un call de 20 min pour que je te montre le workflow sur un de tes CVs ?

### 5.2 Récap hebdo

> Hey [Prénom], ta semaine Esneo :
> - [X] CVs, [Y] positionnements
> - ~[Z]h gagnées estimées
> - J'ai livré [fix/feature] suite à ton retour
>
> Des retours ?

### 5.3 Après un fix

> [Prénom], j'ai corrigé [le truc]. C'est en ligne. Dis-moi si c'est mieux.

### 5.4 Relance si inactif (3+ jours sans usage)

> Hey [Prénom], comment ça se passe avec Esneo ? T'as des missions en cours où je peux t'aider à tester ?

### 5.5 Transition vers le pricing

> [Prénom], tes retours ont été super utiles — j'ai livré [X] améliorations directement grâce à toi. Je structure l'offre commerciale et j'aimerais t'en parler avant tout le monde. 20 min cette semaine ?

### 5.6 Post-conversion

> [Prénom], bienvenue dans le programme fondateur Esneo.
>
> - **Plan** : Fondateur — 39 EUR/recruteur/mois (verrouillé)
> - **Inclus** : tout ce qui existe + toutes les futures versions
> - **Portail facturation** : [lien Stripe]
>
> Rien ne change dans ton usage. On continue comme avant. Merci pour ta confiance.

### 5.7 Si refus

> [Prénom], pas de souci. Merci pour le temps passé et tes retours. Je te laisse l'accès 2 semaines. L'offre fondateur reste ouverte 30 jours si tu changes d'avis. Bonne continuation !

---

## 6. Quand ajouter des restrictions techniques

Pas maintenant. Voici le plan progressif :

| Déclencheur | Action |
|-------------|--------|
| **> 5 orgs** | Afficher le plan dans les settings ("Plan: Fondateur") |
| **> 10 orgs** | Champ `subscription_plan` + `stripe_customer_id` sur `organization_settings` |
| **> 20 orgs** | Limites douces : avertissement quand l'usage approche la limite |
| **> 50 orgs** | Limites dures : bloquer au-delà du quota, prompt d'upgrade |

**Schéma anticipé** (pas à coder maintenant) :

```
organization_settings
  + subscription_plan: 'free' | 'founder' | 'base' | 'velocity' | 'outreach' | 'full'
  + subscription_status: 'active' | 'trial' | 'expired' | 'cancelled'
  + subscription_valid_until: timestamp
  + stripe_customer_id: text
  + stripe_subscription_id: text
```

---

## 7. Métriques

### Pendant la Phase 1 (semaines 1-3)

| Métrique | Cible |
|----------|-------|
| Positionnements / semaine / testeur | > 3 |
| Feedback actionnables / semaine | > 2 |
| Features livrées suite au feedback | > 3 sur les 3 semaines |
| Temps gagné estimé | > 50% vs baseline |
| Verbatim positif spontané | Au moins 1 par testeur |

### Phase 2 (semaine 4+)

| Métrique | Cible |
|----------|-------|
| Taux de conversion beta → payant | 2/3 ou 3/3 |
| Délai call → paiement | < 1 semaine |
| MRR initial | > 80 EUR (preuve de concept) |
| Rétention M2 | 100% |

---

## 8. Erreurs à éviter

| Erreur | Quoi faire à la place |
|--------|----------------------|
| Laisser le gratuit durer sans deadline | Annoncer "3-4 semaines" dès le jour 1 |
| Annoncer le prix par email | Toujours par call, avec ses métriques |
| S'excuser de faire payer | Le ROI parle : 39 EUR < 1h de recruteur |
| Négocier le prix unitaire à la baisse | Ajuster le nombre de recruteurs, pas le tarif |
| Couper l'accès brutalement | 2 semaines de grâce, sortie propre |
| Attendre le produit "parfait" | Monétiser valide la valeur marchande. Un paiement de 39 EUR vaut plus que 100 compliments gratuits. |
| Vendre les modules futurs comme argument principal | Vendre ce qui marche AUJOURD'HUI. Les modules futurs sont un bonus, pas la proposition de valeur. |

---

## 9. Checklist

### Avant d'envoyer les invitations

- [ ] Organisations créées dans Clerk
- [ ] Canal WhatsApp/Slack établi avec chaque testeur
- [ ] Call d'onboarding planifié
- [ ] Fichier de suivi testeurs créé (baseline)
- [ ] Dashboard admin fonctionnel (stats par org)

### Pendant la Phase 1 (hebdomadaire)

- [ ] Récap d'usage envoyé
- [ ] Feedbacks collectés et classés
- [ ] Au moins 1 fix/feature livré et communiqué
- [ ] Verbatims notés
- [ ] Testeurs inactifs relancés sous 3 jours

### Avant le call pricing

- [ ] 10+ positionnements atteints par le testeur
- [ ] Au moins 1 verbatim positif collecté
- [ ] ROI documenté (avant/après avec ses vrais chiffres)
- [ ] Stripe configuré (produit Fondateur, 39 EUR/recruteur/mois)
- [ ] Lien de paiement prêt

---

## 10. Résumé

```
Semaine 1 : Invitation → call onboarding → premier positionnement en live
Semaine 2 : Usage autonome + feedback continu + fix en temps réel
Semaine 3 : Usage + feedback + atteinte du seuil de 10 positionnements
Semaine 4 : Call pricing → offre Fondateur 39 EUR/recruteur/mois → Stripe

Le testeur ne passe pas de "gratuit" à "payant".
Il passe de "testeur" à "membre fondateur avec un prix que plus personne n'aura".
```

---

*Ce playbook est calibré pour 2-3 premiers testeurs. À adapter quand le nombre d'ESN dépasse 10 (onboarding self-serve, restrictions techniques, automatisation des suivis).*
