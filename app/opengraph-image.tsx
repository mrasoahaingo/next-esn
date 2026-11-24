import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { PATH_D } from '@/components/esneo-full-logo';

export const alt = 'Esneo — Vous choisissez le profil. Esneo fait le dossier. L’IA propose, vous validez.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Carte de partage (« Verre de nuit ») : papier de nuit à gauche (promesse), photo du héros à droite. */
export default async function OpengraphImage() {
  const photo = await readFile(join(process.cwd(), 'public/media/esneo/og-vide.jpg'));
  const src = `data:image/jpeg;base64,${photo.toString('base64')}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#07090e', color: '#edf0f6' }}>
        <div
          style={{
            width: 700,
            padding: '56px 56px 52px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo script d'origine, rogné sur ses lettres (x 199,5 → 2606,7 dans la viewBox 2816 × 510). */}
          <svg width={170} height={36} viewBox="199.5 0 2407.2 510">
            <g fill="#edf0f6" transform="translate(0 -535)">
              <path d={PATH_D} />
            </g>
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 46, lineHeight: 1.08, letterSpacing: -1.6, fontWeight: 500 }}>
              <div>Vous choisissez le profil.</div>
              <div>Esneo fait le dossier.</div>
            </div>
            <div style={{ marginTop: 24, fontSize: 26, color: '#c3c7d1' }}>L’IA propose, vous validez.</div>
          </div>
          <div style={{ display: 'flex', fontSize: 18, color: '#a0a5af' }}>ESN et cabinets · Photo générée par IA</div>
        </div>
        {/* Satori ignore object-position : l'image (1200 × 630) est décalée pour garder la personne. */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: '#3466e6' }}>
          <img src={src} alt="" width={1200} height={630} style={{ width: 1200, height: 630, marginLeft: -560 }} />
        </div>
      </div>
    ),
    size,
  );
}
