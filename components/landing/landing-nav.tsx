'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AuthSwitch } from '@/components/landing/auth-switch';
import { ArrowRight, Menu, X } from 'lucide-react';
import { EsneoWordmark } from '@/components/landing/esneo-wordmark';

const LINKS = [
  { href: '#fonctionnement', label: 'Fonctionnement' },
  { href: '#fiabilite', label: 'Fiabilité' },
  { href: '#donnees', label: 'Vos données' },
  { href: '#questions', label: 'Questions' },
] as const;

/** Seuil de défilement (px) au-delà duquel la barre devient une pilule de verre. */
const FLOAT_THRESHOLD = 72;

/**
 * N10 · barre transparente pleine largeur qui devient une pilule de verre au
 * défilement. Un seul DOM : seule la classe `is-floating` change ; le verre
 * apparaît en fondu (opacité) et les groupes glissent vers l'intérieur
 * (transform). Le rayon de flou ne s'anime jamais. Sous 64rem, un vrai menu.
 */
export function LandingNav(): React.JSX.Element {
  const navRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    let floating = false;
    let ticking = false;
    const update = () => {
      ticking = false;
      const next = window.scrollY > FLOAT_THRESHOLD;
      if (next !== floating) {
        floating = next;
        nav.classList.toggle('is-floating', floating);
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Menu ouvert : le reste de la page devient inerte, Échap ferme et rend le focus.
  useEffect(() => {
    if (!open) return;
    const main = document.getElementById('contenu');
    const foot = document.querySelector<HTMLElement>('.eg-foot');
    main?.setAttribute('inert', '');
    foot?.setAttribute('inert', '');
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btnRef.current?.focus();
    };
    const wide = window.matchMedia('(min-width: 64rem)');
    const onWide = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    wide.addEventListener('change', onWide);
    panelRef.current?.querySelector<HTMLElement>('a')?.focus();
    return () => {
      main?.removeAttribute('inert');
      foot?.removeAttribute('inert');
      root.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      wide.removeEventListener('change', onWide);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header ref={navRef} className="eg-nav" data-open={open}>
      <div className="eg-nav__inner">
        <span className="eg-nav__glass" aria-hidden />
        <Link href="/" className="eg-nav__brand" aria-label="Esneo, accueil">
          <EsneoWordmark className="eg-nav__logo" />
        </Link>

        <nav className="eg-nav__links" aria-label="Principale">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="eg-nav__link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="eg-nav__end">
          <AuthSwitch
            signedOut={
              <>
                <Link href="/sign-in" className="eg-nav__link eg-nav__signin">
                  Se connecter
                </Link>
                <Link href="/sign-up" className="eg-btn eg-btn--primary eg-btn--sm eg-nav__cta">
                  Créer un compte
                </Link>
              </>
            }
            signedIn={
              <Link href="/dashboard" className="eg-btn eg-btn--primary eg-btn--sm eg-nav__cta">
                Ouvrir l’app
              </Link>
            }
          />
          <button
            ref={btnRef}
            type="button"
            className="eg-menu-btn"
            aria-expanded={open}
            aria-controls="eg-menu"
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X aria-hidden /> : <Menu aria-hidden />}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button type="button" className="eg-menu-scrim" aria-hidden tabIndex={-1} onClick={close} />
          <div id="eg-menu" ref={panelRef} className="eg-menu">
            <nav aria-label="Menu" className="eg-menu__nav">
              {LINKS.map((l) => (
                <a key={l.href} href={l.href} className="eg-menu__link" onClick={close}>
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="eg-menu__actions">
              <AuthSwitch
                signedOut={
                  <>
                    <Link href="/sign-in" className="eg-btn eg-btn--quiet" onClick={close}>
                      Se connecter
                    </Link>
                    <Link href="/sign-up" className="eg-btn eg-btn--primary" onClick={close}>
                      Créer un compte
                      <ArrowRight aria-hidden />
                    </Link>
                  </>
                }
                signedIn={
                  <Link href="/dashboard" className="eg-btn eg-btn--primary" onClick={close}>
                    Ouvrir l’app
                    <ArrowRight aria-hidden />
                  </Link>
                }
              />
            </div>
          </div>
        </>
      ) : null}
    </header>
  );
}
