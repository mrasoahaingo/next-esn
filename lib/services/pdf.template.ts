import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { resolveCvTemplateBuilder } from '@/templates/registry';

/**
 * Construit le Spec json-render pour le PDF CV.
 * @param codeTemplateKey — clé du registre (`templates/registry.ts`), ex. `himeo`
 */
export function buildCvSpec(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
  codeTemplateKey: string = 'himeo',
): Spec {
  const builder = resolveCvTemplateBuilder(codeTemplateKey);
  return builder(data, templateConfig);
}
