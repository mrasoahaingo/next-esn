import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EsneoFullLogo } from '@/components/esneo-full-logo';

/**
 * Panneau de marque gauche des pages auth — statique (pas de motion), aux
 * jetons Esneo (encre primaire). Reprend la voix de la landing pour que la
 * connexion ne ressemble pas à une page orpheline.
 */
export function AuthBrandPanel({
  kicker,
  title,
  accent,
  lede,
}: {
  kicker: string;
  title: string;
  accent: string;
  lede: string;
}) {
  return (
    <aside className="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-10 md:flex lg:p-14">
      <Link
        href="/"
        className="group text-primary-foreground/70 hover:text-primary-foreground inline-flex w-fit items-center gap-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        <EsneoFullLogo className="h-5 w-auto text-primary-foreground" title="Esneo" />
      </Link>

      <div className="max-w-md">
        <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-primary-foreground/60">
          {kicker}
        </p>
        <h1 className="hl-serif text-[clamp(2rem,3.5vw,2.75rem)] leading-[1.06] font-semibold tracking-tight text-balance">
          {title} <span className="text-primary-foreground/60">{accent}</span>
        </h1>
        <p className="mt-5 text-base leading-relaxed text-pretty text-primary-foreground/75">
          {lede}
        </p>
      </div>

      <p className="text-primary-foreground/55 max-w-md text-xs leading-relaxed text-pretty">
        Chaque ESN dispose d’un espace isolé, avec une relecture humaine par
        défaut. Vos données restent privées.
      </p>
    </aside>
  );
}
