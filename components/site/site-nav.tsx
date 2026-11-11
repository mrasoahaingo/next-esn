'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { ArrowRight, Menu, X } from 'lucide-react';
import { EsneoFullLogo } from '@/components/esneo-full-logo';

const LINKS = [
  { href: '#fonctionnement', label: 'Fonctionnement' },
  { href: '#fiabilite', label: 'Fiabilité' },
  { href: '#questions', label: 'Questions' },
] as const;

/** Barre simple : marque, trois ancres, connexion, une action. Sous 860 px, un vrai menu. */
export function SiteNav() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const main = document.getElementById('contenu');
    const foot = document.querySelector<HTMLElement>('.es-foot');
    main?.setAttribute('inert', '');
    foot?.setAttribute('inert', '');
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btnRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector('a')?.focus();
    return () => {
      main?.removeAttribute('inert');
      foot?.removeAttribute('inert');
      document.documentElement.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="es-nav">
      <Link href="/" className="es-nav__brand" aria-label="Esneo, accueil">
        <EsneoFullLogo className="text-white" title="Esneo" />
      </Link>

      <nav className="es-nav__links" aria-label="Principale">
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} className="es-link">
            {l.label}
          </a>
        ))}
        <Show when="signed-out">
          <Link href="/sign-in" className="es-link">
            Se connecter
          </Link>
          <Link href="/sign-up" className="es-btn es-btn--sm">
            Créer un compte
          </Link>
        </Show>
        <Show when="signed-in">
          <Link href="/dashboard" className="es-btn es-btn--sm">
            Mon dashboard
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Show>
      </nav>

      <div className="es-nav__menu">
        <button
          ref={btnRef}
          type="button"
          className="es-menu-btn"
          aria-expanded={open}
          aria-controls="es-menu-panel"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          <span>{open ? 'Fermer' : 'Menu'}</span>
        </button>
        {open ? (
          <div id="es-menu-panel" ref={panelRef} className="es-menu-panel">
            <nav aria-label="Menu mobile" onClick={() => setOpen(false)}>
              {LINKS.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
              <Show when="signed-out">
                <Link href="/sign-in">Se connecter</Link>
                <Link href="/sign-up" className="es-btn">
                  Créer un compte
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard" className="es-btn">
                  Mon dashboard
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Show>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
