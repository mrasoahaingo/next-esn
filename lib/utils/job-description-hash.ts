import { createHash } from 'crypto';

/** Hash stable du texte de fiche pour détecter une analyse obsolète. */
export function hashJobDescription(text: string): string {
  return createHash('sha256').update(text.trim(), 'utf8').digest('hex');
}
