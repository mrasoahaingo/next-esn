/**
 * Formatage des chiffres du tableau de bord (durées, dates, libellés).
 * Fonctions pures, sans React, testées dans `dashboard-format.test.ts`.
 */

/** Minutes estimées → « 40 min », « 2 h », « 1,5 j », « 2 sem ». */
export function formatTimeSaved(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 8) return `${formatDecimal(hours)} h`;
  const days = hours / 8;
  if (days < 5) return `${formatDecimal(days)} j`;
  const weeks = days / 5;
  return `${formatDecimal(weeks)} sem`;
}

function formatDecimal(value: number): string {
  if (value % 1 === 0) return String(value);
  return value.toFixed(1).replace('.', ',');
}

/** Millisecondes → « 42 s », « 3 min 05 s », « 1 h 12 min ». */
export function formatDurationMs(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes} min ${String(remainingSeconds).padStart(2, '0')} s`
      : `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} h ${String(remainingMinutes).padStart(2, '0')} min` : `${hours} h`;
}

export function formatDurationSeconds(seconds: number): string {
  return formatDurationMs(seconds * 1000);
}

/** Date ISO → « 24 nov. » (fr-FR, jour et mois court). */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export type PersonalInfoLike = {
  personalInfo?: { firstName?: string; lastName?: string; title?: string };
} | null;

/** Nom affiché d'un candidat à partir de ses données extraites, ou « Sans nom ». */
export function candidateDisplayName(extracted: PersonalInfoLike): string {
  const pi = extracted?.personalInfo;
  if (pi?.firstName || pi?.lastName) {
    return `${pi.firstName ?? ''} ${pi.lastName ?? ''}`.trim();
  }
  return 'Sans nom';
}

/** Première ligne d'une description de poste, tronquée à 50 caractères. */
export function jobTitleFromDescription(description: string, max = 50): string {
  const line = description.trim().split('\n')[0] ?? '';
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}

/** Pluriel français simple : « 1 CV extrait », « 3 CV extraits ». */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return count > 1 ? pluralForm : singular;
}
