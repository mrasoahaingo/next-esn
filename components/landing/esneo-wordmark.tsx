/**
 * Mot-symbole typographique d'esneo pour la landing : « esneo » en minuscules,
 * Albert Sans 700, interlettrage resserré, crénage réglé paire par paire.
 * Un seul signe distinctif, tiré du produit : la pastille de statut azur
 * (celle qui dit qu'un traitement tourne et où il en est), posée comme un point.
 * Variante en texte (taille en em, utile au pied en `cqi`) du logo du site,
 * `components/esneo-full-logo.tsx` (SVG, même dessin).
 */
export function EsneoWordmark({ className }: { className?: string }): React.JSX.Element {
  return (
    <span className={className ? `eg-mark ${className}` : 'eg-mark'} role="img" aria-label="esneo">
      <span className="eg-mark__word" aria-hidden>
        e<span className="eg-mark__k1">s</span>n<span className="eg-mark__k2">e</span>o
      </span>
      <span className="eg-mark__dot" aria-hidden />
    </span>
  );
}
