'use client';

import { useEffect } from 'react';

/**
 * Fil de progression de la visite (écrans 01 à 04). Le remplissage du fil est
 * piloté en CSS par `animation-timeline: view()` (scaleY) ; ce composant ne
 * fait que placer le fil entre le premier et le dernier numéro (au montage et
 * au redimensionnement) et écrire `data-state` sur une étape quand il change.
 * Sans timelines de défilement, ou en mouvement réduit, il pose `--p` (repli).
 */
export function TourProgress(): null {
  useEffect(() => {
    const ol = document.querySelector<HTMLElement>('.eg-steps');
    if (!ol) return;
    const items = Array.from(ol.querySelectorAll<HTMLElement>(':scope > .eg-step'));
    const nodes = items.map((li) => li.querySelector<HTMLElement>('.eg-step__n'));
    if (!items.length || nodes.some((n) => !n)) return;
    const fallback =
      !CSS.supports('animation-timeline: view()') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const states = items.map(() => '');
    let lastP = -1;
    let frame = 0;

    const center = (n: HTMLElement | null) => {
      const r = (n as HTMLElement).getBoundingClientRect();
      return r.top + r.height / 2;
    };

    const place = () => {
      const top = ol.getBoundingClientRect().top;
      const first = center(nodes[0]);
      const last = center(nodes[nodes.length - 1]);
      ol.style.setProperty('--rail-top', `${Math.round(first - top)}px`);
      ol.style.setProperty('--rail-h', `${Math.round(last - first)}px`);
    };

    const update = () => {
      frame = 0;
      const mid = window.innerHeight * 0.55;
      const centers = nodes.map(center);
      let current = -1;
      centers.forEach((c, i) => {
        if (c <= mid) current = i;
      });
      items.forEach((li, i) => {
        const next = i === current ? 'current' : i < current ? 'done' : 'next';
        if (states[i] !== next) {
          states[i] = next;
          li.dataset.state = next;
        }
      });
      if (fallback) {
        const first = centers[0];
        const last = centers[centers.length - 1];
        const p = Math.round(Math.min(1, Math.max(0, (mid - first) / Math.max(1, last - first))) * 200) / 200;
        if (p !== lastP) {
          lastP = p;
          ol.style.setProperty('--p', String(p));
        }
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      place();
      onScroll();
    };
    place();
    update();
    // Le fil suit la taille réelle de la liste (polices chargées, fenêtres qui changent).
    const ro = 'ResizeObserver' in window ? new ResizeObserver(onResize) : null;
    ro?.observe(ol);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
