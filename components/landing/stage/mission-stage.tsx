'use client';

import { MoreHorizontal } from 'lucide-react';
import { Badge, Bar, Connector, Roll, Stage, Window, type Act } from '@/components/landing/stage/kit';
import { fr } from '@/components/site/fr';

/**
 * Écran 2, composition « panneau sur le produit » (gold `panel-annotation`) :
 * la fiche de mission est le produit, épinglée en haut à gauche ; la demande
 * du client est l'outil, un panneau de papier plus petit, devant, à cheval
 * sur le bord droit de la fenêtre, au-dessus de sa marge (jamais de la
 * liste). Mouvement (golds « choreography » et « loading ») : le niveau roule,
 * les deux indispensables se résolvent ensemble (60 ms), puis le souhaité,
 * puis le bonus ; à chaque point, le passage de la demande d'où il sort se
 * marque. Une seule ligne, après coup, en encre neutre : du passage cité au
 * point qu'il a produit, par le sol vide. Le point à clarifier, en squelette
 * dès le départ, se résout en dernier. Compact : la demande réduite à une
 * puce posée sur la barre de titre, son premier passage marqué, sans ligne.
 */
const POINTS: ReadonlyArray<{ text: string; tier: string; tone: 'accent' | 'neutral'; low?: boolean; sk: number }> = [
  { text: 'Java et Spring Boot', tier: 'Indispensable', tone: 'accent', sk: 118 },
  { text: 'Encadrement d’équipe', tier: 'Indispensable', tone: 'accent', sk: 132 },
  { text: 'Kafka, événementiel', tier: 'Souhaité', tone: 'neutral', sk: 110 },
  { text: 'Culture assurance', tier: 'Bonus', tone: 'neutral', low: true, sk: 104 },
];

type S = { level: boolean; points: number; tiers: number; link: boolean; clarify: boolean };
const initial: S = { level: false, points: 0, tiers: 0, link: false, clarify: false };
const poster: S = { level: true, points: POINTS.length, tiers: POINTS.length, link: true, clarify: true };

async function script(a: Act<S>): Promise<void> {
  await a.wait(700);
  a.mark('level');
  a.put({ level: true });
  await a.wait(650);
  a.mark('points');
  // Les deux indispensables ensemble (le décalage de 60 ms est dans le CSS)
  a.put({ points: 2 });
  await a.wait(380);
  a.put({ tiers: 2 });
  await a.wait(560);
  a.put({ points: 3 });
  await a.wait(320);
  a.put({ tiers: 3 });
  await a.wait(420);
  // Le dernier point et sa ligne ensemble : le passage s'allume, la ligne en
  // part pendant que le point entre (la cause, puis l'effet, sans retard).
  a.mark('link');
  a.put({ points: 4, link: true });
  await a.wait(320);
  a.put({ tiers: 4 });
  await a.wait(700);
  a.mark('clarify');
  a.put({ clarify: true });
  await a.wait(2800);
}

function Tier({ on, tone, low, children }: { on: boolean; tone: 'accent' | 'neutral' | 'warning'; low?: boolean; children: string }): React.JSX.Element {
  return (
    <span className="esm-tier" data-on={on || undefined} data-low={low || undefined}>
      <Bar w={children.length * 6.4 + 18} h={20} r={10} tone={1} className="esm-tier__sk" />
      <span className="esm-tier__badge">
        <Badge tone={tone}>{children}</Badge>
      </span>
    </span>
  );
}

/** Un passage de la demande d'où sort un point clé. */
function Src({ on, target, children }: { on: boolean; target?: string; children: string }): React.JSX.Element {
  return (
    <span className="esm-mail__src" data-on={on || undefined} data-target={target}>
      {children}
    </span>
  );
}

export function MissionStage({ autoplay = false }: { autoplay?: boolean }): React.JSX.Element {
  return (
    <Stage<S>
      width={560}
      height={424}
      fluid
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      autoplay={autoplay}
      theme="dark"
      className="eg-ss esm"
    >
      {(s, rect) => {
        const panel = rect('mail');
        const src = rect('src-4');
        const tier = rect('tier-4');
        // Compact : le panneau est en haut de la scène, et il n'y a pas de ligne.
        const wide = panel.width > 0 && panel.y > 60;
        return (
          <>
            <Window title="Fiche de mission" className="esm-win" toolbar={<MoreHorizontal size={16} aria-hidden />}>
              <div className="eg-ss-body">
                <div className="eg-ss-head">
                  <div>
                    <div className="eg-ss-title">Tech lead Java</div>
                    <div className="eg-ss-sub">Assureur IARD, La Défense · démarrage 6 janvier</div>
                  </div>
                </div>
                <div className="esm-level">
                  <span>Niveau attendu</span>
                  <span className="esm-level__value" data-on={s.level || undefined}>
                    <Roll>{s.level ? 'Senior, 8 ans et plus' : 'Analyse en cours'}</Roll>
                  </span>
                </div>
                <div className="esm-label">Points clés, par importance</div>
                {POINTS.map((p, i) => (
                  <div
                    key={p.text}
                    className="esm-point"
                    data-ready={s.points > i || undefined}
                    style={{ ['--d' as string]: `${i === 1 ? 60 : 0}ms` }}
                  >
                    <span className="esm-point__rank">{i + 1}</span>
                    <span className="esx-slot">
                      <Bar w={p.sk} h={8} r={4} tone={2} className="esx-sk" />
                      <span className="esm-point__text">{p.text}</span>
                    </span>
                    <span data-target={`tier-${i + 1}`}>
                      <Tier on={s.tiers > i} tone={p.tone} low={p.low}>
                        {p.tier}
                      </Tier>
                    </span>
                  </div>
                ))}
                {/* Le point à clarifier a sa place dès le départ, en squelette. */}
                <div className="esm-label esm-label--clarify">À clarifier avant de répondre</div>
                <div className="esm-point esm-point--clarify" data-ready={s.clarify || undefined}>
                  <span className="esm-point__rank">?</span>
                  <span className="esx-slot">
                    <Bar w={140} h={8} r={4} tone={2} className="esx-sk" />
                    <span className="esm-point__text">{fr('Télétravail : non précisé')}</span>
                  </span>
                  <Tier on={s.clarify} tone="warning">
                    À clarifier
                  </Tier>
                </div>
              </div>
            </Window>
            {/* La demande du client : du papier, devant, sur la marge droite. */}
            <section className="esm-mail" data-target="mail" aria-hidden>
              <p className="esm-mail__kind">Demande du client</p>
              <p className="esm-mail__subject">{fr('Objet : Tech lead Java H/F, démarrage le 6 janvier')}</p>
              <p className="esm-mail__body">
                <Src on={s.points > 0}>Java et Spring Boot</Src>
                {', pour '}
                <Src on={s.points > 1}>encadrer une équipe</Src>
                {' de 5. '}
                <Src on={s.points > 2}>Kafka apprécié</Src>
                {fr(' ; ')}
                <Src on={s.points > 3} target="src-4">
                  culture assurance
                </Src>
                {' en plus.'}
              </p>
            </section>
            {/* Compact : la demande réduite à une puce posée sur la barre de titre
                (chrome seul) ; son premier passage se marque comme au bureau. */}
            <p className="esm-chip" aria-hidden>
              <span className="esm-chip__kind">Demande du client</span>
              <Src on={s.points > 0}>Java et Spring Boot</Src>
            </p>
            {wide && tier.width > 0 && (
              <Connector
                show={s.link}
                from={{ x: src.x + src.width / 2, y: panel.y + panel.height + 6 }}
                to={{ x: tier.x + tier.width + 12, y: tier.y + tier.height / 2 }}
                route="v"
                className="esm-link"
              />
            )}
          </>
        );
      }}
    </Stage>
  );
}
