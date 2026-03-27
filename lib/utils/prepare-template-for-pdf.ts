import type { TemplateConfig } from '@/lib/schema';

const SVG_TAG = /<svg[\s>/]/i;

/**
 * React-PDF `<Image>` ne rend pas correctement les SVG (data URL ou fichier).
 * On rasterise le SVG collé en PNG (data URL) avant `buildCvSpec`.
 */
export async function prepareTemplateConfigForPdf(config: TemplateConfig): Promise<TemplateConfig> {
  const inline = config.logo.svgInline?.trim();
  if (!inline || !SVG_TAG.test(inline)) {
    return config;
  }

  try {
    const sharp = (await import('sharp')).default;
    const w = Math.max(1, Math.round(config.logo.width));
    const h = Math.max(1, Math.round(config.logo.height));
    const scale = 2;
    const png = await sharp(Buffer.from(inline, 'utf8'), { density: 144 })
      .resize(w * scale, h * scale, { fit: 'inside' })
      .png()
      .toBuffer();
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    return {
      ...config,
      logo: {
        ...config.logo,
        url: dataUrl,
        svgInline: undefined,
      },
    };
  } catch (e) {
    console.error('Logo SVG rasterization failed:', e);
    return {
      ...config,
      logo: {
        ...config.logo,
        svgInline: undefined,
      },
    };
  }
}
