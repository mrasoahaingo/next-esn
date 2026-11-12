'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { fr } from '@/components/site/fr';

/**
 * Visite, écran 4 : les brouillons générés, en vrais onglets (motif tabs WAI :
 * flèches gauche/droite, Début, Fin ; un seul onglet dans l'ordre de tabulation).
 * Rien n'est envoyé d'ici : ce sont des brouillons à relire. Contenu fictif.
 */

const TABS = [
  { id: 'cv', label: 'CV adapté', short: 'CV adapté' },
  { id: 'client', label: 'E-mail client', short: 'Client' },
  { id: 'consultant', label: 'E-mail consultant', short: 'Consultant' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function DocsWindow(): React.JSX.Element {
  const [tab, setTab] = useState<TabId>('client');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    const id = TABS[next].id;
    setTab(id);
    refs.current[id]?.focus();
  };

  return (
    <div className="eg-glass eg-glass--blur eg-win">
      <div className="eg-win__bar">
        <p className="eg-win__crumb">
          <span className="eg-crumb-pre">
            Documents <span aria-hidden>›</span>{' '}
          </span>
          Camille Durand
        </p>
        <span className="eg-chip eg-chip--warn">Brouillons à relire</span>
      </div>
      <div className="eg-tabs" role="tablist" aria-label="Documents générés pour Camille Durand">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={`eg-tab-${t.id}`}
            className="eg-tab"
            aria-selected={tab === t.id}
            aria-controls={`eg-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="eg-tab__long">{fr(t.label)}</span>
            <span className="eg-tab__short">{t.short}</span>
          </button>
        ))}
      </div>
      <div className="eg-win__body">
        <div
          role="tabpanel"
          id="eg-panel-cv"
          aria-labelledby="eg-tab-cv"
          tabIndex={0}
          hidden={tab !== 'cv'}
          className="eg-tabpanel"
        >
          <dl className="eg-mailhead">
            <div>
              <dt>Fichier</dt>
              <dd>Dossier de compétences · Camille Durand (PDF)</dd>
            </div>
            <div>
              <dt>Gabarit</dt>
              <dd>{fr('Celui de votre organisation : logo, en-tête, ordre des blocs')}</dd>
            </div>
          </dl>
          <div className="eg-mailbody">
            <p>
              <strong>Synthèse.</strong>{' '}
              {fr(
                'Six ans de Java et Spring Boot, encadrement d’une équipe de 5 développeurs, migration d’un moteur de tarification vers Spring Boot 3 en 2024.',
              )}
            </p>
            <p>{fr('Kafka apparaît tel qu’au CV : un projet, en 2019.')}</p>
          </div>
        </div>

        <div
          role="tabpanel"
          id="eg-panel-client"
          aria-labelledby="eg-tab-client"
          tabIndex={0}
          hidden={tab !== 'client'}
          className="eg-tabpanel"
        >
          <dl className="eg-mailhead">
            <div>
              <dt>À</dt>
              <dd>votre contact chez le client</dd>
            </div>
            <div>
              <dt>Objet</dt>
              <dd>Tech lead Java, proposition de Camille Durand</dd>
            </div>
          </dl>
          <div className="eg-mailbody">
            <p>Bonjour,</p>
            <p>
              {fr(
                'Suite à votre demande, je vous propose Camille Durand, tech lead Java depuis six ans. Elle encadre une équipe de 5 développeurs et a migré en 2024 un moteur de tarification vers Spring Boot 3.',
              )}
            </p>
            <p>{fr('Sa disponibilité au 6 janvier reste à confirmer : je reviens vers vous demain.')}</p>
          </div>
        </div>

        <div
          role="tabpanel"
          id="eg-panel-consultant"
          aria-labelledby="eg-tab-consultant"
          tabIndex={0}
          hidden={tab !== 'consultant'}
          className="eg-tabpanel"
        >
          <dl className="eg-mailhead">
            <div>
              <dt>À</dt>
              <dd>Camille Durand</dd>
            </div>
            <div>
              <dt>Objet</dt>
              <dd>{fr('Mission tech lead Java, une question avant d’envoyer votre dossier')}</dd>
            </div>
          </dl>
          <div className="eg-mailbody">
            <p>Bonjour Camille,</p>
            <p>
              {fr(
                'Une mission de tech lead Java chez un assureur de La Défense correspond à votre parcours. Avant de proposer votre dossier : êtes-vous disponible au 6 janvier ?',
              )}
            </p>
          </div>
        </div>

        <p className="eg-win__foot eg-win__note">{fr('Brouillons : rien n’est envoyé sans votre relecture.')}</p>
      </div>
    </div>
  );
}
