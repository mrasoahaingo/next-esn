import { renderToBuffer } from '@json-render/react-pdf/render';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { buildCvSpec } from './pdf.template';
import { fixedComponents } from './pdf.registry';

export async function generateHimeoPdf(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
): Promise<Uint8Array> {
  const spec = buildCvSpec(data, templateConfig);
  return renderToBuffer(spec, { registry: fixedComponents });
}
