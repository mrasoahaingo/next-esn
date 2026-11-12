'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Libellés codés en dur en anglais dans l'interface Clerk (aucune clé de localisation). */
const CLERK_LABELS: Record<string, string> = {
  'Show password': 'Afficher le mot de passe',
  'Hide password': 'Masquer le mot de passe',
};

/**
 * Accessibilité du formulaire Clerk après un envoi. Clerk marque le champ
 * fautif (`aria-invalid`, message relié par `aria-describedby`) mais laisse le
 * focus retomber sur `body` : le message n'est alors lu par personne. Quand une
 * nouvelle erreur apparaît et que le focus est perdu (ou resté sur le bouton
 * d'envoi), on le remet sur le champ en erreur, qui annonce son message. Si le
 * focus est ailleurs dans le formulaire, ou pour une alerte générale de Clerk,
 * le message est recopié dans une région `polite`. Les libellés anglais du
 * bouton œil sont traduits au passage.
 */
export function AuthFormA11y({ children }: { children: ReactNode }): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [announce, setAnnounce] = useState('');

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let lastError = '';

    const sync = (): void => {
      const field = root.querySelector<HTMLInputElement>('input[aria-invalid="true"]');
      const describedBy = field?.getAttribute('aria-describedby') ?? '';
      const message = describedBy
        .split(' ')
        .map((id) => (id ? document.getElementById(id)?.textContent?.trim() : ''))
        .filter(Boolean)
        .join(' ');
      const key = field ? `${field.name}:${message}` : '';
      let fieldAnnounce = '';
      if (field && key !== lastError) {
        const active = document.activeElement;
        const focusLost = !active || active === document.body || !root.contains(active);
        if (focusLost || active?.matches('.cl-formButtonPrimary')) field.focus();
        else if (active !== field) fieldAnnounce = message;
      }
      lastError = key;
      const alertText = root.querySelector('.cl-alertText')?.textContent?.trim() ?? '';
      const next = alertText || fieldAnnounce;
      if (next || !field) setAnnounce((prev) => (prev === next ? prev : next));

      root.querySelectorAll<HTMLElement>('.cl-formFieldInputShowPasswordButton').forEach((btn) => {
        const label = CLERK_LABELS[btn.getAttribute('aria-label') ?? ''];
        if (label) btn.setAttribute('aria-label', label);
      });
    };
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-invalid', 'aria-describedby', 'aria-label'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="eg-auth__clerk">
      {children}
      <p className="eg-sr" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
