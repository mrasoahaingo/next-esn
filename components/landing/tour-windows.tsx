import { Check } from 'lucide-react';
import { fr } from '@/components/site/fr';

/**
 * Fenêtres statiques de la visite guidée et les documents bruts posés dessous
 * (le PDF reçu, la demande du client). Seule la tête du document dépasse du
 * verre ; le reste est flouté dessous : la paperasse que l'outil remplace.
 * Contenus fictifs.
 */

// ─── Documents sous le verre ─────────────────────────────────────────────

export function SheetCv(): React.JSX.Element {
  return (
    <div className="eg-sheet eg-sheet--cv" aria-hidden>
      <p className="eg-sheet__name">Camille Durand</p>
      <p className="eg-sheet__role">{fr('Tech lead Java · 11 ans d’expérience · Paris')}</p>
      <p className="eg-sheet__h">Expériences</p>
      <p className="eg-sheet__strong">{fr('2022 – aujourd’hui · Assureur IARD, La Défense')}</p>
      <p>{fr('Tech lead d’une squad de 5 développeurs. Migration du moteur de tarification vers Spring Boot 3.')}</p>
      <p className="eg-sheet__strong">{'2019 – 2022 · Éditeur de logiciels, Lyon'}</p>
      <p>{fr('Développeur Java senior. Bus d’événements Kafka pour les notifications clients.')}</p>
    </div>
  );
}

export function SheetMission(): React.JSX.Element {
  return (
    <div className="eg-sheet eg-sheet--mail" aria-hidden>
      <p className="eg-sheet__meta">{fr('Objet : Tech lead Java H/F, démarrage le 6 janvier')}</p>
      <p className="eg-sheet__from">{fr('De : direction des achats informatiques')}</p>
      <p>Bonjour,</p>
      <p>
        {fr(
          'Pour la refonte de notre moteur de tarification, nous cherchons un tech lead Java (Spring Boot) pour encadrer une équipe de 5 développeurs.',
        )}
      </p>
    </div>
  );
}

// ─── Écran 2 : la fiche de mission ───────────────────────────────────────

const POINTS: ReadonlyArray<{ rank: number; text: string; tier: string; tone: string }> = [
  { rank: 1, text: 'Java et Spring Boot', tier: 'Indispensable', tone: 'accent' },
  { rank: 2, text: 'Encadrement d’équipe', tier: 'Indispensable', tone: 'accent' },
  { rank: 3, text: 'Kafka, architecture événementielle', tier: 'Souhaité', tone: '' },
  { rank: 4, text: 'Culture assurance', tier: 'Bonus', tone: '' },
];

export function MissionWindow(): React.JSX.Element {
  return (
    <div className="eg-glass eg-glass--blur eg-win">
      <div className="eg-win__bar">
        <p className="eg-win__crumb">
          <span className="eg-crumb-pre">
            Missions <span aria-hidden>›</span>{' '}
          </span>
          Analyse
        </p>
        <span className="eg-chip eg-chip--ok">
          <Check aria-hidden />
          Analyse terminée
        </span>
      </div>
      <div className="eg-win__body">
        <p className="eg-win__title">{fr('Tech lead Java · assureur, La Défense')}</p>
        <p className="eg-win__meta">
          <span>{fr('Niveau attendu : senior, 8 ans et plus')}</span>
          <span>{fr('Démarrage : 6 janvier')}</span>
        </p>
        <p className="eg-win__label">Points clés de la fiche, par importance</p>
        <ol className="eg-ranks">
          {POINTS.map((p) => (
            <li key={p.rank} className="eg-rank">
              <span className="eg-rank__n">{p.rank}</span>
              <span className="eg-rank__text">{fr(p.text)}</span>
              <span className={`eg-chip${p.tone ? ` eg-chip--${p.tone}` : ''}`}>{p.tier}</span>
            </li>
          ))}
        </ol>
        <div className="eg-split">
          <div className="eg-split__cell">
            <p className="eg-split__label eg-split__label--info">À clarifier</p>
            <p>{fr('Télétravail : deux ou trois jours par semaine ?')}</p>
          </div>
          <div className="eg-split__cell">
            <p className="eg-split__label eg-split__label--warn">Point de vigilance</p>
            <p>{fr('Démarrage le 6 janvier, délai court')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Écran 3 : le positionnement ─────────────────────────────────────────

/* Comme la page mission de l'app (app/positions/[id]/page.tsx, tri par score
 * décroissant), les profils positionnés sur une mission se lisent du plus
 * proche au moins proche. Noms fictifs. */
const PROFILES: ReadonlyArray<{ name: string; kind: string; score: number }> = [
  { name: 'Camille Durand', kind: 'Consultante', score: 84 },
  { name: 'Yanis Belkacem', kind: 'Candidat', score: 77 },
  { name: 'Hugo Bernard', kind: 'En intercontrat', score: 69 },
];

/* Score pondéré : 35 × 1 + 25 × 1 + 20 × 0,5 + 20 × 0,7 = 84. */
const CRITERIA: ReadonlyArray<{ text: string; weight: number; fit: number; note: string }> = [
  { text: 'Java et Spring Boot', weight: 35, fit: 1, note: 'Couvert · poste actuel' },
  { text: 'Encadrement d’équipe', weight: 25, fit: 1, note: 'Couvert · depuis 2022' },
  { text: 'Kafka, événementiel', weight: 20, fit: 0.5, note: 'Partiel · un projet, 2019' },
  { text: 'Culture assurance', weight: 20, fit: 0.7, note: 'Partiel · 2 ans et demi' },
];

export function ScoreWindow(): React.JSX.Element {
  return (
    <div className="eg-glass eg-win">
      <div className="eg-win__bar">
        <p className="eg-win__crumb">
          <span className="eg-crumb-pre">
            Missions <span aria-hidden>›</span>{' '}
          </span>
          Tech lead Java
        </p>
        <span className="eg-chip eg-chip--ok">
          <span className="eg-dot" aria-hidden />
          Confiance élevée
        </span>
      </div>
      <div className="eg-win__body">
        <p className="eg-win__label eg-win__label--first">{fr('Tech lead Java : 3 profils, du plus proche au moins proche')}</p>
        <ol className="eg-profiles">
          {PROFILES.map((pr, i) => (
            <li key={pr.name} className="eg-profile" data-on={i === 0} aria-current={i === 0 || undefined}>
              <span className="eg-profile__name">{pr.name}</span>
              <span className="eg-profile__kind">
                {pr.kind}
                {i === 0 ? <span className="eg-profile__open"> · fiche ouverte</span> : null}
              </span>
              <span className="eg-profile__score">
                {pr.score}
                <span>/100</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="eg-scorehead">
          <div>
            <p className="eg-win__title">Camille Durand, en détail</p>
            <p className="eg-win__sub">face à Tech lead Java · assureur</p>
          </div>
          <p className="eg-scorehead__n">
            84<span>/100</span>
          </p>
        </div>
        <div className="eg-crit eg-crit--head" aria-hidden>
          <span>Point clé</span>
          <span>Poids</span>
          <span>Couverture</span>
        </div>
        <ul className="eg-crits">
          {CRITERIA.map((c, i) => (
            <li key={c.text} className="eg-crit" data-open={i === 0}>
              <span className="eg-crit__name">
                <span className="eg-crit__text">{fr(c.text)}</span>
                <span className={`eg-crit__note${c.fit < 1 ? ' eg-crit__note--partial' : ''}`}>{fr(c.note)}</span>
              </span>
              <span className="eg-crit__weight">
                <span className="eg-sr">Poids </span>
                {c.weight}
                {' %'}
              </span>
              <span className="eg-crit__bar">
                <span className="eg-sr">{`Couverture ${Math.round(c.fit * 100)} %`}</span>
                <span
                  className={`eg-crit__fill${c.fit < 1 ? ' is-partial' : ''}`}
                  style={{ transform: `scaleX(${c.fit})` }}
                  aria-hidden
                />
              </span>
              {i === 0 ? (
                <p className="eg-crit__quote">
                  <span className="eg-quote__label">Citation du CV</span>
                  {fr('« Migration du moteur de tarification vers Spring Boot 3 (2024) »')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="eg-win__note">{fr('Score fondé sur les 5 dernières années du parcours.')}</p>
      </div>
    </div>
  );
}
