/**
 * Fichiers de stockage rattachés à une fiche candidat, à effacer avec elle.
 *
 * Une fiche référence ses fichiers par URL publique Supabase
 * (`…/storage/v1/object/public/<bucket>/<orgId>/<fichier>`) :
 * - `candidates.original_file_url` → le PDF ou Word déposé (bucket privé `cv-original`) ;
 * - `candidates.formatted_file_url` → le CV mis en forme (bucket `cv-formatted`) ;
 * - `positionings.tailored_file_url` → chaque CV adapté exporté (bucket `cv-formatted`).
 *
 * Supprimer une fiche doit effacer ces fichiers (droit à l'effacement d'un candidat).
 * Garde-fou : seul un chemin rangé sous le dossier de l'organisation (`<orgId>/…`) est retenu,
 * pour qu'une URL altérée ne puisse jamais viser le fichier d'une autre organisation.
 *
 * Aucun import : logique pure, testable isolément.
 */

export const CANDIDATE_STORAGE_BUCKETS = ['cv-original', 'cv-formatted'] as const;

export type CandidateStorageBucket = (typeof CANDIDATE_STORAGE_BUCKETS)[number];

export type CandidateStorageObjects = Record<CandidateStorageBucket, string[]>;

/**
 * Chemin de l'objet dans `bucket` à partir de son URL Supabase (publique ou signée), ou
 * `undefined` si l'URL ne vise pas ce bucket.
 */
export function storagePathFromUrl(
  url: string | null | undefined,
  bucket: string,
): string | undefined {
  if (!url) return undefined;
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return undefined;
  const raw = url.slice(index + marker.length).split(/[?#]/)[0];
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Retient le chemin s'il est rangé sous `<orgId>/` et ne remonte pas d'un dossier. */
function belongsToOrg(path: string | undefined, orgId: string): path is string {
  return Boolean(path && orgId && path.startsWith(`${orgId}/`) && !path.split('/').includes('..'));
}

/**
 * Liste, par bucket et sans doublon, les objets à effacer avec la fiche.
 */
export function collectCandidateStorageObjects({
  orgId,
  candidate,
  positionings = [],
}: {
  orgId: string;
  candidate: { original_file_url?: string | null; formatted_file_url?: string | null };
  positionings?: { tailored_file_url?: string | null }[];
}): CandidateStorageObjects {
  const original = new Set<string>();
  const formatted = new Set<string>();

  const originalPath = storagePathFromUrl(candidate.original_file_url, 'cv-original');
  if (belongsToOrg(originalPath, orgId)) original.add(originalPath);

  const formattedUrls = [
    candidate.formatted_file_url,
    ...positionings.map((positioning) => positioning.tailored_file_url),
  ];
  for (const url of formattedUrls) {
    const path = storagePathFromUrl(url, 'cv-formatted');
    if (belongsToOrg(path, orgId)) formatted.add(path);
  }

  return { 'cv-original': [...original], 'cv-formatted': [...formatted] };
}
