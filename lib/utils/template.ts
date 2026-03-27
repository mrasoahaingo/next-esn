import {
  DEFAULT_TEMPLATE_BLOCKS,
  DEFAULT_TEMPLATE_CONFIG,
  type TemplateBlock,
  type TemplateBlockVariant,
  type TemplateBlockType,
  type TemplateConfig,
} from '@/lib/schema';
import { getSupabase } from './supabase';

const PREFIX_MAX = 40;
const LEGACY_SECTION_TO_BLOCK: Record<string, TemplateBlockType> = {
  summary: 'summary',
  skills: 'skills',
  education: 'education',
  experiences: 'experiences',
};

type LegacyTemplateConfig = {
  themeId?: string;
  colors?: Partial<TemplateConfig['colors']>;
  logo?: Partial<TemplateConfig['logo']>;
  header?: Partial<TemplateConfig['header']>;
  footer?: Partial<
    TemplateConfig['footer'] & {
      line1?: string;
      line2?: string;
    }
  >;
  blocks?: Partial<TemplateBlock>[];
  sections?: string[];
  exportFilePrefix?: string;
};

export function sanitizePdfExportPrefix(raw: string | null | undefined): string {
  const base = (raw ?? 'CV').trim();
  const cleaned = base.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const sliced = cleaned.slice(0, PREFIX_MAX);
  return sliced || 'CV';
}

/**
 * `src` pour le logo PDF : URL (y compris data PNG après pré-traitement) → fallback fichier.
 * Le SVG collé est converti en PNG dans `prepareTemplateConfigForPdf` (React-PDF ne gère pas le SVG en Image).
 */
export function resolvePdfLogoSrc(logo: TemplateConfig['logo'], fallbackSrc: string): string {
  const url = logo.url?.trim();
  if (url) return url;
  return fallbackSrc;
}

function resolveBlockVariant(value: string | undefined): TemplateBlockVariant | undefined {
  return value === 'compact' || value === 'detailed' || value === 'default' ? value : undefined;
}

function normalizeBlocks(raw: LegacyTemplateConfig): TemplateBlock[] {
  if (Array.isArray(raw.blocks) && raw.blocks.length > 0) {
    const normalized = raw.blocks
      .map((block) => {
        const type = block?.type;
        if (
          type !== 'profile-info' &&
          type !== 'summary' &&
          type !== 'skills' &&
          type !== 'education' &&
          type !== 'experiences'
        ) {
          return null;
        }

        const enabled = block.enabled ?? true;
        const variant = resolveBlockVariant(block.variant);

        const normalizedBlock: TemplateBlock = { type, enabled };
        if (variant) normalizedBlock.variant = variant;
        return normalizedBlock;
      })
      .filter((block): block is TemplateBlock => block !== null);

    if (normalized.length > 0) {
      const seen = new Set(normalized.map((block) => block.type));
      return [
        ...normalized,
        ...DEFAULT_TEMPLATE_BLOCKS.filter((block) => !seen.has(block.type)).map((block) => ({
          ...block,
          enabled: false,
        })),
      ];
    }
  }

  const legacySections = Array.isArray(raw.sections) ? raw.sections : null;
  if (legacySections) {
    const ordered = legacySections
      .map((section) => LEGACY_SECTION_TO_BLOCK[section])
      .filter((section): section is TemplateBlockType => Boolean(section));
    const seen = new Set(ordered);
    return [
      { type: 'profile-info', enabled: true, variant: 'default' as const },
      ...ordered.map((type) => ({
        type,
        enabled: true,
        variant: (type === 'experiences' ? 'detailed' : 'default') as TemplateBlockVariant,
      })),
      ...DEFAULT_TEMPLATE_BLOCKS.filter((block) => !seen.has(block.type) && block.type !== 'profile-info').map(
        (block) => ({
          ...block,
          enabled: false,
        }),
      ),
    ];
  }

  return DEFAULT_TEMPLATE_BLOCKS.map((block) => ({ ...block }));
}

export function normalizeTemplateConfig(
  raw: Partial<TemplateConfig> | LegacyTemplateConfig | undefined | null,
): TemplateConfig {
  const config = raw && typeof raw === 'object' ? (raw as LegacyTemplateConfig) : {};
  const blocks = normalizeBlocks(config);
  const legacyFooter = config.footer ?? {};

  return {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...config,
    themeId: DEFAULT_TEMPLATE_CONFIG.themeId,
    colors: { ...DEFAULT_TEMPLATE_CONFIG.colors, ...config.colors },
    logo: { ...DEFAULT_TEMPLATE_CONFIG.logo, ...config.logo },
    header: {
      ...DEFAULT_TEMPLATE_CONFIG.header,
      companyName: config.header?.companyName ?? '',
      documentTitle: config.header?.documentTitle ?? DEFAULT_TEMPLATE_CONFIG.header.documentTitle,
      tagLine: config.header?.tagLine ?? '',
      metaLine: config.header?.metaLine ?? '',
      showCandidateName: config.header?.showCandidateName ?? DEFAULT_TEMPLATE_CONFIG.header.showCandidateName,
    },
    footer: {
      ...DEFAULT_TEMPLATE_CONFIG.footer,
      leftText: legacyFooter.leftText ?? legacyFooter.line1 ?? DEFAULT_TEMPLATE_CONFIG.footer.leftText,
      centerText: legacyFooter.centerText ?? '',
      rightText: legacyFooter.rightText ?? legacyFooter.line2 ?? DEFAULT_TEMPLATE_CONFIG.footer.rightText,
    },
    blocks,
    exportFilePrefix: config.exportFilePrefix ?? DEFAULT_TEMPLATE_CONFIG.exportFilePrefix,
  };
}

/**
 * Server-side: résout le `TemplateConfig` pour une org.
 * Gabarits en base sont globaux (`templates.org_id` NULL). Défaut par org :
 * `organization_settings.default_template_id`, sinon gabarit plateforme (`is_default`, seed 20260416).
 * Le rendu CV ne repose pas sur un gabarit par candidat.
 */
export async function getTemplateConfig(
  orgId: string,
  templateId?: string | null,
): Promise<TemplateConfig | undefined> {
  const supabase = getSupabase();
  let templatePartial: LegacyTemplateConfig | undefined;

  if (templateId) {
    const { data } = await supabase
      .from('templates')
      .select('config')
      .eq('id', templateId)
      .maybeSingle();
    if (data?.config) templatePartial = data.config as LegacyTemplateConfig;
  }

  if (!templatePartial) {
    const { data: settings } = await supabase
      .from('organization_settings')
      .select('default_template_id')
      .eq('org_id', orgId)
      .maybeSingle();

    if (settings?.default_template_id) {
      const { data: row } = await supabase
        .from('templates')
        .select('config')
        .eq('id', settings.default_template_id)
        .maybeSingle();
      if (row?.config) templatePartial = row.config as LegacyTemplateConfig;
    }
  }

  if (!templatePartial) {
    const { data: platformDefault } = await supabase
      .from('templates')
      .select('config')
      .is('org_id', null)
      .eq('is_default', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (platformDefault?.config)
      templatePartial = platformDefault.config as LegacyTemplateConfig;
  }

  if (!templatePartial) return undefined;

  return normalizeTemplateConfig(templatePartial);
}

export function mergeTemplateWithDefaults(
  partial: Partial<TemplateConfig> | LegacyTemplateConfig | undefined | null,
): TemplateConfig {
  return normalizeTemplateConfig(partial);
}
