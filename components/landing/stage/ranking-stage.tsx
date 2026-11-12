'use client';

import { Avatar, Badge, Bar, Count, Meter, Stage, Window, type Act } from '@/components/landing/stage/kit';

/**
 * Écran 3, composition « gros plan » (gold `close-up`) : la fenêtre, chrome
 * compris, agrandie 1,4 fois, à la gouttière en haut et à gauche, coupée par
 * la scène à droite (sa marge vide) et au pied (une quatrième ligne, du
 * remplissage, tranchée) ; les trois lignes classées, le sujet, sont entières.
 * Sous la première, la citation du CV qui fonde le score (la page promet que
 * chaque point renvoie au CV). La confiance se pose dans l'en-tête. Mouvement (golds
 * « reorder » et « table-edit ») : les scores arrivent un à un,
 * chiffre et barre sur la même horloge ; une fois tous connus (la cause
 * visible), le classement se fait une ligne à la fois, comme un glisser : la
 * ligne déplacée se soulève (au-dessus des autres, ombre, un rien plus
 * grande), voyage sur la courbe de trajet, et celle qu'elle passe glisse pour
 * lui faire place quand son milieu la croise. Camille monte d'abord, puis
 * Yanis passe Hugo. La place du haut n'est jamais vide. Un score ne recule
 * jamais ; poster = le classement final.
 */
const PROFILES: ReadonlyArray<{ id: string; name: string; kind: string; score: number; lead?: boolean }> = [
  { id: 'hugo', name: 'Hugo Bernard', kind: 'En intercontrat', score: 69 },
  { id: 'camille', name: 'Camille Durand', kind: 'Consultante', score: 84, lead: true },
  { id: 'yanis', name: 'Yanis Belkacem', kind: 'Candidat', score: 77 },
];
const ARRIVAL = ['hugo', 'camille', 'yanis'];
const CAMILLE_UP = ['camille', 'hugo', 'yanis'];
const RANKED = ['camille', 'yanis', 'hugo'];

type S = { scored: number; order: string[]; lifted: string | null; room: string | null; top: boolean };
const initial: S = { scored: 0, order: ARRIVAL, lifted: null, room: null, top: false };
const poster: S = { scored: PROFILES.length, order: RANKED, lifted: null, room: null, top: true };

async function script(a: Act<S>): Promise<void> {
  await a.wait(700);
  a.mark('score');
  for (let i = 1; i <= PROFILES.length; i++) {
    a.put({ scored: i });
    await a.wait(700);
  }
  await a.wait(300);
  a.mark('rank');
  // Camille se soulève, monte en tête ; Hugo lui fait place
  a.put({ lifted: 'camille' });
  await a.wait(240);
  a.put({ order: CAMILLE_UP, room: 'hugo' });
  await a.wait(720);
  a.put({ lifted: null, room: null });
  await a.wait(320);
  // Yanis passe Hugo
  a.put({ lifted: 'yanis' });
  await a.wait(240);
  a.put({ order: RANKED, room: 'hugo' });
  await a.wait(720);
  a.put({ lifted: null, room: null });
  await a.wait(350);
  a.mark('top');
  a.put({ top: true });
  await a.wait(2800);
}

export function RankingStage({ autoplay = false }: { autoplay?: boolean }): React.JSX.Element {
  return (
    <Stage<S>
      width={720}
      height={440}
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
        <div className="esr-zoom">
          <Window title="Positionnements">
            <div className="eg-ss-body">
              <div className="eg-ss-head">
                <div>
                  <div className="eg-ss-title">Tech lead Java</div>
                </div>
                <span className="esr-conf" data-on={s.top || undefined}>
                  <Badge tone="success" dot>
                    Confiance élevée
                  </Badge>
                </span>
              </div>
              <div className="esr-list">
                {PROFILES.map((p, i) => {
                  const known = s.scored > i;
                  const slot = s.order.indexOf(p.id);
                  const top = s.top && slot === 0;
                  return (
                    <div
                      key={p.id}
                      className="esr-slot"
                      data-lifted={s.lifted === p.id || undefined}
                      data-room={s.room === p.id || undefined}
                      data-past={(s.top && slot > 0) || undefined}
                      style={{ ['--slot' as string]: slot, ['--past' as string]: s.top && slot > 0 ? 1 : 0 }}
                    >
                      <div className="esr-row" data-top={top || undefined}>
                        {/* La personne dont parle l'histoire en azur, les autres
                            chacune dans sa teinte. */}
                        <Avatar name={p.name} size={32} tone={p.lead ? 'accent' : 'person'} />
                        <div style={{ minWidth: 0 }}>
                          <div className="esr-row__name">{p.name}</div>
                          <div className="esr-row__kind">{p.kind}</div>
                        </div>
                        <Meter value={known ? p.score / 100 : 0} tone={top ? 'accent' : 'ink'} className="esr-row__meter" />
                        {/* Pas de « 0 » inventé : un tiret tant que le score n'est pas
                            calculé ; il sort, puis le chiffre roule jusqu'à sa valeur. */}
                        <span className="esr-row__score" data-known={known || undefined}>
                          <span className="esr-row__pending" aria-hidden>
                            –
                          </span>
                          <span className="esr-row__value">
                            <Count value={known ? p.score : 0} duration={700} format={(n) => String(Math.round(n))} />
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}
                {/* La preuve sous le premier : elle entre avec la confiance, les
                    lignes suivantes glissent pour lui faire place. */}
                <p className="esr-cite" data-on={s.top || undefined}>
                  <span className="esr-cite__label">Citation du CV</span>
                  <span className="esr-cite__text">« Tech lead d’une squad de 5 »</span>
                </p>
                {/* Quatrième ligne, du remplissage : la scène la tranche (gros plan). */}
                <div
                  className="esr-slot esr-slot--filler"
                  aria-hidden
                  data-past={s.top || undefined}
                  style={{ ['--slot' as string]: 3, ['--past' as string]: s.top ? 1 : 0 }}
                >
                  <div className="esr-row">
                    <Bar w={32} h={32} r={16} tone={2} />
                    <div>
                      <Bar w={104} h={8} r={4} tone={2} />
                      <Bar w={64} h={7} r={3.5} tone={1} className="esr-filler__sub" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Window>
        </div>
      )}
    </Stage>
  );
}
