import type { TemplateConfig } from '@/lib/schema';
import { buildEsneoWordmarkSvg, PDF_HEADER_LOGO_FILL } from '@/lib/utils/esneo-wordmark-svg';

const SVG_TAG = /<svg[\s>/]/i;

/** Rastérise un SVG en PNG (data URL), à 2x la taille d'affichage pour un rendu net. */
async function rasterizeSvgToPngDataUrl(svg: string, width: number, height: number): Promise<string> {
  const sharp = (await import('sharp')).default;
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const scale = 2;
  const png = await sharp(Buffer.from(svg, 'utf8'), { density: 144 })
    .resize(w * scale, h * scale, { fit: 'inside' })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * React-PDF `<Image>` n'accepte que JPEG/PNG (data URL, URL distante ou fichier) : un SVG échoue.
 * Avant `buildCvSpec`, on rastérise donc en PNG (data URL) :
 * - le SVG collé dans le gabarit (`logo.svgInline`) ;
 * - à défaut de `logo.url`, le logo Esneo par défaut, construit en mémoire (l'ancien repli
 *   `file:///…/public/esneo-full.svg` provoquait un ENOENT : react-pdf résout la chaîne brute
 *   comme un chemin).
 */
export async function prepareTemplateConfigForPdf(config: TemplateConfig): Promise<TemplateConfig> {
  const inline = config.logo.svgInline?.trim();
  const hasInlineSvg = Boolean(inline && SVG_TAG.test(inline));
  const hasUrl = Boolean(config.logo.url?.trim());

  if (!hasInlineSvg && hasUrl) {
    return config;
  }

  const usesDefaultLogo = !hasInlineSvg;
  const svg = hasInlineSvg && inline ? inline : buildEsneoWordmarkSvg(PDF_HEADER_LOGO_FILL);

  try {
    const dataUrl = await rasterizeSvgToPngDataUrl(svg, config.logo.width, config.logo.height);
    return {
      ...config,
      logo: {
        ...config.logo,
        url: dataUrl,
        svgInline: undefined,
      },
    };
  } catch (e) {
    if (usesDefaultLogo) {
      // Pas de logo plutôt qu'une erreur de rendu.
      console.warn('Logo PDF par défaut : rastérisation impossible', e);
      return {
        ...config,
        logo: {
          ...config.logo,
          url: '',
          svgInline: undefined,
        },
      };
    }
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
