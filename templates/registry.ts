import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { buildCvDossierLayoutSpec } from '@/templates/cv-dossier-layout';

export function buildCvTemplateSpec(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
): Spec {
  return buildCvDossierLayoutSpec(data, templateConfig);
}
