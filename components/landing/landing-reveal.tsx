'use client';

import { useEffect } from 'react';

/**
 * Apparition sobre des fenêtres de la visite : sous `.eg-js` seulement, chaque
 * `[data-reveal]` part d'un état déjà visible (opacité 0,25) et se pose une
 * fois. Sans script ou en mouvement réduit, tout est là d'emblée.
 */
export function LandingReveal(): null {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.eg');
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const fold = window.innerHeight;
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < fold * 0.9) el.classList.add('is-in');
    });
    root.classList.add('eg-js');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );
    items.forEach((el) => {
      if (!el.classList.contains('is-in')) io.observe(el);
    });
    return () => {
      io.disconnect();
      root.classList.remove('eg-js');
    };
  }, []);
  return null;
}
