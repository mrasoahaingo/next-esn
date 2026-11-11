'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Check, FileText, UploadCloud } from 'lucide-react';
import { PHOTOS } from '@/components/site/images';
import { fr } from '@/components/site/fr';

/**
 * Le parcours en quatre temps. Grand écran : les étapes à gauche, à droite un
 * fragment épinglé sur la photo du bureau, découpée en onglet de dossier, qui
 * change d'état avec l'étape lue. Téléphone : pas d'épinglage, chaque étape porte
 * son propre fragment. Sans script, tout reste lisible (étape 1 affichée).
 */

const STEPS: { title: string; body: string; ui: () => ReactNode }[] = [
  {
    title: 'Importez les CV.',
    body: 'Déposez les CV de vos consultants en PDF ou Word. Aucun gabarit imposé : l’extraction démarre aussitôt.',
    ui: () => <StateImport />,
  },
  {
    title: 'L’IA extrait.',
    body: 'Expériences, compétences, langues et durées arrivent structurées, dans la langue du CV. Chaque rubrique affiche où elle en est.',
    ui: () => <StateExtract />,
  },
  {
    title: 'Analysez la mission.',
    body: 'Points clés classés, niveau attendu, questions à clarifier et points de vigilance, tirés du texte de la demande client.',
    ui: () => <StateMission />,
  },
  {
    title: 'Positionnez.',
    body: 'Le consultant face à la mission : un score pondéré, la citation du CV derrière chaque point et une confiance affichée.',
    ui: () => <StateScore />,
  },
];

export function PipelinePinned() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const els = refs.current.filter(Boolean) as HTMLLIElement[];
    if (!els.length) return;
    // Étape active = celle dont le centre est le plus proche du centre de l'écran.
    let frame = 0;
    const update = () => {
      frame = 0;
      const mid = window.innerHeight / 2;
      let best = 0;
      let bestDist = Infinity;
      els.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActive(best);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="es-grid">
      <h2 id="es-how-h" className="es-head es-how__head" data-reveal>
        Du dépôt au positionnement, en quatre temps.
      </h2>
      <ol className="es-how__steps">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            ref={(el) => {
              refs.current[i] = el;
            }}
            data-active={i === active}
            className="es-how__step"
          >
            <h3>{s.title}</h3>
            <p>{fr(s.body)}</p>
            <div className="es-how__inline" aria-hidden>
              <Image
                src={PHOTOS.bureau.src}
                alt=""
                width={PHOTOS.bureau.width}
                height={PHOTOS.bureau.height}
                sizes="200vw"
                className="es-how__inline-photo"
                style={{ transformOrigin: ['6% 6%', '72% 28%', '74% 62%', '96% 40%'][i] }}
              />
              <div className="es-how__inline-ui">{s.ui()}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="es-how__stage-col" aria-hidden>
        <div className="es-how__stage es-tabbed" data-step={active}>
          <Image
            src={PHOTOS.bureau.src}
            alt=""
            width={PHOTOS.bureau.width}
            height={PHOTOS.bureau.height}
            sizes="45vw"
            className="es-how__photo"
          />
          {STEPS.map((s, i) => (
            <div key={s.title} className="es-how__state" data-active={active === i}>
              {s.ui()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StateImport() {
  return (
    <div data-ui className="ui-card st-card">
      <div className="st-drop">
        <UploadCloud className="size-6" style={{ color: '#3466e6' }} aria-hidden />
        <p className="st-strong">Déposez un CV</p>
        <p className="ui-muted">PDF ou Word (.docx)</p>
      </div>
      <div className="st-file">
        <FileText className="size-4 ui-muted" aria-hidden />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ui-row" style={{ justifyContent: 'space-between' }}>
            <span className="st-strong st-ellipsis">CV_Camille_Durand.pdf</span>
            <span className="ui-muted st-nowrap">{'412\u00a0Ko'}</span>
          </div>
          <div className="ui-bar" style={{ marginTop: 8 }}>
            <span style={{ width: '100%' }} />
          </div>
        </div>
      </div>
      <div className="ui-row ui-wrap st-line">
        <span className="ui-chip">
          <span className="ui-spin" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
          Extraction démarrée
        </span>
        <span className="ui-muted">suivie en direct</span>
      </div>
    </div>
  );
}

function StateExtract() {
  const rows = [
    { label: 'Identité', value: 'Camille Durand · Tech lead Java', done: true },
    { label: 'Expériences', value: '6 postes, 11 ans', done: true },
    { label: 'Compétences', value: '24 relevées', done: true },
    { label: 'Langues', value: 'Français, anglais\u00a0C1', done: true },
    { label: 'Formation', value: 'en cours…', done: false },
  ];
  return (
    <div data-ui className="ui-card st-card">
      <div className="ui-row" style={{ justifyContent: 'space-between' }}>
        <span className="st-strong">Extraction du CV</span>
        <span className="ui-chip">4/5 rubriques</span>
      </div>
      <ul className="st-rows">
        {rows.map((r) => (
          <li key={r.label} className="ui-row">
            <span className="st-icon">
              {r.done ? (
                <Check className="size-4" style={{ color: '#17734b' }} aria-hidden />
              ) : (
                <span className="ui-spin" style={{ color: '#3466e6' }} />
              )}
            </span>
            <span className="st-label">{r.label}</span>
            <span className={r.done ? '' : 'ui-muted'}>{r.value}</span>
          </li>
        ))}
      </ul>
      <p className="ui-muted st-line">La fiche reste en lecture seule jusqu’à la fin, puis devient modifiable.</p>
    </div>
  );
}

function StateMission() {
  const points = [
    { rank: 1, text: 'Java et Spring Boot', tier: 'Indispensable' },
    { rank: 2, text: 'Encadrement d’équipe', tier: 'Indispensable' },
    { rank: 3, text: 'Kafka, événementiel', tier: 'Souhaité' },
    { rank: 4, text: 'Culture assurance', tier: 'Bonus' },
  ];
  return (
    <div data-ui className="ui-card st-card">
      <span className="st-strong">{fr('Mission : Tech lead Java · assureur, La Défense')}</span>
      <p className="ui-muted" style={{ margin: '2px 0 0' }}>
        {fr('Niveau attendu : senior, 8 ans et plus')}
      </p>
      <ol className="st-points">
        {points.map((p) => (
          <li key={p.rank} className="ui-row">
            <span className="st-rank">{p.rank}</span>
            <span style={{ flex: 1 }}>{p.text}</span>
            <span className={p.tier === 'Indispensable' ? 'ui-chip' : 'ui-chip ui-chip--grey'}>{p.tier}</span>
          </li>
        ))}
      </ol>
      <div className="st-split">
        <div>
          <p className="st-mini">À clarifier</p>
          <p>{fr('Télétravail : deux ou trois jours ?')}</p>
        </div>
        <div>
          <p className="st-mini">Point de vigilance</p>
          <p>{fr('Démarrage le 6 janvier')}</p>
        </div>
      </div>
    </div>
  );
}

function StateScore() {
  const lines = [
    { text: 'Java et Spring Boot', fit: 100 },
    { text: 'Encadrement d’équipe', fit: 100 },
    { text: 'Kafka, événementiel', fit: 50 },
    { text: 'Culture assurance', fit: 100 },
  ];
  return (
    <div data-ui className="ui-card st-card">
      <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <span className="st-strong">Camille Durand</span>
          <p className="ui-muted" style={{ margin: '2px 0 0' }}>
            face à la mission Tech lead Java
          </p>
        </div>
        <div className="hp__score">
          <span className="hp__score-n">84</span>
          <span className="ui-muted">/100</span>
        </div>
      </div>
      <ul className="st-rows">
        {lines.map((l) => (
          <li key={l.text} className="ui-row">
            <span style={{ flex: 1 }}>{l.text}</span>
            <span className="ui-bar" style={{ width: 96, flex: 'none' }}>
              <span style={{ width: `${l.fit}%`, background: l.fit === 100 ? '#3466e6' : '#e9b54c' }} />
            </span>
          </li>
        ))}
      </ul>
      <div className="ui-row ui-wrap st-line" style={{ justifyContent: 'space-between' }}>
        <span className="ui-chip ui-chip--ok">
          <span className="ui-dot" />
          Confiance élevée
        </span>
        <span className="ui-btn ui-btn--primary">Valider le positionnement</span>
      </div>
    </div>
  );
}
