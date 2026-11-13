'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { fr } from '@/components/site/fr';

/**
 * Questions validées de la landing actuelle, élargies aux cabinets (candidats
 * et consultants). Les réponses sur les données ne disent que ce que le code
 * fait : stockage privé par organisation, envoi à Gemini via la passerelle de Vercel,
 * suppression de la fiche, de ses positionnements et du PDF d'origine. Disclosure accessible.
 */
const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Quels formats de CV sont acceptés ?',
    a: 'PDF et Word, sans gabarit imposé : Esneo structure le CV tel qu’il arrive, dans sa langue d’origine, puis le réutilise à chaque positionnement.',
  },
  {
    q: 'L’IA décide-t-elle à ma place ?',
    a: 'Non. Elle propose une fiche, une analyse et un score ; vous relisez et validez chaque étape avant que quoi que ce soit ne parte.',
  },
  {
    q: 'Comment le score est-il calculé ?',
    a: 'À partir des points clés de la fiche de poste ou de mission, classés et pondérés, et des 5 dernières années du parcours. Chaque point cite le CV, et la confiance est affichée.',
  },
  {
    q: 'Où vont les CV de nos candidats et consultants ?',
    a: 'Dans le stockage privé de votre organisation, lisible par votre seule équipe. Pour l’extraction, l’analyse et la rédaction, le CV est envoyé à Gemini 2.5 Flash (Google), via la passerelle de Vercel ; c’est le modèle par défaut, qu’Esneo règle tâche par tâche. Vous supprimez une fiche quand vous voulez, y compris le PDF d’origine.',
  },
  {
    q: 'Que se passe-t-il si une extraction échoue ?',
    a: 'L’échec s’affiche avec sa cause et un bouton pour réessayer. Le CV d’origine reste intact, et rien ne reste bloqué en silence.',
  },
  {
    q: 'Peut-on lancer deux fois la même analyse ?',
    a: 'Non. Tant qu’un traitement tourne, son bouton reste bloqué ; après un rechargement de page, c’est la même analyse qui continue.',
  },
  {
    q: 'Le CV final suit-il une charte ?',
    a: 'Oui. Le dossier exporté en PDF suit le gabarit de votre organisation : thème, logo, en-tête, pied de page et ordre des blocs, identiques d’un profil à l’autre.',
  },
];

export function LandingFaq(): React.JSX.Element {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]));

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <ul className="eg-faq__list">
      {FAQ.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <li key={item.q} className="eg-faq__item" data-open={isOpen}>
            <h3 className="eg-faq__q">
              <button
                type="button"
                id={`eg-q-${i}`}
                className="eg-faq__btn"
                aria-expanded={isOpen}
                aria-controls={`eg-a-${i}`}
                onClick={() => toggle(i)}
              >
                <span>{fr(item.q)}</span>
                <Plus className="eg-faq__icon" aria-hidden />
              </button>
            </h3>
            <div id={`eg-a-${i}`} role="region" aria-labelledby={`eg-q-${i}`} className="eg-faq__a" hidden={!isOpen}>
              <p>{fr(item.a)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
