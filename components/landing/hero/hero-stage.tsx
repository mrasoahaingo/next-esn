'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Stage } from '@/components/stageshow/kit/stage';
import type { Act, Script } from '@/components/stageshow/kit/act';
import { HeroReview, type HeroReviewApi } from '@/components/landing/hero-review';
import './hero-stage.css';

/**
 * La fenêtre du héros jouée une fois, comme une démonstration (gold
 * `hero-demo` : temps nommés, curseur, un satellite qui vient devant), puis
 * rendue au visiteur. Ce n'est pas une copie : c'est la vraie fenêtre
 * (HeroReview), pilotée par le script avec sa propre logique.
 *
 * Temps (voir REHEARSAL.md) : 1 le curseur valide le point fort (sa
 * conséquence, 1/3 relus) ; 2 il ouvre la citation du CV du point faible ;
 * 3 il valide « À clarifier » (la citation se referme, question ajoutée à
 * l'e-mail, 2/3) ; 4 il sort ; 5 la carte « Extraction 5/5 · Validé » vient
 * devant, au bord de la fenêtre. Le point faible reste au visiteur,
 * « Générer » reste verrouillé.
 *
 * Poster = l'état final (rendu serveur, sans script, mouvement réduit, sous
 * 60rem). Avec script et mouvement, à partir de 60rem, la fenêtre est masquée
 * dès la première peinture (CSS, html.m-enter) le temps de revenir à la
 * relecture vierge, puis entre en fondu et joue : rien ne recule sous les
 * yeux. Un appui ou une touche du visiteur, n'importe où, arrête tout net à
 * l'état de ce moment ; s'il quitte la scène des yeux (défilement, autre
 * onglet), elle ne reprend pas : il retrouve la fenêtre où il l'a laissée.
 */
type S = { sat: boolean };
const initial: S = { sat: false };
const poster: S = { sat: true };

const WIDE = '(min-width: 60rem) and (prefers-reduced-motion: no-preference)';
const subscribe = (cb: () => void): (() => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

/**
 * Ramène une cible à l'écran dans la fenêtre qui défile (et elle seule : la
 * page ne bouge jamais), si elle n'y est pas. Mesuré en pixels de la scène
 * (a.rect), pas à l'écran : la scène est inclinée en 3D au bureau.
 */
async function reveal(a: Act<S>, name: string): Promise<void> {
  const box = document.querySelector<HTMLElement>('.eg-hero .eg-hero__window');
  if (!box) return;
  const r = a.rect(name);
  const b = a.rect('hero-window');
  if (!r.height || (r.y >= b.y + 8 && r.y + r.height <= b.y + b.height - 72)) return;
  box.scrollBy({ top: r.y - b.y - b.height * 0.4, behavior: 'smooth' });
  await a.wait(500);
}

export function HeroStage(): React.JSX.Element {
  const api = useRef<HeroReviewApi | null>(null);
  const played = useRef(false);
  const [live, setLive] = useState(false);
  const [halted, setHalted] = useState(false);
  const wide = useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);

  const script = useMemo<Script<S> | undefined>(() => {
    if (!wide) return undefined;
    return async (a: Act<S>) => {
      // Une seule lecture : interrompue hors champ, la scène ne rejoue pas
      // (ce serait reculer sous les yeux) ; la carte reprend sa place.
      if (played.current) {
        a.put({ sat: true });
        setHalted(true);
        return;
      }
      played.current = true;
      // Ouverture, masquée : la relecture vierge, puis la fenêtre entre.
      api.current?.restart();
      setLive(true);
      await a.wait(1400);

      // 1. Le point fort : valider, la conséquence s'écrit, 1/3 relus.
      a.mark('fort');
      await reveal(a, 'keep-java');
      await a.move({ at: 'keep-java', x: 0.8, y: 0.7 });
      await a.wait(220);
      await a.click();
      api.current?.decide('java', 'kept');
      await a.wait(1300);

      // 2. Le point faible : ouvrir sa citation du CV, la lire.
      a.mark('citation');
      await reveal(a, 'quote-kafka');
      await a.move({ at: 'quote-kafka', x: 0.1, y: 0.9 });
      await a.wait(200);
      await a.click();
      api.current?.quote('kafka');
      await a.wait(350);
      // Le curseur se range hors de la carte, dans l'allée entre la citation
      // et les boutons, le temps de la lire.
      const aisle = a.rect('drop-kafka');
      await a.move({ x: aisle.x - 12, y: aisle.y + aisle.height * 0.5 });
      await a.wait(1700);

      // 3. « À clarifier » : la citation refermée, valider ; la question part
      // dans l'e-mail au consultant, 2/3 relus.
      a.mark('clarifier');
      await a.move({ at: 'quote-kafka', x: 0.97, y: 0.7 });
      await a.wait(150);
      await a.click();
      api.current?.quote(null);
      await a.wait(250);
      await reveal(a, 'keep-dispo');
      await a.move({ at: 'keep-dispo', x: 0.8, y: 0.7 });
      await a.wait(200);
      await a.click();
      api.current?.decide('dispo', 'kept');
      await a.wait(1400);

      // 4. Le curseur sort, par la droite.
      a.mark('sortie');
      const frame = a.rect('hero-window');
      await a.move({ x: frame.x + frame.width + 48, y: frame.y + frame.height * 0.72 });

      // 5. Le satellite vient devant, au bord de la fenêtre.
      a.mark('satellite');
      a.put({ sat: true });
      await a.wait(2200);
    };
  }, [wide]);

  // La main au visiteur : un appui ou une touche, n'importe où sur la page,
  // arrête la scène net (les événements du script ne sont pas « isTrusted »).
  useEffect(() => {
    if (!wide || halted) return;
    const takeOver = (e: Event) => {
      if (!e.isTrusted) return;
      setHalted(true);
      setLive(true);
    };
    document.addEventListener('pointerdown', takeOver, true);
    document.addEventListener('keydown', takeOver, true);
    return () => {
      document.removeEventListener('pointerdown', takeOver, true);
      document.removeEventListener('keydown', takeOver, true);
    };
  }, [wide, halted]);

  return (
    // data-ss-tilt : au bureau, la fenêtre, la carte de citation, le satellite
    // et le curseur sont posés ensemble sur un plan incliné (hero-stage.css) ;
    // la scène mesure alors ses cibles dans la mise en page, pas à l'écran.
    <div className="eg-hero__live" data-live={live || undefined} data-ss-tilt>
      <Stage<S>
        width={596}
        height={716}
        fluid
        initial={initial}
        poster={poster}
        script={script}
        play="once"
        rewind={false}
        halt={halted}
        cursor={halted || !wide ? undefined : { at: { x: 540, y: 640 }, idle: 1600 }}
        theme="dark"
        className="eg-ss-hero"
      >
        {(s) => (
          <>
            <div className="eg-hero__window" data-target="hero-window">
              <HeroReview apiRef={api} />
            </div>
            <div className="eg-float ly-float" data-in={s.sat || undefined}>
              <p className="eg-float__row">
                <span className="eg-float__live">Extraction 5/5</span>
                <span className="eg-float__ok">Validé</span>
              </p>
              <p className="eg-float__title">CV_Camille_Durand.pdf</p>
            </div>
          </>
        )}
      </Stage>
    </div>
  );
}
