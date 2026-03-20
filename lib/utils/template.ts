import { getSupabase } from './supabase';
import type { TemplateConfig } from '@/lib/schema';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';

const PREFIX_MAX = 40;

export function sanitizePdfExportPrefix(raw: string | null | undefined): string {
  const base = (raw ?? 'CV').trim();
  const cleaned = base.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const sliced = cleaned.slice(0, PREFIX_MAX);
  return sliced || 'CV';
}

/**
 * Server-side: template config for the org (candidate’s template or org default).
 * Tout le rendu CV (couleurs, logo, pied de page, préfixe export) vient du gabarit.
 */
export async function getTemplateConfig(
  orgId: string,
  templateId?: string | null,
): Promise<Partial<TemplateConfig> | undefined> {
  const supabase = getSupabase();
  let templatePartial: Partial<TemplateConfig> | undefined;

  if (templateId) {
    const { data } = await supabase
      .from('templates')
      .select('config')
      .eq('id', templateId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (data?.config) templatePartial = data.config as Partial<TemplateConfig>;
  }

  if (!templatePartial) {
    const { data: defaults } = await supabase
      .from('templates')
      .select('config')
      .eq('org_id', orgId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();
    if (defaults?.config) templatePartial = defaults.config as Partial<TemplateConfig>;
  }

  return templatePartial;
}

/** Fusionne un config DB (ou vide) avec les défauts Himeo / code pour un rendu PDF fiable. */
export function mergeTemplateWithDefaults(
  partial: Partial<TemplateConfig> | undefined | null,
): TemplateConfig {
  const p = partial && typeof partial === 'object' ? partial : {};
  return {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...p,
    colors: { ...DEFAULT_TEMPLATE_CONFIG.colors, ...p.colors },
    logo: { ...DEFAULT_TEMPLATE_CONFIG.logo, ...p.logo },
    footer: { ...DEFAULT_TEMPLATE_CONFIG.footer, ...p.footer },
    sections: p.sections ?? DEFAULT_TEMPLATE_CONFIG.sections,
    exportFilePrefix: p.exportFilePrefix ?? DEFAULT_TEMPLATE_CONFIG.exportFilePrefix,
  };
}
