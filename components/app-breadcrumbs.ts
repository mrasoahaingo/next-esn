export type Crumb = { label: string; href?: string };

export type CrumbParams = {
  id?: string | string[];
  positioningId?: string | string[];
};

const HOME: Crumb = { label: 'Accueil', href: '/dashboard' };
const CVS: Crumb = { label: 'CVs', href: '/cvs' };

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Fil d'Ariane de la coque : où l'on est, en deux ou trois pas. Le `h1` de la page
 * dit quoi (DESIGN.md § Typographie). Pure : testée dans `app-breadcrumbs.test.ts`.
 */
export function buildBreadcrumbs(pathname: string, params: CrumbParams | null | undefined): Crumb[] {
  const id = single(params?.id);
  const positioningId = single(params?.positioningId);

  if (pathname === '/dashboard') {
    return [{ label: 'Tableau de bord' }];
  }

  if (pathname === '/cvs' || pathname.startsWith('/cvs/')) {
    return [HOME, { label: 'CVs' }];
  }

  if (pathname.startsWith('/templates')) {
    if (pathname === '/templates') {
      return [HOME, { label: 'Modèles' }];
    }
    return [HOME, { label: 'Modèles', href: '/templates' }, { label: id ? 'Modèle' : 'Détail' }];
  }

  if (pathname.startsWith('/positions')) {
    if (pathname === '/positions') {
      return [HOME, { label: 'Missions' }];
    }
    return [HOME, { label: 'Missions', href: '/positions' }, { label: 'Mission' }];
  }

  if (pathname.startsWith('/review/')) {
    const cvHref = id ? `/review/${id}` : '/cvs';

    if (positioningId) {
      return [HOME, CVS, { label: 'CV', href: cvHref }, { label: 'Positionnement' }];
    }
    if (pathname.endsWith('/positioning')) {
      return [HOME, CVS, { label: 'CV', href: cvHref }, { label: 'Nouveau positionnement' }];
    }
    return [HOME, CVS, { label: 'Édition CV' }];
  }

  if (pathname.startsWith('/settings/')) {
    if (pathname.startsWith('/settings/profile')) {
      return [HOME, { label: 'Mes technos' }];
    }
    if (pathname.startsWith('/settings/organization')) {
      return [HOME, { label: 'Organisation' }];
    }
    if (pathname.startsWith('/settings/team/skills')) {
      return [HOME, { label: 'Équipe', href: '/settings/team' }, { label: 'Compétences' }];
    }
    if (pathname.startsWith('/settings/team')) {
      return [HOME, { label: 'Équipe' }];
    }
    return [HOME, { label: 'Réglages' }];
  }

  if (pathname.startsWith('/admin')) {
    return [HOME, { label: 'Administration' }];
  }

  return [HOME, { label: 'Application' }];
}
