'use client';

import { Badge, Bar, Stage, Stream, Window, type Act } from '@/components/landing/stage/kit';

/**
 * Écran 4 (gold « ai-chat ») : l'e-mail au consultant s'écrit mot à mot, chaque
 * mot déjà à sa place (pas de reflux), vouvoyé, avec la question de
 * disponibilité. Il reste un brouillon à relire : rien ne part seul. Poster =
 * le brouillon complet. Pas d'étincelle, pas de violet.
 */
// Espaces insécables (6 janvier, espace fine avant le point d'interrogation) :
// collés en fin de ligne, ils comptent pour un seul mot dans le flux.
const BODY =
  'Bonjour Camille, une mission de tech lead Java chez un assureur de La Défense correspond à votre parcours. Avant de proposer votre dossier au client, pouvez-vous me confirmer votre disponibilité au 6 janvier ?';
const WORDS = BODY.split(' ').length;

type S = { phase: 'drafting' | 'writing'; words: number; done: boolean };
const initial: S = { phase: 'drafting', words: 0, done: false };
const poster: S = { phase: 'writing', words: WORDS, done: true };

async function script(a: Act<S>): Promise<void> {
  a.mark('drafting');
  await a.wait(1400);
  a.mark('stream');
  a.put({ phase: 'writing' });
  for (let i = 1; i <= WORDS; i++) {
    a.put({ words: i });
    await a.wait(55);
  }
  await a.wait(350);
  a.mark('done');
  a.put({ done: true });
  await a.wait(2800);
}

export function EmailStage({ autoplay = false }: { autoplay?: boolean }): React.JSX.Element {
  return (
    <Stage<S>
      width={620}
      height={300}
      fluid
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      autoplay={autoplay}
      theme="dark"
      className="eg-ss ese"
    >
      {(s) => (
        <Window title="E-mail à Camille">
          <div className="eg-ss-body">
            <div className="ese-field">
              <span className="ese-field__label">À</span>
              <span className="ese-field__value">Camille Durand</span>
            </div>
            <div className="ese-field">
              <span className="ese-field__label">Objet</span>
              <span className="ese-field__value">Mission tech lead Java, une question avant d’envoyer votre dossier</span>
            </div>
            {/* Le texte occupe sa place dès le départ (mots cachés, Stream) ; le
                squelette est posé dessus et s'efface quand les premiers mots
                arrivent : rien ne se remet en page, le pied ne bouge pas. */}
            <div className="ese-draft" data-writing={s.words >= 3 || undefined}>
              <Stream className="ese-text" text={BODY} count={s.words} />
              <div className="ese-drafting" aria-hidden>
                <span>Rédaction du brouillon…</span>
                <Bar w="100%" h={8} r={4} tone={2} />
                <Bar w="94%" h={8} r={4} tone={2} />
                <Bar w="58%" h={8} r={4} tone={2} />
              </div>
            </div>
            <div className="ese-foot" data-on={s.done || undefined}>
              <Badge tone="accent">Brouillon à relire</Badge>
            </div>
          </div>
        </Window>
      )}
    </Stage>
  );
}
