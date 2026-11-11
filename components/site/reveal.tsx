'use client';

import { useEffect } from 'react';

/**
 * Apparitions au défilement : pose `.es-js` sur la racine `.es` puis révèle
 * chaque `[data-reveal]` une seule fois à son entrée. Sans script, rien n'est
 * masqué (le masquage initial n'existe que sous `.es-js`).
 */
export function Reveal() {
  useEffect(() => {
    const root = document.querySelector('.es');
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-in'));
      return;
    }
    // Ce qui est déjà à l'écran au chargement apparaît tout de suite.
    const fold = window.innerHeight;
    items.forEach((el) => {
      if (el.getBoundingClientRect().top < fold * 0.92) el.classList.add('is-in');
    });
    root.classList.add('es-js');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
    );
    items.forEach((el) => {
      if (!el.classList.contains('is-in')) io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
