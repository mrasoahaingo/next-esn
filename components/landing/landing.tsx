import Image from 'next/image';
import Link from 'next/link';
import { AuthSwitch } from '@/components/landing/auth-switch';
import { ArrowRight } from 'lucide-react';
import { PHOTOS } from '@/components/site/images';
import { fr } from '@/components/site/fr';
import { LandingNav } from '@/components/landing/landing-nav';
import { HeroStage } from '@/components/landing/hero/hero-stage';
import { StatusWindow } from '@/components/landing/status-window';
import { TourProgress } from '@/components/landing/tour-progress';
import { LandingFaq } from '@/components/landing/landing-faq';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import { TourStage } from '@/components/landing/stage/tour-stage';

/* Photo existante (brut .media/esneo/fin-1.png, converti sans retouche en
 * public/media/esneo/face-a-face.webp) : le face-à-face que l'outil libère. */

import '@/app/landing.css';

/* Landing Esneo — Hallmark · Workbench, direction « Verre de nuit » (voir app/landing.css et DESIGN.md).
 * « Vous choisissez le profil. Esneo fait le dossier. » La page est une visite
 * de l'outil : des fenêtres de verre posées sur les documents qu'elles
 * remplacent, et sur les gens à qui elles rendent du temps.
 * Aucune preuve sociale, aucun prix, aucun chiffre d'usage (PRODUCT.md) ;
 * candidats, consultants et missions sont des exemples. Les faits de « Vos
 * données » sont vérifiés dans le code (voir le rapport du tour 3, r2). */

/* Faits vérifiés :
 * - stockage privé par organisation : supabase/migrations/initial_schema.sql:42 (bucket non public),
 *   app/api/upload/route.ts:37 (dossier = organisation), 20260401100900_enable_rls.sql:180 (lecture par l'organisation) ;
 * - requêtes filtrées par organisation : app/api/candidates/[id]/route.ts:74-101 ;
 * - rôles : lib/utils/auth.ts:4, membres et réglages réservés aux administrateurs (app/api/members/[id]/route.ts:12,41 ; app/api/org/settings/route.ts:50) ;
 * - IA : workflows/extract-cv.ts:74-129, lib/ai.ts:3 (passerelle de Vercel), lib/llm/constants.ts:2 (Gemini 2.5 Flash) ;
 * - suppression : app/api/candidates/[id]/route.ts (positionnements, fiche et PDF d'origine — correctif du PDF
 *   apporté en parallèle par l'orchestrateur). */
const FACTS: ReadonlyArray<{ lead: string; body: string }> = [
  {
    lead: 'Un espace par organisation.',
    body: 'Fiches, missions et positionnements sont rattachés à votre organisation. Les CV d’origine sont rangés dans un stockage privé, lisible par votre seule équipe.',
  },
  {
    lead: 'Des droits par rôle.',
    body: 'Administrateur ou membre. Gérer l’équipe et les réglages de l’organisation reste réservé aux administrateurs.',
  },
  {
    lead: 'Le chemin vers l’IA.',
    body: 'Pour l’extraction, l’analyse et la rédaction, le CV est envoyé à Gemini 2.5 Flash (Google), via la passerelle de Vercel. C’est le modèle par défaut ; Esneo le règle tâche par tâche.',
  },
  {
    lead: 'Supprimer, vraiment.',
    body: 'Vous supprimez une fiche quand vous voulez, y compris le PDF d’origine et tous ses positionnements.',
  },
];

const STEPS = [
  {
    n: '01',
    key: 'a',
    title: 'PDF ou Word : la fiche se remplit.',
    body: 'Sans gabarit imposé. Expériences, compétences, langues et durées arrivent structurées, dans la langue du CV. Le CV est structuré une fois, puis réutilisé à chaque positionnement : votre vivier de candidats et de consultants devient comparable.',
    note: 'Le statut de chaque rubrique, en direct',
  },
  {
    n: '02',
    key: 'b',
    title: 'La fiche de poste ou de mission, décortiquée.',
    body: 'Collez la demande du client. Esneo classe les points clés par importance, fixe le niveau attendu et liste ce qu’il faut clarifier avant de répondre.',
    note: 'Tiré du texte de la demande, classé par importance',
  },
  {
    n: '03',
    key: 'c',
    title: 'Le positionnement, score à l’appui.',
    body: 'Les profils positionnés sur la mission, candidats comme consultants en intercontrat, se classent du plus proche au moins proche. Pour chacun : un score pondéré par les points clés, la citation du CV derrière chaque point et une confiance affichée.',
    note: 'Classés par score, chaque point renvoie au CV',
  },
  {
    n: '04',
    key: 'd',
    title: 'CV adapté et e-mails, prêts à relire.',
    body: 'Un dossier de compétences à la charte de votre organisation et deux e-mails, un pour le client, un pour le candidat ou le consultant. Rien ne part avant votre relecture.',
    note: 'Des brouillons, jamais un envoi automatique',
  },
] as const;

function StepShot({ step }: { step: (typeof STEPS)[number]['key'] }): React.JSX.Element {
  if (step === 'a')
    return (
      <div className="eg-shot__stage">
        <TourStage scene="extract" />
      </div>
    );
  if (step === 'b')
    return (
      <div className="eg-shot__stage">
        <TourStage scene="mission" />
      </div>
    );
  if (step === 'c')
    return (
      <div className="eg-shot__stage">
        <TourStage scene="ranking" />
      </div>
    );
  return (
    <div className="eg-shot__stage">
      <TourStage scene="email" />
    </div>
  );
}

export function Landing(): React.JSX.Element {
  return (
    <div className="eg eg-landing">
      {/* Entrée du héros (tasteskill, motion.md) : la classe m-enter arme l'animation
          d'entrée ; sans script, le héros reste tel qu'écrit. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('m-enter')" }} />
      <a href="#contenu" className="eg-skip">
        Passer au contenu
      </a>
      <LandingNav />

      <main id="contenu">
        {/* ─── Héros (tasteskill 2.5.1, tirage hero: split) : le texte sur cinq
            colonnes, la fenêtre du produit sur six, une carte posée dessous ──── */}
        <section className="eg-hero hero hero--split" data-enter aria-labelledby="eg-h1">
          {/* Fond pleine largeur : La Défense à l'heure bleue, assombrie par les voiles
              de la direction (voile dense sous le texte, fondu vers le papier en bas).
              Décor, sans légende : la mention IA est dans la ligne du pied. */}
          <Image
            className="eg-hero__bg layer"
            src={PHOTOS.hero.src}
            alt=""
            aria-hidden
            fill
            preload
            /* Recadrée en cover : sur un écran plus haut que 16/9, l'image doit couvrir la
               hauteur, d'où 178vh (sinon une image de 390 px s'étire sur 844 de haut). */
            sizes="(max-aspect-ratio: 16/9) 178vh, 100vw"
          />
          <div className="eg-wrap wrap">
            <div className="eg-hero__grid grid hero__grid hero-text">
              <div className="eg-hero__text hero__text span-5">
                <p className="eg-hero__kicker hero__kicker">Logiciel de positionnement pour ESN et cabinets de recrutement</p>
                <h1 id="eg-h1" className="eg-hero__h1">Vous choisissez le profil. Esneo fait le dossier.</h1>
                <p className="eg-hero__lead hero__lead">
                  {fr('Déposez un CV en PDF ou Word et la fiche de poste : Esneo rend un score sur 100, chaque point cité dans le CV.')}
                </p>
                <div className="eg-hero__actions btn-row">
                  <AuthSwitch
                    signedOut={
                      <Link href="/sign-up" className="eg-btn eg-btn--primary btn btn--primary">
                        Essayer sur vos CV
                        <ArrowRight aria-hidden />
                      </Link>
                    }
                    signedIn={
                      <Link href="/dashboard" className="eg-btn eg-btn--primary btn btn--primary">
                        Ouvrir l’app
                        <ArrowRight aria-hidden />
                      </Link>
                    }
                  />
                  <a href="#fonctionnement" className="eg-btn eg-btn--quiet btn btn--secondary">
                    Voir comment ça marche
                  </a>
                </div>
                <AuthSwitch signedOut={<p className="eg-hero__fine">Sans carte bancaire.</p>} signedIn={null} />
              </div>

              {/* La fenêtre de positionnement, entière dans son cadre ; si elle
                  dépasse (documents, tablette, téléphone), elle défile dans le cadre. */}
              <div className="eg-hero__frame hero__media span-6">
                {/* La fenêtre et sa carte, jouées une fois puis rendues au visiteur
                    (components/landing/hero/hero-stage.tsx). */}
                <HeroStage />
              </div>
            </div>
          </div>
          {/* Flou progressif au bas du héros, à plat, hors du plan incliné, sur
              toute la largeur (hero-stage.css) : deux couches de verre. */}
          <div className="eg-hero__haze" aria-hidden>
            <span />
            <span />
          </div>
        </section>

        {/* ─── Visite guidée : quatre écrans numérotés, reliés par un fil ───── */}
        <section id="fonctionnement" className="eg-tour" aria-labelledby="eg-tour-h">
          <div className="eg-wrap eg-tour__head">
            <h2 id="eg-tour-h" className="eg-h2">
              Du CV reçu au positionnement prêt.
            </h2>
            <p className="eg-sub">
              {fr('Quatre écrans d’Esneo, dans l’ordre où vous les parcourez. Candidats, consultants et missions affichés sont des exemples.')}
            </p>
          </div>

          <TourProgress />
          <ol className="eg-wrap eg-steps">
            {STEPS.map((s) => (
              <li key={s.key} className={`eg-step eg-step--${s.key}`} data-state="next">
                <span className="eg-step__n" aria-hidden>
                  {s.n}
                </span>
                <div className="eg-step__text">
                  <h3 className="eg-step__title">{fr(s.title)}</h3>
                  <p>{fr(s.body)}</p>
                </div>
                <figure className={`eg-shot eg-shot--${s.key}`}>
                  <StepShot step={s.key} />
                  <figcaption className="eg-note">{s.note}</figcaption>
                </figure>
              </li>
            ))}
          </ol>
        </section>

        {/* ─── Fiabilité : la bande éclairée, le suivi posé sur le point staffing ─ */}
        <section id="fiabilite" className="eg-trust" aria-labelledby="eg-trust-h">
          <div className="eg-wrap eg-trust__grid">
            <div className="eg-trust__copy">
              <h2 id="eg-trust-h" className="eg-h2">
                {fr('L’IA propose, vous validez.')}
              </h2>
              <p className="eg-sub">{fr('Vous voyez tout ce qui tourne, et rien n’est définitif sans vous.')}</p>
              <dl className="eg-claims">
                <div>
                  <dt>Des statuts visibles</dt>
                  <dd>{fr('Extraction, analyse, génération : chaque traitement dit où il en est.')}</dd>
                </div>
                <div>
                  <dt>Aucun doublon lancé en silence</dt>
                  <dd>
                    {fr('Tant qu’un traitement tourne, son bouton reste bloqué ; après un rechargement, c’est le même qui continue.')}
                  </dd>
                </div>
                <div>
                  <dt>Des erreurs avec leur cause</dt>
                  <dd>{fr('Un échec s’affiche avec sa raison et un bouton pour réessayer. Le CV d’origine reste intact.')}</dd>
                </div>
                <div>
                  <dt>Rien ne part sans relecture</dt>
                  <dd>{fr('CV adapté et e-mails restent des brouillons jusqu’à votre validation.')}</dd>
                </div>
              </dl>
            </div>
            <div className="eg-trust__shot">
              <figure className="eg-trust__photo">
                <Image
                  src={PHOTOS.staffing.src}
                  alt={PHOTOS.staffing.alt}
                  width={PHOTOS.staffing.width}
                  height={PHOTOS.staffing.height}
                  sizes="(min-width: 60rem) 700px, 100vw"
                />
                <figcaption className="eg-credit">Photographie générée par IA, personnes fictives</figcaption>
              </figure>
              <StatusWindow />
              <p className="eg-note">{fr('Essayez « Réessayer » sur la ligne en échec')}</p>
            </div>
          </div>
        </section>

        {/* ─── Vos données : seulement ce que le code fait ────────────────────── */}
        <section id="donnees" className="eg-data" aria-labelledby="eg-data-h">
          <div className="eg-wrap eg-data__grid">
            <div className="eg-data__copy">
              <h2 id="eg-data-h" className="eg-h2">
                Ce que deviennent vos CV.
              </h2>
              <ul className="eg-facts">
                {FACTS.map((f) => (
                  <li key={f.lead} className="eg-fact">
                    <p className="eg-fact__lead">{fr(f.lead)}</p>
                    <p className="eg-fact__body">{fr(f.body)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ─── Bientôt : deux vitres restées givrées ───────────────────────── */}
        <section id="bientot" className="eg-soon" aria-labelledby="eg-soon-h">
          <div className="eg-wrap">
            <div className="eg-soon__head">
              <h2 id="eg-soon-h" className="eg-h2">
                Bientôt dans Esneo.
              </h2>
              <p className="eg-sub">Deux chantiers en cours. Ils ne sont pas encore disponibles.</p>
            </div>
            <div className="eg-soon__grid">
              <article className="eg-frost eg-frost--prospect" aria-labelledby="eg-soon-1">
                <div className="eg-frost__ui" aria-hidden>
                  {[
                    { n: 'Directrice des achats IT', c: 'Assureur, La Défense', s: 'À contacter' },
                    { n: 'Responsable delivery', c: 'Banque de détail, Lyon', s: 'Message prêt' },
                    { n: 'CTO', c: 'Éditeur SaaS, Nantes', s: 'À relire' },
                  ].map((r) => (
                    <span key={r.n} className="eg-mini-row">
                      <span className="eg-mini-avatar" />
                      <span className="eg-mini-text">
                        <span className="eg-mini-name">{r.n}</span>
                        <span className="eg-mini-sub">{fr(r.c)}</span>
                      </span>
                      <span className="eg-mini-chip">{r.s}</span>
                    </span>
                  ))}
                </div>
                <div className="eg-frost__pane" aria-hidden />
                <div className="eg-frost__body">
                  <span className="eg-soon-tag">Bientôt</span>
                  <h3 id="eg-soon-1" className="eg-h3">
                    Prospection
                  </h3>
                  <p>
                    {fr(
                      'Trouver les bons contacts chez vos clients et vos prospects, et préparer les premiers messages, à relire comme le reste.',
                    )}
                  </p>
                </div>
              </article>

              <article className="eg-frost eg-frost--claude" aria-labelledby="eg-soon-2">
                <div className="eg-frost__ui eg-frost__ui--link" aria-hidden>
                  <span className="eg-link-node">Claude</span>
                  <span className="eg-link-line">
                    <span className="eg-link-label">MCP</span>
                  </span>
                  <span className="eg-link-node eg-link-node--esneo">esneo</span>
                  <span className="eg-chat eg-chat--ask">{fr('Positionnements de Camille ?')}</span>
                  <span className="eg-chat">{fr('Un en cours : Tech lead Java, 84/100, CV adapté à relire.')}</span>
                </div>
                <div className="eg-frost__pane" aria-hidden />
                <div className="eg-frost__body">
                  <span className="eg-soon-tag">Bientôt</span>
                  <h3 id="eg-soon-2" className="eg-h3">
                    Votre assistant Claude, branché sur Esneo
                  </h3>
                  <p className="eg-frost__via">via un connecteur (MCP)</p>
                  <p>{fr('Retrouver vos fiches, vos missions et vos positionnements depuis votre assistant.')}</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ─── Questions ───────────────────────────────────────────────────── */}
        <section id="questions" className="eg-faq" aria-labelledby="eg-faq-h">
          <div className="eg-wrap eg-faq__grid">
            <h2 id="eg-faq-h" className="eg-h2 eg-faq__title">
              Vos questions.
            </h2>
            <LandingFaq />
          </div>
        </section>

        {/* ─── Action finale : verre teinté azur, la suite en clair ─────────── */}
        <section className="eg-final" aria-labelledby="eg-final-h">
          <div className="eg-wrap">
            <div className="eg-glass eg-glass--azur eg-final__inner">
              <div className="eg-final__copy">
                <h2 id="eg-final-h" className="eg-h2 eg-final__title">
                  Essayez Esneo sur vos propres CV.
                </h2>
                <p className="eg-final__next">
                  {fr(
                    'Créez votre compte et votre organisation, déposez un premier CV : l’extraction démarre aussitôt et se suit en direct.',
                  )}
                </p>
              </div>
              <div className="eg-final__act">
                <AuthSwitch
                  signedOut={
                    <>
                      <Link href="/sign-up" className="eg-btn eg-btn--light eg-btn--lg">
                        Créer un compte
                        <ArrowRight aria-hidden />
                      </Link>
                      <p className="eg-final__fine">Sans carte bancaire.</p>
                    </>
                  }
                  signedIn={
                    <Link href="/dashboard" className="eg-btn eg-btn--light eg-btn--lg">
                      Ouvrir l’app
                      <ArrowRight aria-hidden />
                    </Link>
                  }
                />
                <p className="eg-final__fine">
                  {fr('Vos CV ne sont confiés à des modèles d’IA tiers que pour l’extraction, l’analyse et la rédaction.')}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Pied : logo et accroche, liens, mentions ─────────────────────── */}
      <footer className="eg-foot">
        <div className="eg-wrap eg-foot__band">
          <div className="eg-foot__brand">
            <Link href="/" className="eg-foot__home" aria-label="Esneo, accueil">
              <EsneoFullLogo className="eg-logo eg-foot__logo" title="Esneo" aria-hidden />
            </Link>
            <p className="eg-foot__tag">
              {fr('L’outil des ESN et des cabinets : CV, fiches de poste, positionnements.')}
            </p>
          </div>
          <nav className="eg-foot__links" aria-label="Pied de page">
            <a href="#fonctionnement">Fonctionnement</a>
            <a href="#fiabilite">Fiabilité</a>
            <a href="#donnees">Vos données</a>
            <a href="#questions">Questions</a>
            <AuthSwitch
              signedOut={
                <>
                  <Link href="/sign-in">Se connecter</Link>
                  <Link href="/sign-up">Créer un compte</Link>
                </>
              }
              signedIn={<Link href="/dashboard">Ouvrir l’app</Link>}
            />
          </nav>
        </div>
        <div className="eg-wrap eg-foot__legal">
          <p>
            {fr('Photographies générées par IA, personnes fictives · Candidats, consultants et missions affichés : exemples fictifs.')}
          </p>
          <p>© 2026 Esneo</p>
        </div>
      </footer>
    </div>
  );
}
