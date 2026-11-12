'use client';

import { Badge, Bar, Stage, Window, type Act } from '@/components/landing/stage/kit';

/**
 * Écran 2 (golds « choreography » et « loading ») : la demande décortiquée.
 * Le niveau attendu roule à sa valeur ; les quatre points clés, en squelette à
 * leur géométrie, se résolvent dans l'ordre d'importance, leur niveau un temps
 * après chacun (réponses dépendantes), puis le point à clarifier arrive. Rien
 * ne revient en arrière ; poster = la fiche entière.
 */
const POINTS: ReadonlyArray<{ text: string; tier: string; tone: 'accent' | 'neutral'; sk: number }> = [
  { text: 'Java et Spring Boot', tier: 'Indispensable', tone: 'accent', sk: 132 },
  { text: 'Encadrement d’équipe', tier: 'Indispensable', tone: 'accent', sk: 148 },
  { text: 'Kafka, architecture événementielle', tier: 'Souhaité', tone: 'neutral', sk: 196 },
  { text: 'Culture assurance', tier: 'Bonus', tone: 'neutral', sk: 118 },
];

type S = { level: boolean; points: number; tiers: number; clarify: boolean };
const initial: S = { level: false, points: 0, tiers: 0, clarify: false };
const poster: S = { level: true, points: POINTS.length, tiers: POINTS.length, clarify: true };

async function script(a: Act<S>): Promise<void> {
  await a.wait(600);
  a.mark('level');
  a.put({ level: true });
  await a.wait(700);
  a.mark('points');
  for (let i = 1; i <= POINTS.length; i++) {
    a.put({ points: i });
    await a.wait(260);
    a.put({ tiers: i });
    await a.wait(300);
  }
  await a.wait(300);
  a.mark('clarify');
  a.put({ clarify: true });
  await a.wait(2800);
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
              {/* Les deux valeurs dans la même case : l'ancienne sort vers le haut,
                  la nouvelle monte en place ; la case ne change pas de taille. */}
              <span className="esm-level__value eg-swap" data-on={s.level || undefined}>
                <span className="eg-swap__from">Analyse en cours</span>
                <span className="eg-swap__to">Senior, 8 ans et plus</span>
              </span>
            </div>
            <div className="esm-label">Points clés, par importance</div>
            {POINTS.map((p, i) => (
              <div key={p.text} className="esm-point" data-ready={s.points > i || undefined}>
                <span className="esm-point__rank">{i + 1}</span>
                <span className="esx-slot">
                  <Bar w={p.sk} h={8} r={4} tone={2} className="esx-sk" />
                  <span className="esm-point__text">{p.text}</span>
                </span>
                {/* Le niveau a sa place dès le squelette (une pastille vide à sa
                    taille), puis le badge s'y pose en fondu. */}
                <span className="esm-tier" data-on={s.tiers > i || undefined}>
                  <Bar w={p.tier.length * 6.4 + 18} h={20} r={10} tone={1} className="esm-tier__sk" />
                  <span className="esm-tier__badge">
                    <Badge tone={p.tone}>{p.tier}</Badge>
                  </span>
                </span>
              </div>
            ))}
            <div className="esm-clarify" data-on={s.clarify || undefined}>
                <div className="esm-label">À clarifier avant de répondre</div>
                <div className="esm-point" data-ready>
                  <span className="esm-point__rank">?</span>
                  <span className="esm-point__text">Télétravail : non précisé</span>
                  <Badge tone="warning">À clarifier</Badge>
                </div>
            </div>
          </div>
        </Window>
      )}
    </Stage>
  );
}
