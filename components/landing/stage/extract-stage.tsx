'use client';

import { FileText, Upload } from 'lucide-react';
import { Badge, Bar, Check, Fly, Meter, Roll, Stage, Window, type Act } from '@/components/landing/stage/kit';

/**
 * Écran 1 (golds « upload » et « loading ») : la cause d'abord. Le CV papier
 * posé au-dessus de la fenêtre (hors de la scène, il suit son repère
 * `data-ss-lift`) se soulève, son fichier s'en détache au bord de la fenêtre
 * et descend jusqu'à la zone de dépôt, qui s'allume et dont le libellé sort avant
 * l'arrivée ; le fichier s'y pose et devient la ligne du fichier (même
 * géométrie, un seul objet). La jauge d'envoi se remplit, puis les rubriques
 * se résolvent de haut en bas : chaque barre part avant que ses mots
 * n'arrivent. Le statut est une seule pastille dont la teinte change et dont
 * le libellé roule. Sans la feuille (téléphone, colonne étroite), le fichier
 * arrive entier de juste au-dessus de la zone. Poster = la fiche prête.
 */
const ROWS: ReadonlyArray<{ label: string; value: string; sk: number }> = [
  { label: 'Identité', value: 'Camille Durand · Tech lead Java', sk: 196 },
  { label: 'Expériences', value: '6 postes, 11 ans', sk: 118 },
  { label: 'Compétences', value: '24 relevées', sk: 92 },
  { label: 'Langues', value: 'Français, anglais C1', sk: 132 },
  { label: 'Formation', value: 'Master informatique, 2013', sk: 168 },
];
const KO = 412;
const FILE = 'CV_Camille_Durand.pdf';

type S = { lift: boolean; fly: boolean; over: boolean; file: boolean; up: number; sent: boolean; read: number; ready: boolean };
const initial: S = { lift: false, fly: false, over: false, file: false, up: 0, sent: false, read: 0, ready: false };
const poster: S = { lift: false, fly: false, over: false, file: true, up: 1, sent: true, read: ROWS.length, ready: true };

async function script(a: Act<S>): Promise<void> {
  await a.wait(700);
  a.mark('grab');
  a.put({ lift: true });
  await a.wait(380);
  a.mark('drag');
  a.put({ fly: true });
  await a.wait(520);
  a.put({ over: true });
  await a.wait(400);
  a.mark('drop');
  a.put({ file: true, fly: false, lift: false });
  await a.wait(450);
  a.mark('upload');
  for (let i = 1; i <= 8; i++) {
    a.put({ up: i / 8 });
    await a.wait(110);
  }
  await a.wait(250);
  a.put({ sent: true });
  await a.wait(450);
  a.mark('read');
  for (let i = 1; i <= ROWS.length; i++) {
    a.put({ read: i });
    await a.wait(430);
  }
  a.mark('ready');
  a.put({ ready: true });
  await a.wait(2600);
}

function FileId({ target }: { target?: string }): React.JSX.Element {
  return (
    <span className="esx-file__id" data-target={target}>
      <span className="esx-file__icon" aria-hidden>
        <FileText size={16} strokeWidth={2} />
      </span>
      <span className="esx-file__name">{FILE}</span>
    </span>
  );
}

export function ExtractStage({ autoplay = false }: { autoplay?: boolean }): React.JSX.Element {
  return (
    <Stage<S>
      width={640}
      height={424}
      fluid
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      autoplay={autoplay}
      theme="dark"
      className="eg-ss esx"
    >
      {(s, rect) => {
        const to = rect('file-id');
        const anchor = rect('cv-anchor');
        // Sans la feuille, le fichier part de juste au-dessus de la zone.
        // Le vol garde la taille de la ligne d'arrivée (l'ancre ne donne que
        // la position) : aucun changement d'échelle, aucun saut au relais.
        const from = anchor.width ? { ...to, x: anchor.x, y: anchor.y } : { ...to, y: to.y - 10 };
        return (
          <>
            {/* Repère d'état lu par la feuille CV (hors scène) avec :has(). */}
            <i className="eg-ss-state" data-ss-lift={s.lift || undefined} hidden />
            {/* Où le fichier se détache, sous la feuille : la même ligne, invisible. */}
            <span className="esx-anchor" aria-hidden>
              <FileId target="cv-anchor" />
            </span>
            <Window title="Nouvelle fiche">
              <div className="eg-ss-body">
                <div className="eg-ss-head esx-head">
                  <div className="eg-ss-title">Consultant</div>
                  <Badge tone={s.ready ? 'success' : s.sent ? 'accent' : 'neutral'} dot>
                    <Roll>{s.ready ? 'Fiche prête à relire' : s.sent ? 'Lecture en cours' : 'En attente du CV'}</Roll>
                  </Badge>
                </div>
                <div
                  className="esx-file"
                  data-target="drop"
                  data-over={s.over || undefined}
                  data-file={s.file || undefined}
                  data-sent={s.sent || undefined}
                >
                  <span className="esx-file__edge" aria-hidden />
                  <span className="esx-file__glow" aria-hidden />
                  <span className="esx-file__fill" aria-hidden />
                  <span className="esx-drop" aria-hidden={s.file || undefined}>
                    <Upload size={16} strokeWidth={2} aria-hidden />
                    Déposez un CV, PDF ou Word
                  </span>
                  <span className="esx-file__row" aria-hidden={!s.file || undefined}>
                    <FileId target="file-id" />
                    {/* La taille est connue dès le dépôt : elle ne compte pas, la
                        jauge dit l'envoi. */}
                    <span className="esx-file__meta">{KO} Ko</span>
                  </span>
                  <Meter value={s.up} className="esx-file__meter" />
                </div>
                <div className="esx-list">
                  {ROWS.map((r, i) => {
                    const done = s.read > i;
                    return (
                      <div key={r.label} className="esx-row" data-ready={done || undefined}>
                        <span className="esx-row__label">{r.label}</span>
                        <span className="esx-slot">
                          <Bar w={r.sk} h={8} r={4} tone={2} className="esx-sk" />
                          <span className="esx-row__value">{r.value}</span>
                        </span>
                        <Check on={done} pending={s.sent && s.read === i} size={16} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </Window>
            <Fly from={from} to={to} go={s.fly} held={s.lift && !s.file} duration={900}>
              <span className="esx-ghost">
                <FileId />
              </span>
            </Fly>
          </>
        );
      }}
    </Stage>
  );
}
