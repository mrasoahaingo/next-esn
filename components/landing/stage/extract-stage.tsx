'use client';

import { FileText, Upload } from 'lucide-react';
import { Badge, Bar, Check, Meter, Stage, States, Window, type Act } from '@/components/landing/stage/kit';

/**
 * Écran 1 (golds « upload » et « loading ») : le PDF se pose dans la zone de
 * dépôt, sa jauge d'envoi se remplit puis s'efface ; les rubriques de la fiche
 * se résolvent de haut en bas depuis un squelette à leur géométrie. Tout est
 * à sa place dès le départ : seuls opacité et transform bougent, rien ne se
 * remet en page (CLS 0). Une fois, à l'entrée à l'écran ; poster = la fiche
 * prête.
 */
const ROWS: ReadonlyArray<{ label: string; value: string; sk: number }> = [
  { label: 'Identité', value: 'Camille Durand · Tech lead Java', sk: 196 },
  { label: 'Expériences', value: '6 postes, 11 ans', sk: 118 },
  { label: 'Compétences', value: '24 relevées', sk: 92 },
  { label: 'Langues', value: 'Français, anglais C1', sk: 132 },
  { label: 'Formation', value: 'Master informatique, 2013', sk: 168 },
];
const KO = 412;

type S = { file: boolean; up: number; sent: boolean; read: number; ready: boolean };
const initial: S = { file: false, up: 0, sent: false, read: 0, ready: false };
const poster: S = { file: true, up: 1, sent: true, read: ROWS.length, ready: true };

async function script(a: Act<S>): Promise<void> {
  await a.wait(500);
  a.mark('file');
  a.put({ file: true });
  await a.wait(500);
  a.mark('upload');
  for (let i = 1; i <= 8; i++) {
    a.put({ up: i / 8 });
    await a.wait(110);
  }
  await a.wait(200);
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
      {(s) => (
        <Window title="Nouvelle fiche">
          <div className="eg-ss-body">
            <div className="eg-ss-head">
              <div className="eg-ss-title">Consultant</div>
              <States
                value={s.ready ? 'ready' : s.sent ? 'read' : 'wait'}
                align="end"
                states={{
                  wait: <Badge tone="neutral">En attente du CV</Badge>,
                  read: (
                    <Badge tone="accent" dot>
                      Lecture en cours
                    </Badge>
                  ),
                  ready: <Badge tone="success">Fiche prête à relire</Badge>,
                }}
              />
            </div>
            <div className="esx-file" data-file={s.file || undefined} data-sent={s.sent || undefined}>
              <span className="esx-drop" aria-hidden={s.file || undefined}>
                <Upload size={16} strokeWidth={2} aria-hidden />
                Déposez un CV, PDF ou Word
              </span>
              <span className="esx-file__row" aria-hidden={!s.file || undefined}>
                <span className="esx-file__icon" aria-hidden>
                  <FileText size={16} strokeWidth={2} />
                </span>
                <span className="esx-file__name">CV_Camille_Durand.pdf</span>
                {/* La taille est connue dès le dépôt : elle ne compte pas, la jauge
                    dit l'envoi. */}
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
      )}
    </Stage>
  );
}
