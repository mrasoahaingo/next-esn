import '@/app/landing.css';

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PHOTOS } from '@/components/site/images';
import { EsneoFullLogo } from '@/components/esneo-full-logo';
import { fr } from '@/components/site/fr';
import { AuthSwitch } from '@/components/landing/auth-switch';

export const metadata: Metadata = {
  title: 'Page introuvable · Esneo',
  description: 'Cette page n’existe pas ou a été déplacée. Retournez à l’accueil d’Esneo ou connectez-vous.',
};

/* 404 dans la direction de la landing (« Verre de nuit », DESIGN.md). Un chemin
 * inconnu la reçoit en page entière, sans attendre Clerk (middleware et coque ne
 * protègent que les routes de l'app) ; un notFound() d'une page de l'app la rend
 * dans la coque. */
export default function NotFound() {
  return (
    <main className="eg eg-404">
      <div className="eg-404__copy">
        <Link href="/" className="eg-404__brand" aria-label="Esneo, accueil">
          <EsneoFullLogo className="eg-logo eg-404__logo" title="Esneo" aria-hidden />
        </Link>
        <h1 className="eg-h2 eg-404__title">Cette page n’existe pas.</h1>
        <p className="eg-404__text">
          {fr('Le lien est peut-être ancien, ou la page a été déplacée. Si vous avez un compte, vos CV, missions et positionnements sont toujours là.')}
        </p>
        <div className="eg-404__actions">
          <Link href="/" className="eg-btn eg-btn--primary eg-btn--lg">
            Retour à l’accueil
            <ArrowRight aria-hidden />
          </Link>
          {/* Déconnecté (rendu serveur, sans JavaScript) : « Se connecter » ; connecté : « Ouvrir l’app ». */}
          <AuthSwitch
            signedOut={
              <Link href="/sign-in" className="eg-btn eg-btn--quiet eg-btn--lg">
                Se connecter
              </Link>
            }
            signedIn={
              <Link href="/dashboard" className="eg-btn eg-btn--quiet eg-btn--lg">
                Ouvrir l’app
              </Link>
            }
          />
        </div>
      </div>
      <figure className="eg-404__photo">
        <Image src={PHOTOS.couloir.src} alt={PHOTOS.couloir.alt} fill preload sizes="(min-width: 60rem) 58vw, 100vw" />
        <figcaption className="eg-credit">Photographie générée par IA, personnes fictives</figcaption>
      </figure>
    </main>
  );
}
