import { renderToBuffer } from '@json-render/react-pdf/render';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { buildCvSpec } from './pdf.template';
import { fixedComponents } from './pdf.registry';
import { getOrganizationSettings } from '@/lib/utils/org-settings';

export async function generateHimeoPdf(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
  orgId?: string | null,
): Promise<Uint8Array> {
  let codeTemplateKey = 'himeo';
  if (orgId) {
    try {
      const settings = await getOrganizationSettings(orgId);
      const k = settings?.cv_code_template?.trim();
      if (k) codeTemplateKey = k;
    } catch {
      codeTemplateKey = 'himeo';
    }
  }
  const spec = buildCvSpec(data, templateConfig, codeTemplateKey);
  return renderToBuffer(spec, { registry: fixedComponents });
}
