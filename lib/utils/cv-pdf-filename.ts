/**
 * Build a download filename for CV PDFs.
 * Format: cv-himeo-{slug}.pdf
 * Slug: lowercase, accents normalized (NFD → strip combining chars), spaces → hyphens.
 */
export function buildCvPdfFilename(name?: string | null): string {
  if (!name?.trim()) return 'cv-himeo.pdf';
  const slug = name
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric (except space/hyphen)
    .replace(/\s+/g, '-') // spaces → hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, ''); // trim leading/trailing hyphens
  return slug ? `cv-himeo-${slug}.pdf` : 'cv-himeo.pdf';
}
