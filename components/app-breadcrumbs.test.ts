import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs } from './app-breadcrumbs';

describe('buildBreadcrumbs', () => {
  it('le tableau de bord est seul, sans lien', () => {
    expect(buildBreadcrumbs('/dashboard', {})).toEqual([{ label: 'Tableau de bord' }]);
  });

  it('/cvs : Accueil › CVs', () => {
    expect(buildBreadcrumbs('/cvs', {})).toEqual([
      { label: 'Accueil', href: '/dashboard' },
      { label: 'CVs' },
    ]);
  });

  it("l'édition d'un CV remonte vers /cvs", () => {
    expect(buildBreadcrumbs('/review/abc', { id: 'abc' })).toEqual([
      { label: 'Accueil', href: '/dashboard' },
      { label: 'CVs', href: '/cvs' },
      { label: 'Édition CV' },
    ]);
  });

  it('un positionnement remonte vers le CV puis vers /cvs', () => {
    expect(buildBreadcrumbs('/review/abc/positioning/p1', { id: 'abc', positioningId: 'p1' })).toEqual([
      { label: 'Accueil', href: '/dashboard' },
      { label: 'CVs', href: '/cvs' },
      { label: 'CV', href: '/review/abc' },
      { label: 'Positionnement' },
    ]);
  });

  it('un nouveau positionnement est nommé comme tel', () => {
    expect(buildBreadcrumbs('/review/abc/positioning', { id: 'abc' }).at(-1)).toEqual({
      label: 'Nouveau positionnement',
    });
  });

  it('sans identifiant de CV, le pas « CV » retombe sur /cvs', () => {
    expect(buildBreadcrumbs('/review/x/positioning', {})[2]).toEqual({ label: 'CV', href: '/cvs' });
  });

  it('les missions portent le nom du menu', () => {
    expect(buildBreadcrumbs('/positions', {})).toEqual([
      { label: 'Accueil', href: '/dashboard' },
      { label: 'Missions' },
    ]);
    expect(buildBreadcrumbs('/positions/m1', { id: 'm1' })).toEqual([
      { label: 'Accueil', href: '/dashboard' },
      { label: 'Missions', href: '/positions' },
      { label: 'Mission' },
    ]);
  });

  it('les réglages et l’administration', () => {
    expect(buildBreadcrumbs('/settings/team/skills', {})).toEqual([
      { label: 'Accueil', href: '/dashboard' },
      { label: 'Équipe', href: '/settings/team' },
      { label: 'Compétences' },
    ]);
    expect(buildBreadcrumbs('/settings/team', {}).at(-1)).toEqual({ label: 'Équipe' });
    expect(buildBreadcrumbs('/admin', {}).at(-1)).toEqual({ label: 'Administration' });
  });

  it('accepte les paramètres en tableau et absents', () => {
    expect(buildBreadcrumbs('/review/abc', { id: ['abc'] })[1]).toEqual({ label: 'CVs', href: '/cvs' });
    expect(buildBreadcrumbs('/inconnu', null).at(-1)).toEqual({ label: 'Application' });
  });
});
