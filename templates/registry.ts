import type { Spec } from '@json-render/core';
import type { ExtractedCV, TemplateConfig } from '@/lib/schema';
import { buildHimeoCvSpec, HIMEO_TEMPLATE_LABEL } from '@/templates/himeo';

export type CvTemplateBuilder = (
  data: Partial<ExtractedCV>,
  templateConfig?: Partial<TemplateConfig>,
) => Spec;

export const CV_CODE_TEMPLATES = {
  himeo: buildHimeoCvSpec,
} as const satisfies Record<string, CvTemplateBuilder>;

export const CV_CODE_TEMPLATE_LABELS: Record<keyof typeof CV_CODE_TEMPLATES, string> = {
  himeo: HIMEO_TEMPLATE_LABEL,
};

export type CvCodeTemplateId = keyof typeof CV_CODE_TEMPLATES;

/** Ids déclarés dans le code (pour admin + validation API). */
export const CV_CODE_TEMPLATE_IDS = Object.keys(CV_CODE_TEMPLATES) as CvCodeTemplateId[];

export function resolveCvTemplateBuilder(key: string): CvTemplateBuilder {
  if (key in CV_CODE_TEMPLATES) {
    return CV_CODE_TEMPLATES[key as CvCodeTemplateId];
  }
  return CV_CODE_TEMPLATES.himeo;
}

export function isCvCodeTemplateId(id: string): id is CvCodeTemplateId {
  return id in CV_CODE_TEMPLATES;
}
