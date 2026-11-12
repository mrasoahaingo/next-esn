import { fr } from '@/components/site/fr';

/**
 * Les documents bruts posés sous les écrans 1 et 2 de la visite (le PDF reçu,
 * la demande du client) : seule leur tête dépasse au-dessus de la scène animée
 * (components/landing/stage) ; la paperasse que l'outil remplace. Contenus
 * fictifs.
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
