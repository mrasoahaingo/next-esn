import { renderToBuffer } from '@json-render/react-pdf/render';
import type { ExtractedCV } from '@/lib/schema';
import { buildCvSpec } from './pdf.template';
import { fixedComponents } from './pdf.registry';

export async function generateHimeoPdf(data: Partial<ExtractedCV>): Promise<Uint8Array> {
  const spec = buildCvSpec(data);
  return renderToBuffer(spec, { registry: fixedComponents });
}
