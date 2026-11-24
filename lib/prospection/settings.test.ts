import { describe, expect, it } from 'vitest';
import { prospectionSettingsPutSchema } from '@/lib/validation/prospection-settings';
import { toProspectionSettings } from '@/lib/prospection/settings';
import { DEFAULT_HEAT_THRESHOLD } from '@/lib/prospection/constants';

describe('prospectionSettingsPutSchema', () => {
  it.each([0, 60, 100])('accepte heat_threshold = %s', (value) => {
    const parsed = prospectionSettingsPutSchema.safeParse({ heat_threshold: value });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.heat_threshold).toBe(value);
  });

  it.each([
    ['-1', { heat_threshold: -1 }],
    ['101', { heat_threshold: 101 }],
    ['60.5', { heat_threshold: 60.5 }],
    ["'60' (chaîne)", { heat_threshold: '60' }],
    ['null', { heat_threshold: null }],
    ['objet vide', {}],
  ])('rejette %s', (_label, body) => {
    expect(prospectionSettingsPutSchema.safeParse(body).success).toBe(false);
  });

  it('retire un org_id injecté dans le corps', () => {
    const parsed = prospectionSettingsPutSchema.safeParse({
      heat_threshold: 70,
      org_id: 'org_other',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({ heat_threshold: 70 });
      expect('org_id' in parsed.data).toBe(false);
    }
  });
});

describe('toProspectionSettings', () => {
  it('renvoie le défaut 60 quand aucune ligne n’existe', () => {
    expect(toProspectionSettings(null)).toEqual({
      heat_threshold: DEFAULT_HEAT_THRESHOLD,
      is_default: true,
    });
    expect(DEFAULT_HEAT_THRESHOLD).toBe(60);
  });

  it('renvoie la valeur enregistrée quand une ligne existe', () => {
    expect(toProspectionSettings({ heat_threshold: 75 })).toEqual({
      heat_threshold: 75,
      is_default: false,
    });
  });
});
