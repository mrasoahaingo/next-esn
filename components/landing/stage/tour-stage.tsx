'use client';

import { useState, useSyncExternalStore } from 'react';
import { RotateCcw } from 'lucide-react';
import { ExtractStage } from '@/components/landing/stage/extract-stage';
import { MissionStage } from '@/components/landing/stage/mission-stage';
import { RankingStage } from '@/components/landing/stage/ranking-stage';
import { EmailStage } from '@/components/landing/stage/email-stage';
import './stage.css';

/**
 * Une scène de la visite et son bouton « Rejouer ». Chaque scène joue une fois
 * quand elle entre à l'écran (Stage play="once") et garde son état final ; le
 * bouton la remonte à son départ (references/kit.md, Explicit replay). Rien
 * n'est lié au défilement. Le bouton n'existe qu'une fois la page hydratée :
 * sans script, la scène reste sur son poster et il n'y a rien à rejouer.
 */
const noop = (): (() => void) => () => {};
const SCENES = {
  extract: { C: ExtractStage, label: 'Rejouer l’animation : le CV devient une fiche' },
  mission: { C: MissionStage, label: 'Rejouer l’animation : la fiche de mission' },
  ranking: { C: RankingStage, label: 'Rejouer l’animation : le classement des profils' },
  email: { C: EmailStage, label: 'Rejouer l’animation : l’e-mail au consultant' },
} as const;

export function TourStage({ scene }: { scene: keyof typeof SCENES }): React.JSX.Element {
  const [run, setRun] = useState(0);
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const { C, label } = SCENES[scene];
  return (
    <div className="eg-tour-stage">
      {/* data-ui : une interface de produit, pas une section de page (les règles de
          rythme de la page ne s'y appliquent pas). Au montage, la scène joue en
          entrant à l'écran ; après « Rejouer », tout de suite. */}
      <div data-ui="window">
        <C key={run} autoplay={run > 0} />
      </div>
      {hydrated ? (
        <button type="button" className="eg-replay" aria-label={label} onClick={() => setRun((n) => n + 1)}>
          <RotateCcw aria-hidden />
          Rejouer
        </button>
      ) : null}
    </div>
  );
}
