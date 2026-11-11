import '@/app/esneo-site.css';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PHOTOS } from '@/components/site/images';

export default function NotFound() {
  return (
    <div className="es es-404">
      <div className="es-404__copy">
        <h1 className="es-head">Cette page n’existe pas.</h1>
        <p>
          Le lien est peut-être ancien, ou la page a été déplacée. Vos CV, missions et positionnements sont
          toujours là.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px', alignItems: 'center' }}>
          <Link href="/dashboard" className="es-btn">
            Aller au dashboard
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link href="/" className="es-link">
            Retour à l’accueil
          </Link>
        </div>
      </div>
      <div className="es-404__photo">
        <Image src={PHOTOS.couloir.src} alt={PHOTOS.couloir.alt} fill sizes="(max-width: 860px) 100vw, 58vw" />
      </div>
    </div>
  );
}
