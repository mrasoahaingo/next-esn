'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, FileText, Info, Lock, Mail, RotateCcw, X } from 'lucide-react';
import { fr } from '@/components/site/fr';

/**
 * La grande fenêtre du héros : un positionnement tel que l'IA le propose, que
 * le visiteur relit point par point. Chaque point cite le CV, et chaque
 * décision dit sa vraie conséquence (mis en avant, pas survendu, question au
 * consultant, retiré de l'analyse). « Générer le CV adapté » reste inactif tant
 * que tout n'est pas relu, puis pendant la génération (jamais deux lancements).
 * Consultant et mission fictifs.
 */

type Verdict = 'pending' | 'kept' | 'dropped';
type Kind = 'fort' | 'faible' | 'clarifier';
type Phase = 'review' | 'generating' | 'done';

const ITEMS: ReadonlyArray<{
  id: string;
  kind: Kind;
  short: string;
  text: string;
  quote: string;
  /** Conséquence quand le point est validé. */
  kept: string;
  /** Résumé de la conséquence, une fois les documents prêts. */
  effect: string;
}> = [
  {
    id: 'java',
    kind: 'fort',
    short: 'Java et Spring Boot',
    text: 'Java 17 et Spring Boot : 6 ans, dont la mission en cours',
    quote: '« Migration du moteur de tarification vers Spring Boot 3 (2024) »',
    kept: 'Mis en avant dans le CV adapté',
    effect: 'Java et Spring Boot : mis en avant dans le CV adapté.',
  },
  {
    id: 'kafka',
    kind: 'faible',
    short: 'Kafka',
    text: 'Kafka : une seule mention, sur un projet de 2019',
    quote: '« Bus d’événements Kafka pour les notifications clients (2019) »',
    kept: 'Le CV adapté ne survendra pas Kafka',
    effect: 'Kafka : présenté tel quel, sans survente.',
  },
  {
    id: 'dispo',
    kind: 'clarifier',
    short: 'Disponibilité au 6 janvier',
    text: 'Disponibilité au 6 janvier : le CV indique une mission en cours',
    quote: '« Assureur IARD, La Défense · depuis mars 2022, en cours »',
    kept: 'Question ajoutée à l’e-mail au consultant',
    effect: 'Disponibilité : question posée dans l’e-mail à Camille.',
  },
];

const KIND: Record<Kind, { label: string; tone: string }> = {
  fort: { label: 'Point fort', tone: 'ok' },
  faible: { label: 'Point faible', tone: 'warn' },
  clarifier: { label: 'À clarifier', tone: 'info' },
};

/** Durée de rédaction simulée par document (ms). */
const DOC_MS = 850;
/** Durée de l'ajustement de hauteur entre la relecture et les documents (ms). */
const RESIZE_MS = 420;

const freshVerdicts = (): Record<string, Verdict> =>
  Object.fromEntries(ITEMS.map((i) => [i.id, 'pending'])) as Record<string, Verdict>;

const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function HeroReview(): React.JSX.Element {
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>(freshVerdicts);
  const [phase, setPhase] = useState<Phase>('review');
  const [made, setMade] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const docsHeadRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const lastHeight = useRef(0);
  const timers = useRef<{ ids: number[] }>({ ids: [] });
  const genRef = useRef<HTMLButtonElement>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'gen' | 'replay' | null>(null);

  useEffect(() => {
    const bag = timers.current;
    return () => bag.ids.forEach((id) => window.clearTimeout(id));
  }, []);

  // La fenêtre vit dans le cadre du héros (components/landing/landing.tsx) : il a
  // une hauteur fixe (CLS nul) et la fait défiler quand elle le dépasse, barre
  // d'action collée à son bas à partir de 640 px (app/landing.css).

  // Hauteur connue de la zone de travail, tenue à jour hors animation.
  useEffect(() => {
    const el = stackRef.current;
    if (!el || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(() => {
      if (!el.classList.contains('is-resizing')) lastHeight.current = el.offsetHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inReview = phase === 'review';
  const showPreview = !inReview && made >= 2;
  const layoutKey = inReview ? 'review' : 'docs';

  // Relecture → documents : seul le contenu utile est monté, et la hauteur
  // glisse de l'ancienne à la nouvelle au lieu de laisser du verre vide.
  useLayoutEffect(() => {
    const el = stackRef.current;
    if (!el) return;
    el.classList.remove('is-resizing');
    el.style.height = '';
    const to = el.offsetHeight;
    const from = lastHeight.current;
    lastHeight.current = to;
    if (!from || Math.abs(to - from) < 2 || reducedMotion()) return;
    el.style.height = `${from}px`;
    void el.offsetHeight;
    el.classList.add('is-resizing');
    el.style.height = `${to}px`;
    const id = window.setTimeout(() => {
      el.classList.remove('is-resizing');
      el.style.height = '';
    }, RESIZE_MS + 60);
    return () => window.clearTimeout(id);
  }, [layoutKey]);

  // Téléphone : on ramène « Documents » à l'écran si la fenêtre a raccourci.
  useEffect(() => {
    if (layoutKey !== 'docs') return;
    if (!window.matchMedia('(max-width: 39.99rem)').matches) return;
    const id = window.setTimeout(() => {
      docsHeadRef.current?.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }, 60);
    return () => window.clearTimeout(id);
  }, [layoutKey]);

  // Le bouton qui portait le focus disparaît en fin de génération : le focus
  // passe au bouton suivant pour ne pas perdre le clavier.
  useEffect(() => {
    const target = focusNext.current === 'replay' && phase === 'done' ? replayRef.current
      : focusNext.current === 'gen' && phase === 'review' ? genRef.current
      : null;
    focusNext.current = null;
    if (!target) return;
    target.focus({ preventScroll: true });
    const id = window.setTimeout(() => {
      const behavior = reducedMotion() ? 'auto' : 'smooth';
      // Téléphone, fin de démo : la fenêtre s'aligne sur le bas de l'écran, la
      // barre reprend sa place sous « Vos décisions » au lieu de les recouvrir.
      if (phase === 'done' && window.matchMedia('(max-width: 39.99rem)').matches) {
        rootRef.current?.scrollIntoView({ block: 'end', behavior });
      } else {
        footRef.current?.scrollIntoView({ block: 'nearest', behavior });
      }
    }, RESIZE_MS + 60);
    return () => window.clearTimeout(id);
  }, [phase]);

  const reviewed = ITEMS.filter((i) => verdicts[i.id] !== 'pending').length;
  const allReviewed = reviewed === ITEMS.length;
  const dropped = ITEMS.filter((i) => verdicts[i.id] === 'dropped');
  const ready = inReview && allReviewed;
  const kept = (id: string) => verdicts[id] === 'kept';

  const docs: ReadonlyArray<{ id: string; icon: 'file' | 'mail'; label: string; detail: string }> = [
    {
      id: 'cv',
      icon: 'file',
      label: 'CV adapté',
      detail: kept('java') ? 'À votre charte, Java et Spring Boot en avant' : 'Dossier de compétences, à votre charte',
    },
    { id: 'client', icon: 'mail', label: 'E-mail au client', detail: 'Proposition de Camille Durand' },
    {
      id: 'consultant',
      icon: 'mail',
      label: 'E-mail à Camille',
      detail: kept('dispo') ? 'La mission et une question sur sa disponibilité' : 'Présentation de la mission',
    },
  ];

  const decide = (id: string, v: Verdict) => {
    if (phase !== 'review') return;
    setVerdicts((prev) => ({ ...prev, [id]: prev[id] === v ? 'pending' : v }));
  };

  const generate = () => {
    if (!ready) return;
    setPhase('generating');
    setMade(0);
    const bag = timers.current;
    docs.forEach((_, i) => {
      bag.ids.push(window.setTimeout(() => setMade(i + 1), DOC_MS * (i + 1)));
    });
    bag.ids.push(
      window.setTimeout(() => {
        if (document.activeElement === genRef.current) focusNext.current = 'replay';
        setPhase('done');
      }, DOC_MS * docs.length + 350),
    );
  };

  const reset = () => {
    timers.current.ids.forEach((id) => window.clearTimeout(id));
    timers.current.ids = [];
    focusNext.current = 'gen';
    setVerdicts(freshVerdicts());
    setMade(0);
    setPhase('review');
  };

  return (
    <div
      ref={rootRef}
      className="eg-glass eg-review"
      data-ui="window"
      role="group"
      aria-label="Exemple interactif : relire un positionnement proposé par l’IA"
      data-phase={phase}
    >
      <div className="eg-win__bar">
        <p className="eg-win__crumb">
          <span className="eg-crumb-pre">
            Positionnements <span aria-hidden>›</span>{' '}
          </span>
          Camille Durand
        </p>
        <span className="eg-chip eg-chip--ok">
          <span className="eg-dot" aria-hidden />
          Confiance élevée
        </span>
      </div>

      <div className="eg-review__body">
        <div className="eg-review__summary">
          <div className="eg-review__who">
            <p className="eg-review__name">Camille Durand</p>
            <p className="eg-review__role">{fr('Tech lead Java · 11 ans d’expérience')}</p>
          </div>
          <div className="eg-score" role="img" aria-label="Score : 84 sur 100">
            <svg viewBox="0 0 100 100" className="eg-score__ring" aria-hidden>
              <circle cx="50" cy="50" r="44" className="eg-score__track" />
              <circle cx="50" cy="50" r="44" className="eg-score__value" pathLength={100} strokeDasharray="84 100" />
            </svg>
            <span className="eg-score__num" aria-hidden>
              <span className="eg-score__n">84</span>
              <span className="eg-score__of">/100</span>
            </span>
          </div>
          <dl className="eg-review__facts">
            <div>
              <dt>Mission</dt>
              <dd>{fr('Tech lead Java · assureur, La Défense')}</dd>
            </div>
            <div>
              <dt>Score pondéré</dt>
              <dd>{fr('Fondé sur les 5 dernières années du parcours')}</dd>
            </div>
          </dl>
          <p className="eg-review__scorenote" data-changed={dropped.length > 0 || undefined}>
            <Info aria-hidden />
            <span>
              {dropped.length
                ? fr('Score inchangé : il dépend des points clés de la fiche.')
                : fr('Le score dépend des points clés de la fiche, pas de vos décisions.')}
            </span>
          </p>
        </div>

        <div className="eg-review__main">
          <div className="eg-review__stack" ref={stackRef}>
            {inReview ? (
              <div className="eg-pane" key="review">
                <div className="eg-review__head">
                  <p className="eg-review__title">À relire</p>
                  <p className="eg-count">{`${reviewed}/${ITEMS.length} relus`}</p>
                </div>
                <ul className="eg-points">
                  {ITEMS.map((item) => {
                    const v = verdicts[item.id];
                    const k = KIND[item.kind];
                    return (
                      <li key={item.id} className="eg-point" data-verdict={v}>
                        <div className="eg-point__body">
                          <span className={`eg-chip eg-chip--${k.tone}`}>{k.label}</span>
                          <p className="eg-point__text">{fr(item.text)}</p>
                          <p className="eg-quote">
                            <span className="eg-quote__label">Citation du CV</span>
                            {fr(item.quote)}
                          </p>
                          <p
                            className={`eg-point__note${v === 'kept' ? ' eg-point__note--ok' : ''}`}
                            data-empty={v === 'pending' || undefined}
                          >
                            {v === 'kept' ? (
                              <>
                                <Check aria-hidden />
                                {fr(item.kept)}
                              </>
                            ) : v === 'dropped' ? (
                              <>
                                <X aria-hidden />
                                {fr('Retiré de l’analyse')}
                              </>
                            ) : null}
                          </p>
                        </div>
                        <div className="eg-point__actions">
                          <button
                            type="button"
                            className="eg-ctl eg-ctl--keep"
                            aria-pressed={v === 'kept'}
                            onClick={() => decide(item.id, 'kept')}
                            aria-label={`Valider : ${item.text}`}
                          >
                            <Check aria-hidden />
                            Valider
                          </button>
                          <button
                            type="button"
                            className="eg-ctl eg-ctl--drop"
                            aria-pressed={v === 'dropped'}
                            onClick={() => decide(item.id, 'dropped')}
                            aria-label={`Écarter : ${item.text}`}
                          >
                            <X aria-hidden />
                            Écarter
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="eg-pane" key="docs">
                <div className="eg-review__head" ref={docsHeadRef}>
                  <p className="eg-review__title">Documents</p>
                  <p className="eg-count">{`${made}/${docs.length} prêts`}</p>
                </div>
                {/* L'aperçu occupe sa place dès le début de la génération (contenu
                    réel masqué sous un squelette) : rien ne bouge quand il apparaît. */}
                <div className="eg-docs__preview" data-ready={showPreview || undefined} aria-busy={!showPreview || undefined}>
                  <div className="eg-docs__preview-content" aria-hidden={!showPreview || undefined}>
                    {kept('dispo') ? (
                      <>
                        <p className="eg-docs__preview-label">{fr('Aperçu · e-mail à Camille')}</p>
                        <p className="eg-docs__preview-subj">
                          {fr('Objet : Mission tech lead Java, une question avant d’envoyer votre dossier')}
                        </p>
                        <p className="eg-docs__preview-text">
                          {fr(
                            'Bonjour Camille, une mission de tech lead Java chez un assureur de La Défense correspond à votre parcours. Avant de proposer votre dossier : êtes-vous disponible au 6 janvier ?',
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="eg-docs__preview-label">{fr('Aperçu · e-mail au client')}</p>
                        <p className="eg-docs__preview-subj">{fr('Objet : Tech lead Java, proposition de Camille Durand')}</p>
                        <p className="eg-docs__preview-text">
                          {fr(
                            'Bonjour, suite à votre demande, je vous propose Camille Durand, tech lead Java depuis six ans, qui encadre une équipe de 5 développeurs…',
                          )}
                        </p>
                      </>
                    )}
                  </div>
                  {showPreview ? null : (
                    <div className="eg-docs__preview-skeleton">
                      <p className="eg-docs__preview-label">{fr('Aperçu en cours de rédaction…')}</p>
                      <span className="eg-skel eg-skel--w1" />
                      <span className="eg-skel eg-skel--w2" />
                      <span className="eg-skel eg-skel--w2" />
                      <span className="eg-skel eg-skel--w4" />
                      <span className="eg-skel eg-skel--w2" />
                      <span className="eg-skel eg-skel--w3" />
                    </div>
                  )}
                </div>
                <ul className="eg-docs__list">
                  {docs.map((d, i) => {
                    const state = i < made ? 'done' : i === made && phase === 'generating' ? 'run' : 'wait';
                    return (
                      <li key={d.id} className="eg-doc" data-state={state}>
                        <span className="eg-doc__icon" aria-hidden>
                          {d.icon === 'file' ? <FileText /> : <Mail />}
                        </span>
                        <span className="eg-doc__text">
                          <span className="eg-doc__label">{fr(d.label)}</span>
                          <span className="eg-doc__detail">{d.detail}</span>
                        </span>
                        {state === 'done' ? (
                          <span className="eg-chip eg-chip--ok">
                            <Check aria-hidden />À relire
                          </span>
                        ) : state === 'run' ? (
                          <span className="eg-chip eg-chip--run">
                            <span className="eg-spin" aria-hidden />
                            Rédaction
                          </span>
                        ) : (
                          <span className="eg-chip">En attente</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="eg-effects">
                  <p className="eg-effects__label">Vos décisions, appliquées</p>
                  <ul className="eg-effects__list">
                    {ITEMS.map((item) => (
                      <li key={item.id} data-verdict={verdicts[item.id]}>
                        {verdicts[item.id] === 'dropped'
                          ? fr(`${item.short} : retiré de l’analyse.`)
                          : fr(item.effect)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="eg-review__foot" ref={footRef}>
        <p className="eg-review__status" id="eg-review-status" aria-live="polite">
          {phase === 'review' ? (
            allReviewed ? (
              <span>
                <strong>Tout est relu.</strong>{' '}
                {dropped.length
                  ? fr(`${dropped.length} point${dropped.length > 1 ? 's' : ''} retiré${dropped.length > 1 ? 's' : ''} de l’analyse ; score inchangé.`)
                  : 'Chaque point sera traité selon votre décision.'}
              </span>
            ) : (
              <span>Validez ou écartez chaque point pour générer le CV adapté.</span>
            )
          ) : phase === 'generating' ? (
            <span>
              <strong>Génération en cours.</strong> {fr('Un seul lancement à la fois.')}
            </span>
          ) : (
            <span className="eg-review__done">
              <Check aria-hidden />
              <span>
                <strong>{fr('CV adapté et e-mails prêts')}</strong>, à relire avant envoi.
              </span>
            </span>
          )}
        </p>
        {phase === 'done' ? (
          <button ref={replayRef} type="button" className="eg-btn eg-btn--quiet" onClick={reset}>
            <RotateCcw aria-hidden />
            Rejouer l’exemple
          </button>
        ) : (
          <button
            ref={genRef}
            type="button"
            className="eg-btn eg-btn--primary"
            aria-disabled={!ready || undefined}
            data-loading={phase === 'generating' || undefined}
            aria-describedby="eg-review-status"
            onClick={generate}
          >
            {phase === 'generating' ? (
              <>
                <span className="eg-spin" aria-hidden />
                Génération…
              </>
            ) : ready ? (
              'Générer le CV adapté'
            ) : (
              <>
                <Lock aria-hidden />
                Générer le CV adapté
                <span className="eg-btn__count">{`${reviewed}/${ITEMS.length} relus`}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
