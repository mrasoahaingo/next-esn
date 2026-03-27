import { renderToBuffer } from '@json-render/react-pdf/render';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { mergeTemplateWithDefaults } from '@/lib/utils/template';
import { prepareTemplateConfigForPdf } from '@/lib/utils/prepare-template-for-pdf';
import { buildCvSpec } from './pdf.template';
import { fixedComponents } from './pdf.registry';

export async function generateCvPdf(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
): Promise<Uint8Array> {
  let resolved: TemplateConfig | undefined;
  if (templateConfig !== undefined) {
    const merged = mergeTemplateWithDefaults(templateConfig);
    resolved = await prepareTemplateConfigForPdf(merged);
  }
  const spec = buildCvSpec(data, resolved);
  return renderToBuffer(spec, { registry: fixedComponents });
}
