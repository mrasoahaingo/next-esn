'use client';

import { useState } from 'react';
import { fr } from '@/components/site/fr';

/**
 * Le suivi des positionnements, mis en page comme un tableau d'affichage :
 * consultant, mission, score, statut ; une ligne ouverte. Données fictives.
 */

type Status = 'ok' | 'todo' | 'run' | 'err' | 'ask';

const STATUS_LABEL: Record<Status, string> = {
  ok: 'Validé',
  todo: 'À valider',
  run: 'En cours',
  err: 'Échec',
  ask: 'À clarifier',
};

const ROWS: {
  name: string;
  mission: string;
  score: string;
  status: Status;
  statusText?: string;
  detail: string;
}[] = [
  {
    name: 'Camille Durand',
    mission: 'Tech lead Java · assureur',
    score: '84',
    status: 'todo',
    detail: 'Analyse terminée : 2 points forts, 1 point faible, 1 question sur la disponibilité au 6 janvier. En attente de votre relecture.',
  },
  {
    name: 'Léa Fontaine',
    mission: 'QA automatisation · opérateur télécom',
    score: '88',
    status: 'ok',
    detail: 'Positionnement validé par Julie, CV adapté généré. Le PDF suit votre gabarit.',
  },
  {
    name: 'Yanis Belkacem',
    mission: 'Data engineer GCP · enseigne retail',
    score: '77',
    status: 'todo',
    detail: 'Analyse terminée : 3 points forts, 1 écart, 2 questions. En attente de votre relecture avant toute génération.',
  },
  {
    name: 'Inès Martin',
    mission: 'Product owner paiements · banque',
    score: '81',
    status: 'ok',
    detail: 'Validé ce matin. L’e-mail pour le client est prêt à relire.',
  },
  {
    name: 'Thomas Leroy',
    mission: 'DevOps Kubernetes · énergéticien',
    score: '—',
    status: 'run',
    statusText: 'En cours 3/5',
    detail:
      'Compétences et expériences analysées, points faibles en cours. « Relancer » reste bloqué tant que l’analyse tourne ; après un rechargement de page, la même analyse continue.',
  },
  {
    name: 'Sarah Cohen',
    mission: 'Développeuse React · mutuelle',
    score: '—',
    status: 'err',
    detail:
      'Extraction interrompue sur la rubrique « Expériences ». La cause s’affiche ici, le CV d’origine est intact, et « Relancer » reprend l’extraction.',
  },
  {
    name: 'Hugo Bernard',
    mission: 'Architecte cloud AWS · industriel',
    score: '69',
    status: 'ask',
    detail: 'Deux questions à poser avant l’envoi : la disponibilité et la mobilité à Toulouse. Vos réponses relancent le calcul du score.',
  },
  {
    name: 'Mehdi Rahmani',
    mission: 'Scrum master · assureur',
    score: '73',
    status: 'todo',
    detail: 'Analyse terminée, en attente de relecture. Aucun document ne part sans votre validation.',
  },
  {
    name: 'Chloé Garnier',
    mission: 'Data analyst · groupe hospitalier',
    score: '—',
    status: 'run',
    statusText: 'Extraction 2/5',
    detail: 'La fiche se remplit au fil de l’extraction : identité et expériences lues, compétences en cours.',
  },
];

export function StatusBoard() {
  const [open, setOpen] = useState(4);

  return (
    <div data-ui className="es-board" role="region" aria-label="Exemple de suivi des positionnements">
      <div className="es-board__head" aria-hidden>
        <span className="es-row__name">Consultant</span>
        <span className="es-row__mission">Mission</span>
        <span className="es-row__score">Score</span>
        <span className="es-row__status-h">Statut</span>
      </div>
      <ul className="es-board__rows">
        {ROWS.map((r, i) => {
          const isOpen = i === open;
          return (
            <li key={r.name} className="es-row" data-open={isOpen}>
              <button
                type="button"
                className="es-row__btn"
                aria-expanded={isOpen}
                aria-controls={`es-row-${i}`}
                onClick={() => setOpen(i)}
              >
                <span className="es-row__name">{r.name}</span>
                <span className="es-row__mission">{r.mission}</span>
                <span className="es-row__score">{r.score === '—' ? '—' : `${r.score}/100`}</span>
                <span className={`es-row__status st-${r.status}`}>
                  <span className="es-row__dot" aria-hidden />
                  {r.statusText ?? STATUS_LABEL[r.status]}
                </span>
              </button>
              <div id={`es-row-${i}`} className="es-row__panel" hidden={!isOpen}>
                <p className="es-row__meta">
                  {r.mission}
                  {r.score !== '—' ? ` · ${r.score}/100` : ''}
                </p>
                <p className="es-row__detail">{fr(r.detail)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
