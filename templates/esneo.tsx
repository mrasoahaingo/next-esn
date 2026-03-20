import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { buildCvDossierLayoutSpec, ESNEO_DOSSIER_VARIANT } from '@/templates/cv-dossier-layout';

export const ESNEO_TEMPLATE_ID = 'esneo' as const;
export const ESNEO_TEMPLATE_LABEL = 'Esneo (dossier de compétences)';

export function buildEsneoCvSpec(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
): Spec {
  return buildCvDossierLayoutSpec(data, templateConfig, ESNEO_DOSSIER_VARIANT);
}
