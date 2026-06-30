import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';

/**
 * Apparence Clerk « sans contour » : on retire la carte (bordure + ombre + fond)
 * pour que le formulaire se fonde dans la colonne de droite. Les jetons du thème
 * restent appliqués pour le reste.
 */
export const borderlessAppearance = {
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full border-none shadow-none',
    card: 'bg-transparent shadow-none border-none px-0',
    footer: 'bg-transparent',
  },
};

/**
 * Coquille d’authentification — split éditorial : panneau de marque Esneo
 * (encre primaire) à gauche, formulaire Clerk borderless à droite.
 * `min-h-dvh` pour éviter le saut de viewport iOS.
 */
export function AuthScreen({
  kicker,
  title,
  accent,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  accent: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 md:grid-cols-2">
      <AuthBrandPanel kicker={kicker} title={title} accent={accent} lede={lede} />

      <main className="bg-background flex flex-col px-6 py-8 md:px-10 md:py-12">
        <Link
          href="/"
          className="group text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <EsneoFullLogo className="h-5 w-auto" title="Esneo" />
        </Link>

        <div className="flex flex-1 items-center justify-center">{children}</div>
      </main>
    </div>
  );
}
