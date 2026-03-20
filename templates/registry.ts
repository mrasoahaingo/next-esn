import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { buildEsneoCvSpec, ESNEO_TEMPLATE_LABEL } from '@/templates/esneo';
import { buildHimeoCvSpec, HIMEO_TEMPLATE_LABEL } from '@/templates/himeo';

export type CvTemplateBuilder = (
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
) => Spec;

export const CV_CODE_TEMPLATES = {
  esneo: buildEsneoCvSpec,
  himeo: buildHimeoCvSpec,
} as const satisfies Record<string, CvTemplateBuilder>;

export const CV_CODE_TEMPLATE_LABELS: Record<keyof typeof CV_CODE_TEMPLATES, string> = {
  esneo: ESNEO_TEMPLATE_LABEL,
  himeo: HIMEO_TEMPLATE_LABEL,
};

export type CvCodeTemplateId = keyof typeof CV_CODE_TEMPLATES;

/**
 * Ordre d’affichage (admin) + valeurs acceptées par l’API.
 * Doit lister exactement les clés de `CV_CODE_TEMPLATES` (pas seulement `Object.keys` au cas où le bundle serait obsolète côté déploiement, cette liste reste la référence explicite dans le repo).
 */
export const CV_CODE_TEMPLATE_IDS: CvCodeTemplateId[] = ['esneo', 'himeo'];

if (process.env.NODE_ENV === 'development') {
  const fromTemplates = new Set(Object.keys(CV_CODE_TEMPLATES));
  const fromList = new Set(CV_CODE_TEMPLATE_IDS);
  if (fromTemplates.size !== fromList.size || ![...fromTemplates].every((k) => fromList.has(k as CvCodeTemplateId))) {
    throw new Error('CV_CODE_TEMPLATE_IDS is out of sync with CV_CODE_TEMPLATES');
  }
}

export function resolveCvTemplateBuilder(key: string): CvTemplateBuilder {
  if (key in CV_CODE_TEMPLATES) {
    return CV_CODE_TEMPLATES[key as CvCodeTemplateId];
  }
  return CV_CODE_TEMPLATES.himeo;
}

export function isCvCodeTemplateId(id: string): id is CvCodeTemplateId {
  return id in CV_CODE_TEMPLATES;
}
