import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { buildCvTemplateSpec } from '@/templates/registry';

/**
 * Construit le Spec json-render pour le PDF CV.
 */
export function buildCvSpec(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
): Spec {
  return buildCvTemplateSpec(data, templateConfig);
}
