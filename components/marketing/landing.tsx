import '@/app/esneo-site.css';

import Image from 'next/image';
import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { AlertTriangle, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import { SiteNav } from '@/components/site/site-nav';
import { Reveal } from '@/components/site/reveal';
import { HeroPositioning } from '@/components/site/hero-positioning';
import { StatusBoard } from '@/components/site/status-board';
import { PipelinePinned } from '@/components/site/pipeline-pinned';
import { FaqIndex } from '@/components/site/faq-index';
import { PHOTOS, PHOTO_CREDIT } from '@/components/site/images';
import { fr } from '@/components/site/fr';
import { CarouselHint } from '@/components/site/carousel-hint';

/* Landing Esneo — direction « The product performs » (voir DESIGN.md).
 * Le produit fait son travail devant le visiteur : fragments d'interface vrais
 * (data-ui), posés sur des photos du monde des ESN. Chaque chapitre s'ouvre sur un
 * onglet de dossier, comme les dossiers de compétences rangés dans un tiroir.
 * Copie : PRODUCT.md, aucune preuve sociale inventée ; consultants et missions
 * affichés sont fictifs. */

const CONTRACT: { kind: string; items: string[] }[] = [
  {
    kind: 'Elle fait',
    items: [
      'Extraire et structurer un CV',
      'Dégager les points clés d’une mission',
      'Proposer un score de correspondance expliqué',
      'Préparer le CV adapté et les e-mails, à relire',
    ],
  },
  {
    kind: 'Elle ne fera jamais',
    items: [
      'Envoyer sans votre relecture',
      'Lancer deux fois le même traitement',
      'Masquer comment le score est calculé',
      'Décider à votre place',
    ],
  },
  {
    kind: 'Vous arrêtez',
    items: [
      'Ressaisir les CV à la main',
      'Refaire une fiche consultant à chaque mission',
      'Relancer un traitement « au cas où »',
    ],
  },
  {
    kind: 'Vous gagnez',
    items: [
      'Un positionnement prêt à relire, score à l’appui',
      'Un vivier structuré et comparable',
      'Savoir à tout moment où en est chaque traitement',
    ],
  },
];

const FACTS = [
  {
    lead: 'Pour les ESN.',
    body: 'Ingénieurs d’affaires, chargés de recrutement, managers de consultants : ceux qui répondent aux appels d’offres et suivent l’intercontrat.',
  },
  {
    lead: 'Ce que fait Esneo.',
    body: 'Le CV devient une fiche, la demande client un barème, le positionnement un score expliqué.',
  },
  {
    lead: 'Un espace par ESN.',
    body: 'Isolé, visible de votre seule équipe, avec des droits par rôle : administrateur ou membre.',
  },
  {
    lead: 'Démarrez tout de suite.',
    body: 'Créez un compte, déposez un premier CV : l’extraction démarre aussitôt et se suit en direct.',
  },
];

export function Landing() {
  return (
    <div className="es es-page">
      <a
        href="#contenu"
        className="sr-only z-50 bg-white px-4 py-2 text-sm text-black focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4"
      >
        Passer au contenu
      </a>
      <Reveal />
      <SiteNav />

      <main id="contenu">
        {/* ─── Héros : le fragment de positionnement sur la photo ─────────── */}
        <section className="es-hero es-field--soot" aria-labelledby="es-h1">
          <div className="es-hero__copy es-wrap es-grid">
            <h1 id="es-h1" className="es-hero__title">
              Du CV au positionnement,
              <br />
              piloté par l’IA.
            </h1>
            <p className="es-hero__sub">
              {fr(
                'Pour les ESN : Esneo structure les CV de vos consultants, analyse les besoins de vos clients et propose le bon positionnement, avec un retour clair à chaque étape.',
              )}{' '}
              <strong>L’IA propose, vous validez.</strong>
            </p>
            <div className="es-hero__actions">
              <Show when="signed-out">
                <Link href="/sign-up" className="es-btn">
                  Essayer sur vos CV
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="es-btn">
                  Accéder au dashboard
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Show>
            </div>
            <p className="es-hero__aside">
              <span className="es-only-wide">Relisez l’exemple ci-contre</span>
              <span className="es-only-narrow">Relisez l’exemple ci-dessous</span>
              {fr(' : validez chaque point si l’IA a vu juste, écartez-le sinon, puis générez le CV adapté.')}
            </p>
            <div className="es-stage es-tabbed">
              <div className="es-stage__photo">
                <Image
                  src={PHOTOS.hero.src}
                  alt={PHOTOS.hero.alt}
                  width={PHOTOS.hero.width}
                  height={PHOTOS.hero.height}
                  priority
                  sizes="(max-width: 860px) 100vw, 70vw"
                />
              </div>
              <div className="es-stage__fragment">
                <HeroPositioning />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Intro : le propos, puis une planche éditoriale du métier ────── */}
        <section className="es-intro es-field--soot" aria-label="Esneo en bref">
          <div className="es-wrap es-grid">
            <p className="es-intro__lead" data-reveal>
              {fr(
                'Moins de ressaisie, plus de temps pour placer vos consultants. Esneo structure chaque CV dès son dépôt et le réutilise à chaque positionnement.',
              )}
            </p>
          </div>
          <div className="es-wrap">
            <figure className="es-spread" data-reveal>
              <div className="es-spread__img">
                <Image
                  src={PHOTOS.staffing.src}
                  alt={PHOTOS.staffing.alt}
                  width={PHOTOS.staffing.width}
                  height={PHOTOS.staffing.height}
                  sizes="100vw"
                />
              </div>
              <div className="es-spread__ui es-spread__ui--a" aria-hidden>
                <div data-ui className="ui-card sp">
                  <div className="ui-row" style={{ justifyContent: 'space-between' }}>
                    <span className="ui-muted">Nouvelle demande client</span>
                    <span className="ui-chip">
                      <span className="ui-spin" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                      Analyse 2/5
                    </span>
                  </div>
                  <p className="st-strong sp__title">{fr('Tech lead Java · assureur, La Défense')}</p>
                  <p className="ui-muted sp__sub">{fr('Démarrage le 6 janvier · niveau senior')}</p>
                </div>
              </div>
              <div className="es-spread__ui es-spread__ui--b" aria-hidden>
                <div data-ui className="ui-card sp">
                  <p className="st-strong">Positionnements de la semaine</p>
                  {[
                    { n: 'Camille Durand', s: 'À valider', c: 'ui-chip ui-chip--warn' },
                    { n: 'Léa Fontaine', s: 'Validé', c: 'ui-chip ui-chip--ok' },
                    { n: 'Thomas Leroy', s: 'En cours 3/5', c: 'ui-chip' },
                  ].map((r) => (
                    <div key={r.n} className="ui-row sp__row">
                      <span style={{ flex: 1 }}>{r.n}</span>
                      <span className={r.c}>{r.s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <figcaption>{fr('Le point staffing du lundi : qui part sur quelle mission.')}</figcaption>
            </figure>
          </div>
          <div className="es-wrap es-grid es-intro__row">
            <figure className="es-portrait es-portrait--a" data-reveal>
              <div className="es-portrait__img">
                <Image
                  src={PHOTOS.esplanade.src}
                  alt={PHOTOS.esplanade.alt}
                  width={PHOTOS.esplanade.width}
                  height={PHOTOS.esplanade.height}
                  sizes="(max-width: 860px) 50vw, 25vw"
                />
              </div>
              <figcaption className="es-portrait__fact">
                <b>{FACTS[0].lead}</b> {fr(FACTS[0].body)}
              </figcaption>
            </figure>
            <figure className="es-portrait es-portrait--b" data-reveal style={{ ['--d' as string]: '90ms' }}>
              <div className="es-portrait__img">
                <Image
                  src={PHOTOS.consultant.src}
                  alt={PHOTOS.consultant.alt}
                  width={PHOTOS.consultant.width}
                  height={PHOTOS.consultant.height}
                  sizes="(max-width: 860px) 50vw, 25vw"
                />
              </div>
              <figcaption className="es-portrait__fact">
                <b>{FACTS[2].lead}</b> {fr(FACTS[2].body)}
              </figcaption>
            </figure>
            <p className="es-intro__credit">{PHOTO_CREDIT}</p>
          </div>
        </section>

        {/* ─── Tableau : chaque traitement a un statut ─────────────────── */}
        <section className="es-folder es-board-sec es-field--soot2" data-tab="0" aria-labelledby="es-board-h">
          <div className="es-wrap es-grid">
            <h2 id="es-board-h" className="es-head es-board-sec__head" data-reveal>
              Aucun traitement ne tourne en silence.
            </h2>
            <p className="es-board-sec__sub" data-reveal style={{ ['--d' as string]: '80ms' }}>
              {fr(
                'Extraction, analyse, génération : chaque consultant a un statut. Vous voyez ce qui tourne, ce qui attend votre relecture et ce qui a échoué, avec sa cause. Ouvrez une ligne.',
              )}
            </p>
          </div>
          <div className="es-wrap" data-reveal style={{ ['--d' as string]: '160ms' }}>
            <StatusBoard />
          </div>
        </section>

        {/* ─── Fonctionnement : fragment épinglé sur le bureau ──────────── */}
        <section id="fonctionnement" className="es-folder es-how es-field--paper" data-tab="1" aria-labelledby="es-how-h">
          <div className="es-wrap">
            <PipelinePinned />
          </div>
        </section>

        {/* ─── Fiabilité : petites preuves à côté du texte ─────────────── */}
        <section id="fiabilite" className="es-folder es-proofs es-field--paper2" data-tab="2" aria-labelledby="es-proofs-h">
          <div className="es-wrap es-grid">
            <h2 id="es-proofs-h" className="es-head es-proofs__head" data-reveal>
              L’IA travaille. Vous gardez la main.
            </h2>
            <CarouselHint targetId="es-proofs-scroller" total={5} />
            <div id="es-proofs-scroller" className="es-proofs__scroller" role="region" tabIndex={0} aria-label="Cinq garanties de fiabilité">
            <ul className="es-proofs__list">
              <li className="es-proof es-proof--big" data-reveal>
                <div className="es-proof__panel es-proof__panel--photo">
                  <Image
                    src={PHOTOS.dossier.src}
                    alt={PHOTOS.dossier.alt}
                    width={PHOTOS.dossier.width}
                    height={PHOTOS.dossier.height}
                    sizes="(max-width: 860px) 85vw, 50vw"
                  />
                  <div data-ui className="ui-card ui-card--flat pf">
                    <span className="st-strong">Dossier de compétences · Tech lead Java</span>
                    <ul className="pf-rubs">
                      {[
                        { r: 'Identité', ok: true },
                        { r: 'Expériences', ok: true },
                        { r: 'Compétences', ok: false },
                        { r: 'Formation', ok: false },
                      ].map((x) => (
                        <li key={x.r} className="ui-row">
                          <span style={{ flex: 1 }}>{x.r}</span>
                          <span className={x.ok ? 'ui-chip ui-chip--ok' : 'ui-chip ui-chip--warn'}>
                            {x.ok ? 'Relu' : 'À relire'}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="ui-row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                      <span className="ui-btn ui-btn--off">Exporter le PDF</span>
                    </div>
                  </div>
                </div>
                <div className="es-proof__text">
                  <h3>Rien ne part sans vous.</h3>
                  <p>{fr('Rien n’est exporté sans votre relecture. Chaque fiche reste modifiable, et l’aperçu PDF suit vos corrections.')}</p>
                  <p>{fr('Le dossier suit votre gabarit : thème, logo, en-tête, ordre des blocs. Pour chaque mission, un CV adapté et deux e-mails, un pour le client et un pour le consultant.')}</p>
                </div>
              </li>

              <li className="es-proof" data-reveal>
                <div className="es-proof__panel">
                  <div data-ui className="ui-card ui-card--flat pf">
                    <span className="ui-btn ui-btn--off">
                      <span className="ui-spin" />
                      Analyse en cours · étape 3/5
                    </span>
                    <p className="ui-muted pf__note">{fr('Page rechargée : la même analyse continue.')}</p>
                  </div>
                </div>
                <div className="es-proof__text">
                  <h3>Un seul lancement à la fois.</h3>
                  <p>Une analyse lancée bloque son bouton jusqu’à la fin.</p>
                  <p>Même après un rechargement de page, c’est la même analyse qui continue.</p>
                </div>
              </li>

              <li className="es-proof" data-reveal>
                <div className="es-proof__panel">
                  <div data-ui className="ui-card ui-card--flat pf pf--err">
                    <div className="pf-err">
                      <AlertTriangle className="size-4" style={{ color: '#b23421', flex: 'none' }} aria-hidden />
                      <div>
                        <p className="st-strong pf__title">L’extraction a échoué</p>
                        <p className="ui-muted pf__note">{fr('Rubrique « Expériences » : délai dépassé.')}</p>
                      </div>
                      <span className="ui-btn">
                        <RotateCcw className="size-3.5" aria-hidden />
                        Relancer
                      </span>
                    </div>
                  </div>
                </div>
                <div className="es-proof__text">
                  <h3>Les erreurs restent visibles.</h3>
                  <p>Un échec s’affiche avec sa cause et un bouton pour relancer.</p>
                  <p>{fr('Le CV d’origine reste intact ; rien n’est masqué ni perdu.')}</p>
                </div>
              </li>

              <li className="es-proof" data-reveal>
                <div className="es-proof__panel">
                  <div data-ui className="ui-card ui-card--flat pf">
                    <div className="ui-row ui-wrap" style={{ justifyContent: 'space-between' }}>
                      <span className="st-strong">Java et Spring Boot</span>
                      <span className="ui-chip">Indispensable · rang 1</span>
                    </div>
                    <p className="ui-muted pf__note">
                      {fr('Citation du CV : « Migration du moteur de tarification vers Spring Boot 3 (2024) »')}
                    </p>
                    <div className="ui-row" style={{ marginTop: 10 }}>
                      <Check className="size-4" style={{ color: '#17734b' }} aria-hidden />
                      <span>Couvert, sur le poste actuel</span>
                    </div>
                  </div>
                </div>
                <div className="es-proof__text">
                  <h3>Un score qui s’explique.</h3>
                  <p>Chaque point de la mission renvoie à une preuve tirée du CV, ou dit qu’il n’en a pas trouvé.</p>
                  <p>{fr('Le score s’appuie sur les 5 dernières années, et sa confiance est affichée.')}</p>
                </div>
              </li>


              <li className="es-proof" data-reveal>
                <div className="es-proof__panel">
                  <div data-ui className="ui-card ui-card--flat pf">
                    {[
                      { n: 'Julie M.', r: 'Administratrice' },
                      { n: 'Karim B.', r: 'Membre' },
                      { n: 'Sophie L.', r: 'Membre' },
                    ].map((m) => (
                      <div key={m.n} className="ui-row pf-member">
                        <span className="pf-avatar" aria-hidden>
                          {m.n[0]}
                        </span>
                        <span style={{ flex: 1 }}>{m.n}</span>
                        <span className={m.r === 'Membre' ? 'ui-chip ui-chip--grey' : 'ui-chip'}>{m.r}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="es-proof__text">
                  <h3>Un espace par organisation.</h3>
                  <p>{fr('Chaque ESN travaille dans son espace isolé ; ses données ne croisent jamais celles d’une autre.')}</p>
                  <p>{fr('Les droits se gèrent par rôle : chacun voit ce qui le concerne.')}</p>
                </div>
              </li>
            </ul>
            </div>
          </div>
        </section>

        {/* ─── Le contrat, en colonnes ─────────────────────────────────── */}
        <section className="es-folder es-contract es-field--azur" data-tab="3" aria-labelledby="es-contract-h">
          <div className="es-wrap es-grid">
            <h2 id="es-contract-h" className="es-head es-contract__head" data-reveal>
              L’IA propose. Vous validez.
            </h2>
            <div className="es-contract__cols">
              {CONTRACT.map((group, i) => (
                <div
                  key={group.kind}
                  className="es-contract__group"
                  data-reveal
                  style={{ ['--d' as string]: `${i * 80}ms` }}
                >
                  <h3>{group.kind}</h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{fr(item)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Questions ───────────────────────────────────────────────── */}
        <section id="questions" className="es-folder es-faq es-field--paper" data-tab="4" aria-labelledby="es-faq-h">
          <div className="es-wrap">
            <FaqIndex />
          </div>
        </section>

        {/* ─── L'action ────────────────────────────────────────────────── */}
        <section className="es-folder es-cta es-field--soot" data-tab="5" aria-labelledby="es-cta-h">
          <div className="es-wrap es-grid">
            <div className="es-cta__tile" data-reveal>
              <h2 id="es-cta-h">Voyez Esneo sur vos propres CV.</h2>
              <p>
                {fr(
                  'Créez un compte et votre organisation, déposez un premier CV : l’extraction démarre aussitôt et se suit en direct.',
                )}
              </p>
              <Show when="signed-out">
                <Link href="/sign-up" className="es-btn es-btn--ink">
                  Créer un compte
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <p className="es-cta__fine">
                  {fr('Sans carte bancaire. Vos CV ne sont confiés à des modèles d’IA tiers que pour l’extraction, l’analyse et la rédaction.')}
                </p>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="es-btn es-btn--ink">
                  Accéder au dashboard
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Show>
            </div>
            <div className="es-cta__photo" data-reveal style={{ ['--d' as string]: '90ms' }}>
              <Image
                src={PHOTOS.fin.src}
                alt={PHOTOS.fin.alt}
                width={PHOTOS.fin.width}
                height={PHOTOS.fin.height}
                sizes="(max-width: 860px) 100vw, 40vw"
              />
              <div className="es-cta__ui" aria-hidden>
                <div data-ui className="ui-card sp">
                  <span className="hp__count hp__count--ok">
                    <Check className="size-4" aria-hidden />
                    CV adapté et e-mails prêts
                  </span>
                  <p className="ui-muted sp__sub">{fr('Camille Durand · à relire avant envoi')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="es-foot es-field--soot">
        <div className="es-wrap">
          <EsneoFullLogo className="es-foot__mark text-white" title="Esneo" aria-hidden viewBox="192 0 2420 510" />
          <div className="es-foot__line">
            <span>Esneo, l’IA de staffing pour les ESN</span>
            <nav aria-label="Pied de page">
              <a href="#fonctionnement" className="es-link">
                Fonctionnement
              </a>
              <a href="#fiabilite" className="es-link">
                Fiabilité
              </a>
              <a href="#questions" className="es-link">
                Questions
              </a>
              <Show when="signed-out">
                <Link href="/sign-in" className="es-link">
                  Se connecter
                </Link>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="es-link">
                  Mon dashboard
                </Link>
              </Show>
            </nav>
            <span className="es-foot__end">© 2026 Esneo · Photos générées par IA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
