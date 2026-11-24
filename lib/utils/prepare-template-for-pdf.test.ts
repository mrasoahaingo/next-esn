import { describe, expect, it } from 'vitest';
import { prepareTemplateConfigForPdf } from '@/lib/utils/prepare-template-for-pdf';
import { mergeTemplateWithDefaults } from '@/lib/utils/template';

describe('prepareTemplateConfigForPdf', () => {
  it('rastérise le logo Esneo par défaut en PNG quand le gabarit n’a ni url ni svgInline', async () => {
    const config = mergeTemplateWithDefaults(undefined);
    expect(config.logo.url).toBe('');
    expect(config.logo.svgInline).toBeUndefined();

    const prepared = await prepareTemplateConfigForPdf(config);
    expect(prepared.logo.url.startsWith('data:image/png;base64,')).toBe(true);
    expect(prepared.logo.url.length).toBeGreaterThan('data:image/png;base64,'.length + 100);
    expect(prepared.logo.svgInline).toBeUndefined();
  });

  it('laisse un logo url personnalisé inchangé', async () => {
    const config = mergeTemplateWithDefaults({
      logo: { url: 'https://exemple.test/logo.png', width: 90, height: 20 },
    });
    const prepared = await prepareTemplateConfigForPdf(config);
    expect(prepared.logo.url).toBe('https://exemple.test/logo.png');
  });

  it('rastérise toujours un svgInline collé', async () => {
    const config = mergeTemplateWithDefaults({
      logo: {
        url: '',
        width: 40,
        height: 20,
        svgInline: '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#f00"/></svg>',
      },
    });
    const prepared = await prepareTemplateConfigForPdf(config);
    expect(prepared.logo.url.startsWith('data:image/png;base64,')).toBe(true);
    expect(prepared.logo.svgInline).toBeUndefined();
  });
});
