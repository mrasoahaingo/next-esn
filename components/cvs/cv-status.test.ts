import { describe, expect, it } from 'vitest';
import {
  cvStatus,
  isCvWorkflowRunning,
  isPositioningWorkflowRunning,
  positioningResetStatus,
  positioningStatus,
} from './cv-status';

describe('cvStatus', () => {
  it('donne un libellé français et un ton à chaque statut connu', () => {
    expect(cvStatus('extracting')).toEqual({ label: 'En extraction', tone: 'info', pulse: true });
    expect(cvStatus('reviewing').tone).toBe('warn');
    expect(cvStatus('ready').tone).toBe('ok');
    expect(cvStatus('error')).toEqual({ label: 'Échec', tone: 'err', pulse: false });
  });

  it('traite un statut inconnu comme « Importé »', () => {
    expect(cvStatus('mystère')).toEqual(cvStatus('uploaded'));
  });
});

describe('positioningStatus', () => {
  it('fait respirer la pastille pendant l’analyse et la génération', () => {
    expect(positioningStatus('analyzing').pulse).toBe(true);
    expect(positioningStatus('generating').pulse).toBe(true);
    expect(positioningStatus('analyzed').pulse).toBe(false);
  });

  it('traite un statut inconnu comme « Brouillon »', () => {
    expect(positioningStatus('')).toEqual(positioningStatus('draft'));
  });
});

describe('workflows annulables', () => {
  it('ne propose l’annulation que pendant un travail en cours', () => {
    expect(isCvWorkflowRunning('extracting')).toBe(true);
    expect(isCvWorkflowRunning('reviewing')).toBe(false);
    expect(isPositioningWorkflowRunning('analyzing')).toBe(true);
    expect(isPositioningWorkflowRunning('generating')).toBe(true);
    expect(isPositioningWorkflowRunning('analyzed')).toBe(false);
  });

  it('ramène un positionnement au statut d’avant le travail annulé', () => {
    expect(positioningResetStatus('analyzing')).toBe('draft');
    expect(positioningResetStatus('generating')).toBe('analyzed');
  });
});
