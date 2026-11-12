import '@/app/esneo-site.css';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { PHOTO_CREDIT, type SitePhoto } from '@/components/site/images';

/**
 * Apparence Clerk « sans contour » : on retire la carte (bordure + ombre + fond)
 * pour que le formulaire se fonde dans la colonne graphite. Les jetons du thème
 * restent appliqués pour le reste.
 */
const field = {
  border: 'none !important',
  borderRadius: 0,
  boxShadow: '0 0 0 1px #5b616c !important',
  backgroundColor: '#16181c',
  color: '#ffffff',
  height: 44,
  '&:focus, &:focus-visible': { outline: '2px solid #3466e6', outlineOffset: 2, boxShadow: '0 0 0 1px #8fa3c8 !important' },
};

export const borderlessAppearance = {
  elements: {
    rootBox: { width: '100%', maxWidth: 400 },
    cardBox: { width: '100%', border: 'none', boxShadow: 'none', background: 'transparent', borderRadius: 0, overflow: 'visible' },
    card: { background: 'transparent', boxShadow: 'none', border: 'none', paddingInline: 4, paddingBlock: 8, overflow: 'visible' },
    logoBox: { display: 'none' },
    header: { display: 'none' },
    footer: { background: 'transparent', backgroundImage: 'none', borderTop: 'none', boxShadow: 'none', '& > *': { borderTop: 'none' } },
    footerItem: { borderTop: 'none !important' },
    formButtonPrimary: {
      backgroundColor: '#3466e6',
      backgroundImage: 'none',
      color: '#ffffff',
      border: 'none',
      boxShadow: 'none !important',
      '&:focus': { boxShadow: 'none !important' },
      borderRadius: 0,
      height: 44,
      '&::after, &::before': { display: 'none' },
      '&:hover': { backgroundColor: '#2853c9' },
      '&:focus-visible': { outline: '2px solid #ffffff', outlineOffset: 2 },
    },
    socialButtonsBlockButton: {
      ...field,
      border: 'none !important',
      boxShadow: 'none !important',
      backgroundColor: '#22262e',
      justifyContent: 'flex-start',
      paddingInline: 14,
      '&:hover': { backgroundColor: '#2b3039' },
    },
    dividerLine: { display: 'none' },
    dividerRow: { justifyContent: 'flex-start' },
    footerAction: { justifyContent: 'flex-start' },
    formFieldInput: field,
    formFieldLabel: { color: '#ffffff' },
    formFieldErrorText: { color: '#ff9b8c' },
    footerActionLink: { color: '#8fb0ff', '&:hover': { color: '#ffffff' } },
  },
};

/**
 * Coquille d’authentification — même voix que la landing (`.es`) : à gauche une
 * photo du métier avec la promesse, à droite le formulaire Clerk sur le graphite
 * de l’app (les jetons sombres de l’appearance Clerk racine s’y appliquent tels quels).
 * `min-h-dvh` pour éviter le saut de viewport iOS.
 */
export function AuthScreen({
  title,
  lede,
  photo,
  children,
}: {
  title: string;
  lede: string;
  photo: SitePhoto;
  children: ReactNode;
}) {
  return (
    <div className="es">
      <div className="es-auth">
        <AuthBrandPanel title={title} lede={lede} photo={photo} />

        <section className="es-auth__main" aria-label="Formulaire">
          <div className="es-auth__mobile">
            <Image src={photo.src} alt="" width={photo.width} height={photo.height} sizes="100vw" priority />
            <div className="es-auth__scrim" aria-hidden />
            <Link href="/" className="es-auth__back es-link" aria-label="Retour à l’accueil Esneo">
              <ArrowLeft className="size-4" aria-hidden />
              <EsneoFullLogo className="text-white" title="Esneo" />
            </Link>
            <div className="es-auth__mobile-copy">
              <h1 className="es-auth__title">{title}</h1>
              <p className="es-auth__lede">{lede}</p>
            </div>
          </div>
          <div className="es-auth__form">{children}</div>
          <p className="es-auth__note es-auth__note--mobile">
            {'Vos CV ne sont confiés à des modèles d’IA tiers que pour l’extraction, l’analyse et la rédaction. '}
            {PHOTO_CREDIT}
          </p>
        </section>
      </div>
    </div>
  );
}
