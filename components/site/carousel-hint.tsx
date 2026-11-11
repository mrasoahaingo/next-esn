'use client';

import { useEffect, useState } from 'react';

/**
 * Repère de position du carrousel des preuves (téléphone) : « 2/5 », mis à jour
 * au défilement. Sur grand écran, le carrousel est une mosaïque et le repère est
 * masqué par la CSS.
 */
export function CarouselHint({ targetId, total }: { targetId: string; total: number }) {
  const [index, setIndex] = useState(1);

  useEffect(() => {
    const el = document.getElementById(targetId)?.querySelector<HTMLElement>('ul');
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const items = Array.from(el.children) as HTMLElement[];
      const left = el.getBoundingClientRect().left;
      let best = 0;
      let bestDist = Infinity;
      items.forEach((item, i) => {
        const d = Math.abs(item.getBoundingClientRect().left - left);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setIndex(best + 1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);

  return (
    <p className="es-proofs__hint" aria-live="polite">
      Garantie {index}/{total} · faites défiler →
    </p>
  );
}
