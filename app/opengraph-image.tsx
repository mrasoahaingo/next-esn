import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Esneo — Du CV au positionnement, piloté par l’IA. L’IA propose, vous validez.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Carte de partage : graphite à gauche (promesse), photo du héros à droite. */
export default async function OpengraphImage() {
  const photo = await readFile(join(process.cwd(), 'public/media/esneo/og-hero.jpg'));
  const src = `data:image/jpeg;base64,${photo.toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0d0e11', color: '#fff' }}>
        <div
          style={{
            width: 560,
            padding: '56px 56px 52px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>esneo</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 58, lineHeight: 1.02, letterSpacing: -2.4, fontWeight: 500 }}>
              Du CV au positionnement, piloté par l’IA.
            </div>
            <div style={{ marginTop: 24, fontSize: 26, color: '#c9ceD6' }}>L’IA propose, vous validez.</div>
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: '#a6abb4' }}>Pour les ESN · Photo générée par IA</div>
        </div>
        <div style={{ flex: 1, display: 'flex', background: '#3466e6' }}>
          <img src={src} alt="" width={640} height={630} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
        </div>
      </div>
    ),
    size,
  );
}
