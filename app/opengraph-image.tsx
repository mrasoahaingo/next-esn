import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import {
  BRAND_AZUR,
  ESNEO_WORDMARK_DOT,
  ESNEO_WORDMARK_PATH,
  ESNEO_WORDMARK_VIEWBOX,
} from '@/components/esneo-full-logo';

export const alt = 'Esneo — Moins de paperasse. Plus de face-à-face. L’IA propose, vous validez.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Carte de partage (« Verre de nuit ») : papier de nuit à gauche (promesse), photo du héros à droite. */
export default async function OpengraphImage() {
  const photo = await readFile(join(process.cwd(), 'public/media/esneo/og-hero.jpg'));
  const src = `data:image/jpeg;base64,${photo.toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#07090e', color: '#edf0f6' }}>
        <div
          style={{
            width: 560,
            padding: '56px 56px 52px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <svg width={168} height={32} viewBox={ESNEO_WORDMARK_VIEWBOX}>
            <path d={ESNEO_WORDMARK_PATH} fill="#edf0f6" />
            <circle cx={ESNEO_WORDMARK_DOT.cx} cy={ESNEO_WORDMARK_DOT.cy} r={ESNEO_WORDMARK_DOT.r} fill={BRAND_AZUR} />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 58, lineHeight: 1.02, letterSpacing: -2.4, fontWeight: 500 }}>
              Moins de paperasse. Plus de face-à-face.
            </div>
            <div style={{ marginTop: 24, fontSize: 26, color: '#c3c7d1' }}>L’IA propose, vous validez.</div>
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: '#a0a5af' }}>ESN et cabinets · Photo générée par IA</div>
        </div>
        <div style={{ flex: 1, display: 'flex', background: '#3466e6' }}>
          <img src={src} alt="" width={640} height={630} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        </div>
      </div>
    ),
    size,
  );
}
