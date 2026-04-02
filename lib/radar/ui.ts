import type { ProspectListItem, ProspectSignal } from '@/lib/radar/schemas';

export const VELOCITY_WINDOW_DAYS = 7;

/**
 * Détecte si un prospect a plusieurs signaux récents de sources distinctes (vélocité).
 * Permet d'afficher un indicateur "en accélération" dans la carte prospect.
 */
export function detectVelocity(
  breakdown: Record<string, number>,
  latestSignalAt: string | null | undefined,
): boolean {
  if (!latestSignalAt) return false;
  const daysOld = (Date.now() - new Date(latestSignalAt).getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld > VELOCITY_WINDOW_DAYS) return false;
  // Vélocité si au moins 3 sources distinctes (hors vivier_match)
  const realSources = Object.keys(breakdown).filter((k) => k !== 'vivier_match');
  return realSources.length >= 3;
}


export const HEAT_LABELS: Record<ProspectListItem['heat'], string> = {
  burning: 'Brulant',
  hot: 'Chaud',
  warm: 'Tiede',
  cold: 'Froid',
};

export const HEAT_STYLES: Record<ProspectListItem['heat'], string> = {
  burning: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
  hot: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  warm: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  cold: 'bg-muted text-muted-foreground',
};

export const SOURCE_LABELS: Record<string, string> = {
  job_offer: "Offres d'emploi",
  linkedin: 'LinkedIn',
  vivier_match: 'Vivier',
  convergence: 'Convergence',
};

export const SOURCE_SHORT_LABELS: Record<string, string> = {
  job_offer: 'OE',
  linkedin: 'LI',
  vivier_match: 'VI',
};

export const SOURCE_STYLES: Record<string, string> = {
  job_offer: 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  linkedin: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  vivier_match: 'bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  convergence: 'bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
};

export function getCompanyInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatRelativeTime(input: string) {
  const date = new Date(input);
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'a l’instant';
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR');
}

export function getSignalSummary(signal: ProspectSignal) {
  const metadata = signal.metadata ?? {};

  if (signal.source === 'job_offer') {
    const offerCount = metadata.offerCount;
    const technologies = Array.isArray(metadata.technologies)
      ? metadata.technologies.slice(0, 3).join(', ')
      : null;
    return [offerCount ? `${offerCount} offres` : null, technologies].filter(Boolean).join(' · ');
  }

  if (signal.source === 'linkedin') {
    const externalCount = metadata.externalCount;
    const sources =
      metadata.esnSources && typeof metadata.esnSources === 'object'
        ? Object.entries(metadata.esnSources as Record<string, unknown>)
            .slice(0, 3)
            .map(([name, count]) => `${name} (${String(count)})`)
            .join(', ')
        : null;
    return [externalCount ? `${externalCount} externes` : null, sources].filter(Boolean).join(' · ');
  }

  return '';
}
