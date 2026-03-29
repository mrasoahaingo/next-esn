import Link from 'next/link';
import { cn } from '@/lib/utils';

type RadarPageLinksProps = {
  current: 'dashboard' | 'settings' | 'detail';
  companyId?: string;
  companyName?: string;
};

function LinkChip({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-neon/40 bg-neon/10 text-neon'
          : 'border-border/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground',
      )}
    >
      {label}
    </Link>
  );
}

export function RadarPageLinks({ current, companyId, companyName }: RadarPageLinksProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <LinkChip href="/radar" label="Dashboard Radar" active={current === 'dashboard'} />
      <LinkChip href="/radar/settings" label="Parametres Radar" active={current === 'settings'} />
      {companyId ? (
        <LinkChip
          href={`/radar/${companyId}`}
          label={companyName ? `Fiche: ${companyName}` : 'Fiche prospect'}
          active={current === 'detail'}
        />
      ) : null}
    </div>
  );
}
