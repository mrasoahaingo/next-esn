import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import type { SitePhoto } from '@/components/site/images';
import { fr } from '@/components/site/fr';

/**
 * Panneau des pages d'authentification : une photo du métier (générée par IA),
 * le logo, puis la promesse sur une vitre posée sur la photo. Bureau :
 * photo pleine hauteur, vitre de 30rem en bas, légende en pastille sur la
 * photo. Téléphone : bande de 9rem, la promesse réduite à son titre ; légende
 * et note sur les données passent sous le formulaire (AuthScreen). Statique.
 */
export function AuthBrandPanel({
  title,
  lede,
  photo,
  credit,
}: {
  title: string;
  lede: string;
  photo: SitePhoto;
  credit: string;
}): React.JSX.Element {
  return (
    <aside className="eg-auth__panel" aria-label="Présentation d’Esneo">
      <div className="eg-auth__photo">
        <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} priority sizes="(min-width: 60rem) 50vw, 100vw" />
      </div>

      <Link href="/" className="eg-auth__brand" aria-label="Retour à l’accueil Esneo">
        <ArrowLeft aria-hidden />
        <EsneoFullLogo className="eg-logo eg-auth__logo" title="Esneo" aria-hidden />
      </Link>

      <p className="eg-credit eg-auth__chip">{credit}</p>

      <div className="eg-glass eg-glass--photo eg-auth__card">
        <p className="eg-auth__title">{fr(title)}</p>
        <p className="eg-auth__lede">{fr(lede)}</p>
      </div>
    </aside>
  );
}
