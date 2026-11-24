import { describe, expect, it } from 'vitest';
import type { ExtractedCV } from '@/lib/schema';
import { buildCvDossierLayoutSpec } from '@/templates/cv-dossier-layout';
import { mergeTemplateWithDefaults } from '@/lib/utils/template';

const cvMinimal: Partial<ExtractedCV> = {
  personalInfo: { firstName: 'Ada', lastName: 'Lovelace', title: 'Développeuse' },
  summary: 'Profil **senior**.',
};

function allSrcValues(spec: ReturnType<typeof buildCvDossierLayoutSpec>): string[] {
  return Object.values(spec.elements)
    .map((el) => (el.props as Record<string, unknown> | undefined)?.src)
    .filter((src): src is string => typeof src === 'string');
}

describe('buildCvDossierLayoutSpec — logo', () => {
  it('ne crée pas de header-logo ni de src file: quand le logo est vide', () => {
    const defaults = mergeTemplateWithDefaults(undefined);
    const spec = buildCvDossierLayoutSpec(cvMinimal, {
      ...defaults,
      logo: { url: '', width: 90, height: 20 },
    });
    expect(spec.elements['header-logo']).toBeUndefined();
    expect(spec.elements['header-brand-top']?.children).not.toContain('header-logo');
    expect(allSrcValues(spec).some((src) => src.startsWith('file:'))).toBe(false);
  });

  it('utilise la data URL du logo préparé', () => {
    const defaults = mergeTemplateWithDefaults(undefined);
    const spec = buildCvDossierLayoutSpec(cvMinimal, {
      ...defaults,
      logo: { url: 'data:image/png;base64,AAAA', width: 90, height: 20 },
    });
    expect((spec.elements['header-logo']?.props as { src?: string }).src).toBe('data:image/png;base64,AAAA');
    expect(spec.elements['header-brand-top']?.children).toContain('header-logo');
  });
});
