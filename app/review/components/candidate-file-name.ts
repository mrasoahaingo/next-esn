/**
 * Nom du fichier importé, tel qu'affiché dans la ligne de faits de l'en-tête :
 * le dernier segment de l'URL de stockage, décodé, sans le préfixe horodaté
 * (`1712345678_`) ajouté à l'envoi. Les tirets bas restent (c'est le nom réel).
 */
export function candidateFileName(originalFileUrl: string | null | undefined): string | null {
  if (!originalFileUrl) return null;
  const last = originalFileUrl.split('?')[0].split('/').pop() ?? '';
  let name = last;
  try {
    name = decodeURIComponent(last);
  } catch {
    name = last;
  }
  name = name.replace(/^\d+_/, '').trim();
  return name.length > 0 ? name : null;
}

/**
 * Nom lisible dérivé du fichier (préfixe et extension retirés, tirets bas en
 * espaces), utilisé comme titre de repli quand l'identité n'est pas encore connue.
 */
export function candidateNameFromFile(originalFileUrl: string | null | undefined): string | null {
  const file = candidateFileName(originalFileUrl);
  if (!file) return null;
  const readable = file.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
  return readable.length > 0 ? readable : null;
}
