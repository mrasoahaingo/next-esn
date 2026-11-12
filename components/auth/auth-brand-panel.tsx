import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import { PHOTO_CREDIT, type SitePhoto } from '@/components/site/images';

/**
 * Panneau gauche des pages auth : une photo du métier (générée par IA, légendée),
 * un voile neutre sous le texte, la promesse de la landing. Statique.
 */
export function AuthBrandPanel({ title, lede, photo }: { title: string; lede: string; photo: SitePhoto }) {
  return (
    <aside className="es-auth__panel">
      <Image src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} priority sizes="50vw" />
      <div className="es-auth__scrim" aria-hidden />

      <Link href="/" className="es-auth__brand es-link" aria-label="Retour à l’accueil Esneo">
        <ArrowLeft className="size-4" aria-hidden />
        <EsneoFullLogo className="text-white" title="Esneo" />
      </Link>

      <div>
        <h1 className="es-auth__title">{title}</h1>
        <p className="es-auth__lede">{lede}</p>
        <p className="es-auth__note">
          Vos CV ne sont confiés à des modèles d’IA tiers que pour l’extraction, l’analyse et la rédaction. {PHOTO_CREDIT}
        </p>
      </div>
    </aside>
  );
}
