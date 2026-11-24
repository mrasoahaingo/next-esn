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
  // Toujours préparer, même sans gabarit : le logo par défaut est rastérisé à cette étape.
  const resolved: TemplateConfig = await prepareTemplateConfigForPdf(
    mergeTemplateWithDefaults(templateConfig),
  );
  const spec = buildCvSpec(data, resolved);
  return renderToBuffer(spec, { registry: fixedComponents });
}
