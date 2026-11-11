'use client';

import { useState } from 'react';
import { fr } from '@/components/site/fr';

/** Questions à gauche, une réponse en grand à droite ; accordéon sur téléphone. */

export const FAQ = [
  {
    q: 'Quels formats de CV sont acceptés ?',
    a: 'PDF et Word, sans gabarit imposé : Esneo structure le CV tel qu’il arrive, dans sa langue d’origine.',
  },
  {
    q: 'L’IA décide-t-elle à ma place ?',
    a: 'Non. Elle propose une fiche, une analyse et un score ; vous relisez et validez chaque étape avant que quoi que ce soit ne parte.',
  },
  {
    q: 'Comment le score est-il calculé ?',
    a: 'À partir des points clés de la mission, classés et pondérés, et des 5 dernières années du parcours. Chaque point cite le CV, et la confiance est affichée.',
  },
  {
    q: 'Où vont les CV de nos consultants ?',
    a: 'Dans l’espace isolé de votre organisation, visible de votre seule équipe. Le CV est transmis à des modèles d’IA tiers pour l’extraction, l’analyse et la rédaction des documents. Vous supprimez une fiche quand vous voulez.',
  },
  {
    q: 'Que se passe-t-il si une extraction échoue ?',
    a: 'L’échec s’affiche avec sa cause et un bouton pour relancer. Le CV d’origine reste intact, et rien ne reste bloqué en silence.',
  },
  {
    q: 'Peut-on lancer deux fois la même analyse ?',
    a: 'Non. Tant qu’un traitement tourne, son bouton reste bloqué ; après un rechargement de page, c’est la même analyse qui continue.',
  },
  {
    q: 'Le CV final suit-il une charte ?',
    a: 'Oui. Le dossier exporté en PDF suit un gabarit : thème, logo, en-tête, pied de page et ordre des blocs, identiques d’un consultant à l’autre.',
  },
] as const;

export function FaqIndex() {
  const [sel, setSel] = useState(0);

  return (
    <div className="es-grid">
      <h2 id="es-faq-h" className="es-head es-faq__head" data-reveal>
        Vos questions.
      </h2>
      <ul className="es-faq__list">
        {FAQ.map((item, i) => (
          <li key={item.q}>
            <button
              type="button"
              className="es-faq__q"
              aria-expanded={sel === i}
              aria-controls={`faq-a-${i}`}
              onClick={() => setSel(sel === i ? -1 : i)}
            >
              {fr(item.q)}
            </button>
            <p id={`faq-a-${i}`} className="es-faq__inline" hidden={sel !== i}>
              {fr(item.a)}
            </p>
          </li>
        ))}
      </ul>
      <div className="es-faq__pane-col" aria-hidden>
        {sel >= 0 ? (
          <p key={sel} className="es-faq__pane">
            {fr(FAQ[sel].a)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
