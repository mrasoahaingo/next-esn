/**
 * Ligne mono de la zone d'état une fois l'extraction terminée :
 * « Extraction terminée en 42 s · 5 étapes ».
 *
 * Sans durée connue (ancienne donnée), la durée est omise ; sans étapes, le
 * nombre est omis. Espaces insécables avant les unités.
 */
export function formatExtractionSummary({
  durationMs,
  stepCount,
}: {
  durationMs: number | null | undefined;
  stepCount: number;
}): string {
  const parts: string[] = ['Extraction terminée'];
  if (durationMs != null && durationMs > 0) {
    parts[0] += ` en ${formatDurationFr(durationMs)}`;
  }
  if (stepCount > 0) {
    parts.push(`${stepCount} étape${stepCount > 1 ? 's' : ''}`);
  }
  return parts.join(' · ');
}

/** « 42 s », « 2 min 14 s », « 3 min ». */
export function formatDurationFr(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds} s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`;
}
