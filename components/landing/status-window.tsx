'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { fr } from '@/components/site/fr';

/**
 * Fiabilité : le suivi de la semaine. Un traitement en cours bloque son bouton,
 * un échec affiche sa cause avec « Réessayer » (qui fonctionne ici), et rien ne
 * se génère avant relecture. Données fictives.
 */

type Retry = 'error' | 'retrying' | 'fixed';

/** Durée de la nouvelle tentative simulée (ms). */
const RETRY_MS = 1800;

export function StatusWindow(): React.JSX.Element {
  const [retry, setRetry] = useState<Retry>('error');
  const timer = useRef<{ id: number }>({ id: 0 });
  const retryRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<'back' | 'retry' | null>(null);

  useEffect(() => {
    const bag = timer.current;
    return () => window.clearTimeout(bag.id);
  }, []);

  useEffect(() => {
    if (focusNext.current === 'back' && retry === 'fixed') backRef.current?.focus();
    if (focusNext.current === 'retry' && retry === 'error') retryRef.current?.focus();
    focusNext.current = null;
  }, [retry]);

  const onRetry = () => {
    if (retry !== 'error') return;
    setRetry('retrying');
    timer.current.id = window.setTimeout(() => {
      if (document.activeElement === retryRef.current) focusNext.current = 'back';
      setRetry('fixed');
    }, RETRY_MS);
  };

  const onBack = () => {
    focusNext.current = 'retry';
    setRetry('error');
  };

  return (
    <div className="eg-glass eg-glass--blur eg-win eg-board" role="group" aria-label="Exemple : suivi des traitements de la semaine">
      <div className="eg-win__bar">
        <p className="eg-win__crumb">Suivi de la semaine</p>
        <span className="eg-count">4 consultants</span>
      </div>
      <ul className="eg-board__rows">
        <li className="eg-line">
          <span className="eg-line__who">
            <span className="eg-line__name">Thomas Leroy</span>
            <span className="eg-line__mission">DevOps Kubernetes · énergéticien</span>
          </span>
          <span className="eg-chip eg-chip--run">
            <span className="eg-spin" aria-hidden />
            Analyse 3/5
          </span>
          <span className="eg-line__act">
            <button type="button" className="eg-ctl" disabled aria-describedby="eg-lock-hint">
              <RotateCcw aria-hidden />
              Relancer
            </button>
            <span id="eg-lock-hint" className="eg-line__hint">
              Bloqué tant que l’analyse tourne
            </span>
          </span>
        </li>

        <li className="eg-line eg-line--focus" data-state={retry}>
          <span className="eg-line__who">
            <span className="eg-line__name">Sarah Cohen</span>
            <span className="eg-line__mission">Développeuse React · mutuelle</span>
          </span>
          {retry === 'error' ? (
            <span className="eg-chip eg-chip--err">
              <AlertTriangle aria-hidden />
              Échec
            </span>
          ) : retry === 'retrying' ? (
            <span className="eg-chip eg-chip--run">
              <span className="eg-spin" aria-hidden />
              Extraction 2/5
            </span>
          ) : (
            <span className="eg-chip eg-chip--ok">
              <Check aria-hidden />
              Fiche à relire
            </span>
          )}
          <span className="eg-line__act">
            {retry === 'fixed' ? (
              <button ref={backRef} type="button" className="eg-ctl" onClick={onBack}>
                Revoir l’échec
              </button>
            ) : (
              <button
                ref={retryRef}
                type="button"
                className="eg-ctl eg-ctl--accent"
                aria-disabled={retry === 'retrying' || undefined}
                data-loading={retry === 'retrying' || undefined}
                onClick={onRetry}
              >
                {retry === 'retrying' ? <span className="eg-spin" aria-hidden /> : <RotateCcw aria-hidden />}
                {retry === 'retrying' ? 'Nouvelle tentative…' : 'Réessayer'}
              </button>
            )}
          </span>
          <p className="eg-line__detail" aria-live="polite">
            {retry === 'error'
              ? fr('L’extraction a échoué sur la rubrique « Expériences » : délai dépassé. Le CV d’origine est intact.')
              : retry === 'retrying'
                ? fr('Nouvelle tentative en cours. Un seul lancement à la fois : le bouton reste bloqué jusqu’à la fin.')
                : fr('Extraction terminée : 5 rubriques lues, la fiche attend votre relecture.')}
          </p>
        </li>

        <li className="eg-line">
          <span className="eg-line__who">
            <span className="eg-line__name">Camille Durand</span>
            <span className="eg-line__mission">Tech lead Java · assureur</span>
          </span>
          <span className="eg-chip eg-chip--warn">À valider</span>
          <span className="eg-line__act">
            <span className="eg-line__hint">{fr('Rien ne se génère avant votre relecture')}</span>
          </span>
        </li>

        <li className="eg-line">
          <span className="eg-line__who">
            <span className="eg-line__name">Léa Fontaine</span>
            <span className="eg-line__mission">QA automatisation · opérateur télécom</span>
          </span>
          <span className="eg-chip eg-chip--ok">
            <Check aria-hidden />
            Validé
          </span>
          <span className="eg-line__act">
            <span className="eg-line__hint">{fr('CV adapté prêt, e-mails à relire')}</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
