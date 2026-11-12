'use client';

import { Avatar, Badge, Count, Meter, Stage, Window, type Act } from '@/components/landing/stage/kit';

/**
 * Écran 3 (golds « reorder » et « table-edit ») : les scores arrivent un à un
 * en défilant jusqu'à leur valeur, puis, une fois tous connus (la cause
 * visible), les profils se rangent du plus proche au moins proche et le
 * premier prend la confiance élevée. Un score ne recule jamais ; poster = le
 * classement final.
 */
const PROFILES: ReadonlyArray<{ id: string; name: string; kind: string; score: number }> = [
  { id: 'hugo', name: 'Hugo Bernard', kind: 'En intercontrat', score: 69 },
  { id: 'camille', name: 'Camille Durand', kind: 'Consultante', score: 84 },
  { id: 'yanis', name: 'Yanis Belkacem', kind: 'Candidat', score: 77 },
];
const ARRIVAL = PROFILES.map((p) => p.id);
const RANKED = [...PROFILES].sort((x, y) => y.score - x.score).map((p) => p.id);

type S = { scored: number; order: string[]; top: boolean };
const initial: S = { scored: 0, order: ARRIVAL, top: false };
const poster: S = { scored: PROFILES.length, order: RANKED, top: true };

async function script(a: Act<S>): Promise<void> {
  await a.wait(600);
  a.mark('score');
  for (let i = 1; i <= PROFILES.length; i++) {
    a.put({ scored: i });
    await a.wait(650);
  }
  await a.wait(350);
  a.mark('rank');
  a.put({ order: RANKED });
  await a.wait(750);
  a.mark('top');
  a.put({ top: true });
  await a.wait(2800);
}

export function RankingStage({ autoplay = false }: { autoplay?: boolean }): React.JSX.Element {
  return (
    <Stage<S>
      width={720}
      height={412}
      fluid
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      autoplay={autoplay}
      theme="dark"
      className="eg-ss esr"
    >
      {(s) => (
        <Window title="Positionnements">
          <div className="eg-ss-body">
            <div className="eg-ss-head">
              <div>
                <div className="eg-ss-title">Tech lead Java</div>
                <div className="eg-ss-sub">Trois profils positionnés, classés par score</div>
              </div>
            </div>
            <div className="esr-list">
              {PROFILES.map((p, i) => {
                const known = s.scored > i;
                const slot = s.order.indexOf(p.id);
                const top = s.top && slot === 0;
                return (
                  <div key={p.id} className="esr-slot" style={{ '--slot': slot } as React.CSSProperties}>
                    <div className="esr-row" data-top={top || undefined}>
                      <Avatar name={p.name} size={32} />
                      <div style={{ minWidth: 0 }}>
                        <div className="esr-row__name">{p.name}</div>
                        <div className="esr-row__kind">{p.kind}</div>
                      </div>
                      <Meter value={known ? p.score / 100 : 0} tone={top ? 'accent' : 'ink'} className="esr-row__meter" />
                      {/* Pas de « 0 » inventé : un tiret tant que le score n'est pas
                          calculé, puis le chiffre roule jusqu'à sa valeur. */}
                      <span className="esr-row__score" data-known={known || undefined}>
                        <span className="esr-row__pending" aria-hidden>
                          –
                        </span>
                        <span className="esr-row__value">
                          <Count value={known ? p.score : 0} format={(n) => String(Math.round(n))} />
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="esr-top">
              <span>Pondéré par les points clés</span>
              <span className="esr-conf" data-on={s.top || undefined}>
                <Badge tone="success" dot>
                  Confiance élevée
                </Badge>
              </span>
            </div>
          </div>
        </Window>
      )}
    </Stage>
  );
}
