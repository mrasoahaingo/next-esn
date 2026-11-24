import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  sm: 'size-6 text-[0.6875rem]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
} as const;

/** Initiales d'un nom (« Camille Durand » → « CD », « F. V. » → « FV »), deux lettres au plus. */
export function initialsOf(name: string | null | undefined): string {
  const parts = (name ?? '')
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Avatar à initiales de l'UI produit (candidats, membres) : un disque teinté
 * `primary/10`, les initiales en `primary`. Pas de photo, pas de couleur par
 * personne : la couleur est réservée aux statuts et à l'action.
 */
export function InitialsAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string | null | undefined;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}
