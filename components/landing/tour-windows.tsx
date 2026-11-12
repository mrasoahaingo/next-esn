import { fr } from '@/components/site/fr';

/**
 * Les documents bruts posés au-dessus des écrans 1 et 2 de la visite (le PDF
 * reçu, la demande du client) : seule leur tête dépasse au-dessus de la
 * fenêtre ; la paperasse que l'outil remplace. Ils restent hors de la scène
 * animée (son cadrage reste celui de la fenêtre) mais suivent son état : la
 * scène pose un repère caché (`data-ss-lift`, `data-ss-m1`…), que le CSS lit
 * avec `:has()` (components/landing/stage/stage.css). Le CV se soulève quand
 * son fichier en part ; dans la demande, le passage d'où sort chaque point
 * clé se marque quand il arrive. Contenus fictifs.
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

/** Un passage de la demande d'où sort un point clé (n = rang du point). */
function Src({ n, children }: { n: number; children: string }): React.JSX.Element {
  return (
    <span className="eg-sheet__src" data-src={n}>
      {children}
    </span>
  );
}

export function SheetMission(): React.JSX.Element {
  return (
    <div className="eg-sheet eg-sheet--mail" aria-hidden>
      <p className="eg-sheet__meta">{fr('Objet : Tech lead Java H/F, démarrage le 6 janvier')}</p>
      <p>
        <Src n={1}>Java et Spring Boot</Src>
        {', pour '}
        <Src n={2}>encadrer une équipe</Src>
        {' de 5.'}
      </p>
      <p>
        <Src n={3}>Kafka apprécié</Src>
        {fr(' ; ')}
        <Src n={4}>culture assurance</Src>
        {' en plus.'}
      </p>
      <p className="eg-sheet__from">{fr('De : direction des achats informatiques')}</p>
    </div>
  );
}
