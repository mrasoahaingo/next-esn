/**
 * URL pour iframe PDF (Chromium, etc.) : masque barre d’outils + volet vignettes.
 * @see https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfopenparameters.pdf
 */
export function pdfEmbedSrc(blobUrl: string) {
  return `${blobUrl}#toolbar=0&navpanes=0`;
}
