'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { RotateCcw } from 'lucide-react';
import { ExtractStage } from '@/components/landing/stage/extract-stage';
import { MissionStage } from '@/components/landing/stage/mission-stage';
import { RankingStage } from '@/components/landing/stage/ranking-stage';
import { EmailStage } from '@/components/landing/stage/email-stage';
import './stage.css';

/**
 * Une scène de la visite et son bouton « Rejouer ». Chaque scène joue une fois
 * quand elle entre à l'écran (Stage play="once") et garde son état final.
 * « Rejouer » ne coupe pas : le contenu de la fenêtre sort en fondu (la
 * fenêtre reste), la scène est remontée sur son ouverture (references/kit.md,
 * Explicit replay), son contenu revient en fondu, puis elle joue. Rien n'est
 * lié au défilement. Le bouton n'existe qu'une fois la page hydratée : sans
 * script, la scène reste sur son poster et il n'y a rien à rejouer.
 */
const noop = (): (() => void) => () => {};
const LEAVE_MS = 280;
const SCENES = {
  extract: { C: ExtractStage, label: 'Rejouer l’animation : le CV devient une fiche' },
  mission: { C: MissionStage, label: 'Rejouer l’animation : la fiche de mission' },
  ranking: { C: RankingStage, label: 'Rejouer l’animation : le classement des profils' },
  email: { C: EmailStage, label: 'Rejouer l’animation : l’e-mail au consultant' },
} as const;

export function TourStage({ scene }: { scene: keyof typeof SCENES }): React.JSX.Element {
  const [run, setRun] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(0);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const { C, label } = SCENES[scene];
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const replay = (): void => {
    if (leaving) return;
    setLeaving(true);
    timer.current = window.setTimeout(() => {
      setRun((n) => n + 1);
      setLeaving(false);
    }, LEAVE_MS);
  };
  return (
    <div className="eg-tour-stage" data-leaving={leaving || undefined}>
      {/* data-ui : une interface de produit, pas une section de page (les règles
          de rythme de la page ne s'y appliquent pas). */}
      <div data-ui="window" data-replay={run > 0 || undefined}>
        <C key={run} autoplay={run > 0} />
      </div>
      {hydrated ? (
        <button type="button" className="eg-replay" aria-label={label} onClick={replay}>
          <RotateCcw aria-hidden />
          Rejouer
        </button>
      ) : null}
    </div>
  );
}
