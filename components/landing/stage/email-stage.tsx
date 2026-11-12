'use client';

import Image from 'next/image';
import { Badge, Bar, Stage, Stream, type Act } from '@/components/landing/stage/kit';

/**
 * Écran 4, composition « cartes empilées » (gold `stacked-cards`) : deux
 * cartes de même largeur et même bord gauche, à 12 px l'une de l'autre : en
 * haut, le plus grand, le brouillon d'e-mail (le sujet, ce que l'œil voit
 * d'abord) ; dessous, une bande plus courte, la photo du face-à-face cadrée
 * sur les visages (le temps rendu au contact), sa mention sous l'image. Mouvement (gold « ai-chat ») : « Rédaction du brouillon… » et son squelette
 * tiennent un temps, puis sortent entièrement (comme « Thinking ») ; alors
 * seulement l'e-mail au consultant s'écrit mot à mot, chaque mot déjà à sa
 * place (pas de reflux), vouvoyé, avec la question de disponibilité. Il reste
 * un brouillon à relire : rien ne part seul. Poster = le brouillon complet.
 * Pas d'étincelle, pas de violet.
 */
// Espaces insécables (6 janvier, espace fine avant le point d'interrogation) :
// collés en fin de ligne, ils comptent pour un seul mot dans le flux.
const BODY =
  'Bonjour Camille, une mission de tech lead Java chez un assureur de La Défense correspond à votre parcours. Avant de proposer votre dossier au client, pouvez-vous me confirmer votre disponibilité au 6 janvier ?';
const WORDS = BODY.split(' ').length;
const PHOTO = {
  src: '/media/esneo/face-a-face.webp',
  alt: 'Dans un open space parisien, une ingénieure d’affaires et un consultant rient ensemble devant un ordinateur posé sur une table haute.',
};

type S = { cleared: boolean; words: number; done: boolean };
const initial: S = { cleared: false, words: 0, done: false };
const poster: S = { cleared: true, words: WORDS, done: true };

async function script(a: Act<S>): Promise<void> {
  a.mark('drafting');
  await a.wait(1500);
  // Le squelette sort d'abord (220 ms), puis le premier mot arrive
  a.mark('clear');
  a.put({ cleared: true });
  // Le premier mot entre pendant que le squelette finit de sortir : pas de blanc.
  await a.wait(120);
  a.mark('stream');
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
      width={657}
      height={500}
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
        <div className="ese-stack">
          <section className="ese-card">
            <p className="ese-card__kind">Brouillon d’e-mail</p>
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
                  squelette est posé dessus et sort avant le premier mot : rien ne
                  se remet en page, rien ne se superpose, le pied ne bouge pas. */}
              <div className="ese-draft" data-cleared={s.cleared || undefined}>
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
          </section>
          <figure className="ese-photo">
            <Image src={PHOTO.src} alt={PHOTO.alt} fill sizes="(min-width: 64rem) 560px, 100vw" />
            <figcaption className="eg-credit">Photographie générée par IA, personnes fictives</figcaption>
          </figure>
        </div>
      )}
    </Stage>
  );
}
