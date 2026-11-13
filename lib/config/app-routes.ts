// ─── Routes de l'app ─────────────────────────────────────────────────────────
// Préfixes des pages de l'app derrière la connexion : un par dossier de `app/`
// (le groupe `(dashboard)` compte pour `dashboard`), hors pages
// publiques (`/`, `/sign-in`, `/sign-up`) et hors `/org-selection`, traitée à
// part. Tout chemin hors de cette liste est public : un chemin inconnu tombe
// sur la vraie 404 au lieu de renvoyer vers la connexion.
// Ajouter ici tout nouveau dossier de route de l'app, avec son `loading.tsx`
// (repli partagé : components/route-loading.tsx).
export const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/positions',
  '/review',
  '/settings',
  '/templates',
  '/admin',
] as const;

/** Sélection d'organisation : publique pour le middleware, coque de l'app une fois connecté. */
export const ORG_SELECTION_PREFIX = '/org-selection';

export function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Vrai pour une page de l'app (coque, sidebar, connexion requise), faux pour une page publique ou inconnue. */
export function isAppPath(pathname: string): boolean {
  return (
    APP_ROUTE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix)) ||
    matchesPrefix(pathname, ORG_SELECTION_PREFIX)
  );
}
