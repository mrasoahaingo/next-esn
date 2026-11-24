import { PATH_D } from '@/components/esneo-full-logo';

/**
 * Couleur du logo Esneo par défaut dans le PDF : même couleur que `resolveTheme().headerNameColor`
 * (`templates/cv-dossier-layout.ts`), le bandeau d'en-tête étant posé sur `colors.primary`.
 */
export const PDF_HEADER_LOGO_FILL = '#ffffff';

/**
 * SVG autonome du logo Esneo (même géométrie que `public/esneo-full.svg`), construit en mémoire
 * depuis `PATH_D` : aucune lecture disque, donc rien à déclarer dans `outputFileTracingIncludes`.
 *
 * La couleur est explicite : librsvg (utilisé par sharp) rendrait `currentColor` en noir.
 */
export function buildEsneoWordmarkSvg(fill: string): string {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2816 510">' +
    `<g fill="${fill}" transform="translate(0 -535)"><path d="${PATH_D}"/></g>` +
    '</svg>'
  );
}
