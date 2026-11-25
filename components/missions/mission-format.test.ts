import { describe, expect, it } from 'vitest';
import {
  formatPositioningCount,
  formatSelectedCount,
  formatWeight,
  missionHeaderDescription,
  missionPageTitle,
  missionPositioningStatus,
  sortPositioningsByScore,
} from './mission-format';

describe('missionPageTitle', () => {
  it('compose intitulé et entreprise avec un tiret cadratin', () => {
    expect(missionPageTitle({ title: 'Tech lead Java', company: 'Acme' })).toBe('Tech lead Java — Acme');
    expect(missionPageTitle({ title: 'Tech lead Java', company: '  ' })).toBe('Tech lead Java');
    expect(missionPageTitle({ title: null, company: null })).toBe('Mission');
  });
});

describe('missionHeaderDescription', () => {
  it('donne le niveau attendu quand l’analyse est là', () => {
    expect(missionHeaderDescription({ phase: 'done', band: 'senior', statedLevel: 'Développeur senior' })).toBe(
      'Niveau attendu : Senior — Développeur senior',
    );
    expect(missionHeaderDescription({ phase: 'stale', band: 'junior', statedLevel: 'Non précisé dans la fiche.' })).toBe(
      'Niveau attendu : Junior.',
    );
  });

  it('retombe sur la phrase d’état sinon', () => {
    expect(missionHeaderDescription({ phase: 'done', band: 'unclear' })).toBe('Fiche analysée.');
    expect(missionHeaderDescription({ phase: 'running', band: 'senior' })).toBe('Analyse de la fiche en cours.');
    expect(missionHeaderDescription({ phase: 'failed' })).toBe('L’analyse de la fiche a échoué.');
    expect(missionHeaderDescription({ phase: 'todo' })).toBe('Fiche à analyser.');
  });
});

describe('missionPositioningStatus', () => {
  it('montre l’extraction tant que le CV importé s’extrait', () => {
    expect(missionPositioningStatus({ status: 'draft', addedVia: 'cv_upload', candidateStatus: 'extracting' })).toEqual({
      label: 'En extraction',
      tone: 'info',
      pulse: true,
    });
    expect(missionPositioningStatus({ status: 'draft', addedVia: 'cv_upload', candidateStatus: 'error' }).tone).toBe('err');
  });

  it('reprend les statuts de positionnement partagés ensuite', () => {
    expect(missionPositioningStatus({ status: 'draft', addedVia: 'existing_candidate' }).label).toBe('En attente d’analyse');
    expect(missionPositioningStatus({ status: 'analyzing', addedVia: 'cv_upload', candidateStatus: 'ready' })).toMatchObject({
      label: 'Analyse en cours',
      pulse: true,
    });
    expect(missionPositioningStatus({ status: 'analyzed' }).tone).toBe('ok');
    expect(missionPositioningStatus({ status: 'error' }).tone).toBe('err');
  });
});

describe('sortPositioningsByScore', () => {
  it('classe par score décroissant, les sans-score en fin, puis par date', () => {
    const sorted = sortPositioningsByScore([
      { id: 'a', analysis: null, created_at: '2026-11-01' },
      { id: 'b', analysis: { matchScore: 40 }, created_at: '2026-11-02' },
      { id: 'c', analysis: { matchScore: 80 }, created_at: '2026-11-03' },
      { id: 'd', analysis: null, created_at: '2026-11-04' },
    ]);
    expect(sorted.map((p) => p.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

describe('formats', () => {
  it('arrondit le poids en pourcentage', () => {
    expect(formatWeight(0.347)).toBe('35 %');
    expect(formatWeight(null)).toBeNull();
  });

  it('accorde les compteurs', () => {
    expect(formatPositioningCount(0)).toBe('Aucun positionnement');
    expect(formatPositioningCount(1)).toBe('1 positionnement');
    expect(formatPositioningCount(3)).toBe('3 positionnements');
    expect(formatSelectedCount(1)).toBe('1 candidat sélectionné');
    expect(formatSelectedCount(2)).toBe('2 candidats sélectionnés');
  });
});
