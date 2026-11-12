'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FileText } from 'lucide-react';
import { fr } from '@/components/site/fr';

/**
 * Visite, écran 1 : le CV en PDF devient une fiche. C'est le seul moment
 * orchestré de la page : quand la fenêtre entre à l'écran, les rubriques
 * passent une à une de « En attente » à « Lecture… » puis « Lu ».
 * Au repos (sans script, mouvement réduit, fenêtre déjà dépassée), la fiche
 * s'affiche directement terminée.
 */

const ROWS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Identité', value: 'Camille Durand · Tech lead Java' },
  { label: 'Expériences', value: '6 postes, 11 ans' },
  { label: 'Compétences', value: '24 relevées' },
  { label: 'Langues', value: 'Français, anglais C1' },
  { label: 'Formation', value: 'Master informatique, 2013' },
];

/** Dernier pas : toutes les rubriques lues, puis la fiche annoncée prête. */
const FINAL = ROWS.length * 2 + 1;
const TICK_MS = 380;

type RowState = 'wait' | 'run' | 'done';

const rowState = (tick: number, i: number): RowState =>
  tick >= 2 * i + 2 ? 'done' : tick >= 2 * i + 1 ? 'run' : 'wait';

export function ExtractWindow(): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(FINAL);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    let first = true;
    let armed = false;
    let timer = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (first) {
          first = false;
          // Fenêtre encore sous la ligne de flottaison : on prépare le départ.
          if (!entry.isIntersecting && entry.boundingClientRect.top > 0) {
            armed = true;
            setTick(0);
          } else {
            io.disconnect();
            return;
          }
        }
        if (armed && entry.intersectionRatio >= 0.55) {
          io.disconnect();
          let t = 0;
          timer = window.setInterval(() => {
            t += 1;
            setTick(t);
            if (t >= FINAL) window.clearInterval(timer);
          }, TICK_MS);
        }
      },
      { threshold: [0, 0.55] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  const done = ROWS.filter((_, i) => rowState(tick, i) === 'done').length;
  const finished = tick >= FINAL;

  return (
    <div ref={ref} className="eg-glass eg-glass--blur eg-win" data-tick={tick}>
      <div className="eg-win__bar">
        <p className="eg-win__crumb">
          <span className="eg-crumb-pre">
            Consultants <span aria-hidden>›</span>{' '}
          </span>
          Nouvelle fiche
        </p>
        {finished ? (
          <span className="eg-chip eg-chip--ok">
            <Check aria-hidden />
            Fiche prête à relire
          </span>
        ) : (
          <span className="eg-chip eg-chip--run">
            <span className="eg-spin" aria-hidden />
            Extraction {done}/{ROWS.length}
          </span>
        )}
      </div>
      <div className="eg-win__body">
        <div className="eg-file">
          <span className="eg-file__icon" aria-hidden>
            <FileText />
          </span>
          <span className="eg-file__main">
            <span className="eg-file__row">
              <span className="eg-file__name">CV_Camille_Durand.pdf</span>
              <span className="eg-file__size">{'412 Ko'}</span>
            </span>
            <span className="eg-bar" aria-hidden>
              <span style={{ transform: `scaleX(${finished ? 1 : Math.max(0.12, done / ROWS.length)})` }} />
            </span>
          </span>
        </div>
        <ul className="eg-rubrics">
          {ROWS.map((r, i) => {
            const s = rowState(tick, i);
            return (
              <li key={r.label} className="eg-rubric" data-state={s}>
                <span className="eg-rubric__icon" aria-hidden>
                  {s === 'done' ? <Check /> : s === 'run' ? <span className="eg-spin" /> : <span className="eg-rubric__wait" />}
                </span>
                <span className="eg-rubric__label">{r.label}</span>
                <span key={s} className="eg-rubric__value">
                  {s === 'done' ? fr(r.value) : s === 'run' ? 'Lecture…' : 'En attente'}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="eg-win__note">
          {fr('La fiche reste en lecture seule pendant l’extraction, puis devient modifiable.')}
        </p>
      </div>
    </div>
  );
}
