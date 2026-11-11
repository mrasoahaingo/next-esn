'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { fr } from '@/components/site/fr';

/**
 * Fragment vivant du héros : un positionnement tel que l'IA le propose, que le
 * visiteur relit point par point. « Générer le CV adapté » reste bloqué tant que
 * tout n'est pas relu, puis pendant la génération (pas de doublon). Contenu
 * d'exemple : consultant et mission fictifs.
 */

type Verdict = 'pending' | 'kept' | 'dropped';
type Kind = 'fort' | 'ecart' | 'clarifier';

const ITEMS: { id: string; kind: Kind; text: string; quote?: string }[] = [
  {
    id: 'java',
    kind: 'fort',
    text: 'Java 17 et Spring Boot : 6 ans, dont la mission en cours',
    quote: '« Migration du moteur de tarification vers Spring Boot 3 (2024) »',
  },
  {
    id: 'lead',
    kind: 'fort',
    text: 'Encadre une équipe de 5 développeurs depuis 2022',
    quote: '« Tech lead d’une squad de 5 développeurs, revues de code »',
  },
  { id: 'kafka', kind: 'ecart', text: 'Kafka : une seule mention, sur un projet de 2019' },
  { id: 'dispo', kind: 'clarifier', text: 'Disponibilité au 6 janvier, non précisée dans le CV' },
];

const KIND_LABEL: Record<Kind, { label: string; chip: string }> = {
  fort: { label: 'Point fort', chip: 'ui-chip' },
  ecart: { label: 'Point faible', chip: 'ui-chip ui-chip--warn' },
  clarifier: { label: 'À clarifier', chip: 'ui-chip ui-chip--grey' },
};

type Phase = 'review' | 'generating' | 'done';

export function HeroPositioning() {
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>(
    () => Object.fromEntries(ITEMS.map((i) => [i.id, 'pending'])) as Record<string, Verdict>,
  );
  const [phase, setPhase] = useState<Phase>('review');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replayRef = useRef<HTMLButtonElement>(null);
  const genRef = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef<'replay' | 'gen' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [stickyBar, setStickyBar] = useState(false);

  // Téléphone : la barre d'action ne colle au bas de l'écran qu'une fois
  // l'en-tête de la carte (nom, mission, score) passé, et tant que la carte est là.
  useEffect(() => {
    const head = headRef.current;
    const card = cardRef.current;
    if (!head || !card || !('IntersectionObserver' in window)) return;
    let headGone = false;
    let cardIn = true;
    const sync = () => setStickyBar(headGone && cardIn);
    const ioHead = new IntersectionObserver(([e]) => {
      headGone = !e.isIntersecting && e.boundingClientRect.top < 0;
      sync();
    });
    const ioCard = new IntersectionObserver(([e]) => {
      cardIn = e.isIntersecting;
      sync();
    });
    ioHead.observe(head);
    ioCard.observe(card);
    return () => {
      ioHead.disconnect();
      ioCard.disconnect();
    };
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Le bouton qui avait le focus disparaît à la fin de la génération : on le
  // rend au bouton suivant pour ne pas perdre le clavier.
  useEffect(() => {
    if (moveFocus.current === 'replay' && phase === 'done') replayRef.current?.focus();
    if (moveFocus.current === 'gen' && phase === 'review') genRef.current?.focus();
    moveFocus.current = null;
  }, [phase]);

  const reviewed = ITEMS.filter((i) => verdicts[i.id] !== 'pending').length;
  const allReviewed = reviewed === ITEMS.length;
  const dropped = ITEMS.filter((i) => verdicts[i.id] === 'dropped').length;

  const decide = (id: string, v: Verdict) => {
    if (phase !== 'review') return;
    setVerdicts((prev) => ({ ...prev, [id]: prev[id] === v ? 'pending' : v }));
  };

  const generate = () => {
    if (!allReviewed || phase !== 'review') return;
    setPhase('generating');
    timer.current = setTimeout(() => {
      if (document.activeElement === genRef.current) moveFocus.current = 'replay';
      setPhase('done');
    }, 2200);
  };

  const reset = () => {
    moveFocus.current = 'gen';
    setVerdicts(Object.fromEntries(ITEMS.map((i) => [i.id, 'pending'])) as Record<string, Verdict>);
    setPhase('review');
  };

  return (
    <div
      ref={cardRef}
      data-ui
      role="group"
      data-sticky={stickyBar}
      className="ui-card hp"
      aria-label="Exemple interactif : relire un positionnement proposé par l’IA"
    >
      <div className="hp__top" ref={headRef}>
        <div className="ui-row" style={{ justifyContent: 'space-between' }}>
          <span className="ui-muted hp__crumb">{fr('Positionnement · proposé par l’IA')}</span>
          <span className="ui-chip ui-chip--ok">
            <span className="ui-dot" />
            Confiance élevée
          </span>
        </div>
        <div className="hp__head">
          <div>
            <p className="hp__name">Camille Durand</p>
            <p className="ui-muted hp__mission">{fr('Mission : Tech lead Java · assureur, La Défense')}</p>
          </div>
          <div className="hp__score" aria-label="Score 84 sur 100">
            <span className="hp__score-n">84</span>
            <span className="ui-muted">/100</span>
          </div>
        </div>
        <p className="ui-muted hp__basis">Score fondé sur les 5 dernières années du parcours.</p>
      </div>

      <ul className="hp__list">
        {ITEMS.map((item) => {
          const v = verdicts[item.id];
          const k = KIND_LABEL[item.kind];
          return (
            <li key={item.id} className="hp__item" data-verdict={v}>
              <div className="hp__item-body">
                <span className={k.chip}>{k.label}</span>
                <p className="hp__text">{fr(item.text)}</p>
                {item.quote ? <p className="ui-muted hp__quote">{fr(`Citation du CV : ${item.quote}`)}</p> : null}
                {v === 'dropped' ? <p className="hp__note">{fr('Écarté : ne figurera pas dans le CV adapté.')}</p> : null}
              </div>
              <div className="hp__actions">
                <button
                  type="button"
                  className="ui-btn"
                  aria-pressed={v === 'kept'}
                  disabled={phase !== 'review'}
                  onClick={() => decide(item.id, 'kept')}
                  aria-label={`${v === 'kept' ? 'Validé' : 'Valider'} : ${item.text}`}
                >
                  <Check className="size-3.5" aria-hidden />
                  {v === 'kept' ? 'Validé' : 'Valider'}
                </button>
                <button
                  type="button"
                  className="ui-btn"
                  aria-pressed={v === 'dropped'}
                  disabled={phase !== 'review'}
                  onClick={() => decide(item.id, 'dropped')}
                  aria-label={`${v === 'dropped' ? 'Écarté' : 'Écarter'} : ${item.text}`}
                >
                  <X className="size-3.5" aria-hidden />
                  {v === 'dropped' ? 'Écarté' : 'Écarter'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="hp__foot">
        <div className="hp__progress" aria-live="polite">
          {phase === 'review' ? (
            <>
              <span className="hp__count">
                {reviewed}/{ITEMS.length} relus
              </span>
              <span className="ui-muted">
                {allReviewed
                  ? dropped
                    ? `${dropped} écarté${dropped > 1 ? 's' : ''}, le reste validé par vous`
                    : 'Tout est validé par vous'
                  : 'Rien ne part sans votre relecture'}
              </span>
            </>
          ) : phase === 'generating' ? (
            <>
              <span className="hp__count">Génération en cours</span>
              <span className="ui-muted">{fr('Un seul lancement à la fois')}</span>
            </>
          ) : (
            <>
              <span className="hp__count hp__count--ok">
                <Check className="size-4" aria-hidden />
                CV adapté et e-mails prêts
              </span>
              <span className="ui-muted">{fr('À relire avant envoi')}</span>
            </>
          )}
        </div>
        {phase === 'done' ? (
          <button ref={replayRef} type="button" className="ui-btn" onClick={reset}>
            <RotateCcw className="size-3.5" aria-hidden />
            Rejouer
          </button>
        ) : (
          <button
            ref={genRef}
            type="button"
            className="ui-btn ui-btn--primary"
            disabled={!allReviewed}
            aria-disabled={phase === 'generating' || undefined}
            onClick={generate}
          >
            {phase === 'generating' ? <span className="ui-spin" aria-hidden /> : null}
            {phase === 'generating' ? 'Génération…' : 'Générer le CV adapté'}
          </button>
        )}
      </div>
    </div>
  );
}
