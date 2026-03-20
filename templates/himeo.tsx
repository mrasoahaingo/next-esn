import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { buildCvDossierLayoutSpec, HIMEO_DOSSIER_VARIANT } from '@/templates/cv-dossier-layout';

export const HIMEO_TEMPLATE_ID = 'himeo' as const;
export const HIMEO_TEMPLATE_LABEL = 'Himeo (dossier de compétences)';

export function buildHimeoCvSpec(
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
): Spec {
  return buildCvDossierLayoutSpec(data, templateConfig, HIMEO_DOSSIER_VARIANT);
}
