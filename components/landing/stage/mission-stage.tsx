'use client';

import { Badge, Bar, Roll, Stage, Window, type Act } from '@/components/landing/stage/kit';

/**
 * Écran 2 (golds « choreography » et « loading ») : la demande du client,
 * posée au-dessus de la fenêtre (hors de la scène, elle suit ses repères
 * `data-ss-m1` à `data-ss-m4`), est la source. Le niveau attendu roule à sa
 * valeur ; les deux points indispensables se résolvent ensemble (60 ms
 * d'écart), puis le souhaité, puis le bonus ; à chaque point, le passage de
 * la demande d'où il sort se marque, et son niveau se pose un temps après
 * (réponses dépendantes). Le point à clarifier, en squelette dès le départ,
 * se résout en dernier. Chaque barre part avant que ses mots n'arrivent ;
 * rien ne revient en arrière. Poster = la fiche entière, passages marqués.
 */
const POINTS: ReadonlyArray<{ text: string; tier: string; tone: 'accent' | 'neutral'; low?: boolean; sk: number }> = [
  { text: 'Java et Spring Boot', tier: 'Indispensable', tone: 'accent', sk: 132 },
  { text: 'Encadrement d’équipe', tier: 'Indispensable', tone: 'accent', sk: 148 },
  { text: 'Kafka, architecture événementielle', tier: 'Souhaité', tone: 'neutral', sk: 196 },
  { text: 'Culture assurance', tier: 'Bonus', tone: 'neutral', low: true, sk: 118 },
];

type S = { level: boolean; points: number; tiers: number; clarify: boolean };
const initial: S = { level: false, points: 0, tiers: 0, clarify: false };
const poster: S = { level: true, points: POINTS.length, tiers: POINTS.length, clarify: true };

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
  for (const n of [3, 4]) {
    a.put({ points: n });
    await a.wait(320);
    a.put({ tiers: n });
    await a.wait(420);
  }
  await a.wait(250);
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

export function MissionStage({ autoplay = false }: { autoplay?: boolean }): React.JSX.Element {
  return (
    <Stage<S>
      width={560}
      height={450}
      fluid
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      autoplay={autoplay}
      theme="dark"
      className="eg-ss esm"
    >
      {(s) => (
        <>
          {/* Repères lus par la demande du client (hors scène) avec :has() :
              le passage n se marque quand le point n arrive. */}
          <i
            className="eg-ss-state"
            data-ss-m1={s.points > 0 || undefined}
            data-ss-m2={s.points > 1 || undefined}
            data-ss-m3={s.points > 2 || undefined}
            data-ss-m4={s.points > 3 || undefined}
            hidden
          />
          <Window title="Fiche de mission">
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
                  <Tier on={s.tiers > i} tone={p.tone} low={p.low}>
                    {p.tier}
                  </Tier>
                </div>
              ))}
              {/* Le point à clarifier a sa place dès le départ, en squelette. */}
              <div className="esm-label esm-label--clarify">À clarifier avant de répondre</div>
              <div className="esm-point esm-point--clarify" data-ready={s.clarify || undefined}>
                <span className="esm-point__rank">?</span>
                <span className="esx-slot">
                  <Bar w={150} h={8} r={4} tone={2} className="esx-sk" />
                  <span className="esm-point__text">Télétravail : non précisé</span>
                </span>
                <Tier on={s.clarify} tone="warning">
                  À clarifier
                </Tier>
              </div>
            </div>
          </Window>
        </>
      )}
    </Stage>
  );
}
