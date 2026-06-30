import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import {
  ArrowRight,
  Check,
  Minus,
  UploadCloud,
  Sparkles,
  Target,
  GitCompareArrows,
  Eye,
  Lock,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PositioningArt,
  ExtractionArt,
  MissionArt,
  GaugeArt,
} from '@/components/marketing/illustrations';
import { ThemeToggle } from '@/components/marketing/theme-toggle';

/* Editorial landing — calm, illustration-led, serif display over Geist body.
 * Built on theme tokens (renders dark graphite by default, light if flipped).
 * Motion is CSS only: hl-reveal on load, hl-inview on scroll. */

const CAPABILITIES = [
  {
    step: '01',
    caption: 'Extraction',
    Art: ExtractionArt,
    body: 'Un CV déposé devient une fiche structurée : expériences, compétences, langues et durées.',
  },
  {
    step: '02',
    caption: 'Mission',
    Art: MissionArt,
    body: 'Une fiche de mission collée révèle ses points clés, la séniorité visée et les expertises.',
  },
  {
    step: '03',
    caption: 'Positionnement',
    Art: GaugeArt,
    body: 'Un score pondéré confronte le consultant à la mission, avec points forts et écarts.',
  },
];

const STEPS = [
  { icon: UploadCloud, title: 'Importez', body: 'Déposez les CVs de vos consultants en PDF ou Word. Aucun gabarit imposé.' },
  { icon: Sparkles, title: 'L’IA extrait', body: 'Données structurées, langue d’origine conservée, prêtes à valider en un coup d’œil.' },
  { icon: Target, title: 'Analysez la mission', body: 'Points clés, séniorité et expertises prioritaires, dégagés du texte de l’offre.' },
  { icon: GitCompareArrows, title: 'Positionnez', body: 'Matching CV ↔ mission en un clic, avec un score pondéré et expliqué.' },
] as const;

const SECURITY = [
  { icon: Eye, title: 'Validation humaine', body: 'L’IA propose, vous validez. Rien n’est publié sans votre relecture, et les erreurs s’affichent.' },
  { icon: Lock, title: 'Isolation par organisation', body: 'Chaque ESN dispose de son propre espace. Vos données ne croisent jamais celles d’une autre agence.' },
  { icon: Users, title: 'Accès par rôle', body: 'Les droits sont gérés par rôle au sein de l’équipe : chacun voit ce qui le concerne.' },
];

const AI_DOES = [
  'Extraire et structurer un CV',
  'Dégager les points clés d’une mission',
  'Proposer un score de correspondance expliqué',
  'Générer des documents prêts à valider',
];

const AI_NEVER = [
  'Publier sans votre relecture',
  'Lancer un doublon en silence',
  'Masquer comment le score est calculé',
  'Décider à votre place',
];

const STOP = [
  'Ressaisir les CVs à la main',
  'Refaire une fiche consultant à chaque mission',
  'Relancer un traitement « au cas où »',
];

const GAIN = [
  'Un positionnement prêt à envoyer, score à l’appui',
  'Un vivier toujours à jour et structuré',
  'La certitude de savoir ce que fait l’IA, en temps réel',
];

/* ─── Page ──────────────────────────────────────────────────────────── */

export function Landing() {
  return (
    <div className="lp-root min-h-svh bg-background text-foreground">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:not-sr-only focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:ring-2 focus-visible:ring-ring"
      >
        Passer au contenu
      </a>

      <SiteNav />

      <main id="contenu">
        <Hero />
        <Capabilities />
        <Process />
        <Value />
        <Security />
        <Manifesto />
        <Statement />
        <FinalCta />
      </main>

      <SiteFooter />
    </div>
  );
}

/* ─── Nav · centered pill ───────────────────────────────────────────── */

function SiteNav() {
  const links = [
    { href: '#capacites', label: 'Capacités' },
    { href: '#fonctionnement', label: 'Fonctionnement' },
    { href: '#securite', label: 'Sécurité' },
  ];
  return (
    <div className="mx-auto w-full max-w-6xl px-6 pt-6 md:px-10">
      <header className="flex items-center gap-4 rounded-full border border-border bg-card/80 px-6 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div className="flex flex-1 items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">e</span>
            <span className="text-base">Esneo</span>
          </Link>
        </div>

        <nav className="hidden items-center gap-0.5 text-sm lg:flex" aria-label="Principale">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          <ThemeToggle />
          <Show when="signed-out">
            <Button
              variant="ghost"
              className="hidden h-9 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
              nativeButton={false}
              render={<Link href="/sign-in" />}
            >
              Se connecter
            </Button>
            <Button
              className="h-9 rounded-full px-4 text-sm font-semibold"
              nativeButton={false}
              render={<Link href="/sign-up" />}
            >
              Démo
              <ArrowRight className="size-4" />
            </Button>
          </Show>
          <Show when="signed-in">
            <Button
              className="h-9 rounded-full px-4 text-sm font-semibold"
              nativeButton={false}
              render={<Link href="/dashboard" />}
            >
              Mon dashboard
              <ArrowRight className="size-4" />
            </Button>
          </Show>
        </div>
      </header>
    </div>
  );
}

/* ─── Hero · Workbench split ────────────────────────────────────────── */

function Hero() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-14 pb-16 md:px-10 md:pt-20 md:pb-24">
      <p className="hl-reveal mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Plateforme IA pour les ESN
      </p>

      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:gap-14">
        <div>
          <h1 className="hl-h1 hl-reveal text-balance">
            Du CV au positionnement, piloté par <span className="text-primary">l’IA</span>.
          </h1>
          <p className="hl-reveal mt-7 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground" style={{ animationDelay: '80ms' }}>
            Esneo extrait les CVs de vos consultants, analyse les missions et les
            positionne automatiquement, avec un feedback clair à chaque étape.{' '}
            <span className="font-medium text-foreground">Pas de doublon lancé en silence, pas d’angle mort.</span>
          </p>

          <div className="hl-reveal mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '140ms' }}>
            <Show when="signed-out">
              <Button
                className="h-12 rounded-full px-7 text-[0.95rem] font-semibold"
                nativeButton={false}
                render={<Link href="/sign-up" />}
              >
                Réserver une démo
                <ArrowRight className="size-4" />
              </Button>
            </Show>
            <Show when="signed-in">
              <Button
                className="h-12 rounded-full px-7 text-[0.95rem] font-semibold"
                nativeButton={false}
                render={<Link href="/dashboard" />}
              >
                Accéder au dashboard
                <ArrowRight className="size-4" />
              </Button>
            </Show>
            <a
              href="#capacites"
              className="text-base text-foreground underline decoration-border decoration-1 underline-offset-4 transition-colors hover:decoration-primary hover:decoration-2"
            >
              Voir comment ça marche
            </a>
          </div>

          <p className="hl-reveal mt-6 text-sm text-muted-foreground" style={{ animationDelay: '180ms' }}>
            Démo gratuite · sur vos propres CVs
          </p>
        </div>

        <div className="hl-reveal relative w-full" style={{ animationDelay: '200ms' }}>
          <PositioningArt className="h-auto w-full drop-shadow-sm" />
        </div>
      </div>
    </section>
  );
}

/* ─── Capabilities · three illustration tiles ───────────────────────── */

function Capabilities() {
  return (
    <section id="capacites" className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 pt-14 pb-6 md:px-10 md:pt-20">
        <div className="max-w-2xl">
          <h2 className="hl-h2 hl-inview text-balance">Trois métiers, un seul fil.</h2>
          <p className="hl-inview mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Vous déposez, Esneo structure, puis confronte chaque consultant à la
            mission. Le tout assisté par l’IA, sous votre contrôle.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-10 md:pb-20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CAPABILITIES.map(({ step, caption, Art, body }) => (
            <figure key={caption} className="hl-inview group flex flex-col overflow-hidden rounded-2xl border border-border bg-secondary/40">
              <div className="flex h-56 items-center justify-center p-6 transition-transform duration-700 ease-out group-hover:scale-[1.03] md:h-64">
                <Art className="h-full w-auto max-w-full" />
              </div>
              <figcaption className="border-t border-border px-5 py-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] tracking-wide text-primary">{step}</span>
                  <span className="text-sm font-medium text-foreground">{caption}</span>
                </div>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{body}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Process · 4-step pipeline on a line ───────────────────────────── */

function Process() {
  return (
    <section id="fonctionnement" className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 pt-14 pb-16 md:px-10 md:pt-20 md:pb-24">
        <div className="max-w-2xl">
          <h2 className="hl-h2 hl-inview text-balance">De votre vivier à un positionnement, en quatre temps.</h2>
          <p className="hl-inview mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Un enchaînement sans ressaisie : ce que vous importez devient des fiches
            structurées, puis des positionnements concrets, chacun avec son score.
          </p>
        </div>

        <ol className="hl-inview relative mt-14 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[1.375rem] hidden h-px bg-border lg:block" />
          {STEPS.map((s) => (
            <li key={s.title} className="relative flex flex-col">
              <span className="relative grid size-11 place-items-center rounded-md bg-card text-primary ring-1 ring-primary/30 ring-offset-1 ring-offset-background" aria-hidden>
                <s.icon className="size-5" strokeWidth={1.8} />
              </span>
              <h3 className="hl-serif mt-5 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ─── Value · narrative + stop/gain ─────────────────────────────────── */

function Value() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-16 md:px-10 md:py-24">
        <div className="grid grid-cols-1 items-start gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] md:gap-16">
          <div className="hl-inview">
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              La barrière du temps
            </p>
            <h2 className="hl-h2 text-balance">
              Moins de manuel. <span className="text-primary">Plus de placements.</span>
            </h2>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-muted-foreground">
              Le staffing classique multiplie les copier-coller, les fichiers et les
              angles morts. Esneo enlève la ressaisie pour vous rendre le temps de
              placer vos consultants.
            </p>
          </div>

          <div className="hl-inview grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            <div className="bg-card p-6">
              <p className="text-sm font-medium text-muted-foreground">Ce que vous arrêtez</p>
              <ul className="mt-4 space-y-3">
                {STOP.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm leading-snug text-muted-foreground">
                    <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card p-6">
              <p className="text-sm font-medium text-primary">Ce que vous gagnez</p>
              <ul className="mt-4 space-y-3">
                {GAIN.map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm leading-snug text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Security · 3 cards divided ────────────────────────────────────── */

function Security() {
  return (
    <section id="securite" className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 pt-14 pb-6 md:px-10 md:pt-20">
        <div className="max-w-2xl">
          <h2 className="hl-h2 hl-inview text-balance">L’IA travaille. Vous gardez la main.</h2>
          <p className="hl-inview mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
            Esneo est pensé pour des données sensibles : cloisonnement, droits et
            relecture humaine par défaut.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pb-16 md:px-10 md:pb-20">
        <div className="hl-inview grid grid-cols-1 divide-y divide-border md:grid-cols-3 md:divide-x md:divide-y-0">
          {SECURITY.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className={`flex flex-col pt-8 pb-2 md:pt-0 ${i === 0 ? 'md:pr-10' : i === 1 ? 'md:px-10' : 'md:pl-10'}`}>
              <span className="grid size-11 place-items-center rounded-md bg-card text-primary ring-1 ring-primary/30 ring-offset-1 ring-offset-background" aria-hidden>
                <Icon className="size-5" strokeWidth={1.8} />
              </span>
              <h3 className="hl-serif mt-5 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Manifesto · accent band, the founding line ────────────────────── */

function Manifesto() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-20 md:px-10 md:py-28">
        <p className="hl-serif max-w-3xl text-balance text-[clamp(1.75rem,5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight">
          L’IA propose. <span className="text-primary-foreground/60">Vous validez.</span>
        </p>

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
          <div>
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary-foreground/70">
              Ce que l’IA fait
            </h3>
            <ul>
              {AI_DOES.map((item) => (
                <li key={item} className="flex items-start gap-3 border-t border-primary-foreground/15 py-3">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary-foreground" aria-hidden />
                  <span className="text-sm leading-snug text-primary-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary-foreground/70">
              Ce qu’elle ne fera jamais
            </h3>
            <ul>
              {AI_NEVER.map((item) => (
                <li key={item} className="flex items-start gap-3 border-t border-primary-foreground/15 py-3">
                  <Minus className="mt-0.5 size-4 shrink-0 text-primary-foreground/50" aria-hidden />
                  <span className="text-sm leading-snug text-primary-foreground/70">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Statement · serif editorial line (no fake attribution) ────────── */

function Statement() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-20 text-center md:px-10 md:py-28">
      <p className="hl-serif hl-inview text-balance text-[clamp(1.5rem,3.5vw,2.25rem)] font-normal leading-snug tracking-tight">
        Esneo n’automatise pas votre métier. Il enlève la ressaisie pour vous rendre
        le temps de l’exercer.
      </p>
    </section>
  );
}

/* ─── Final CTA ─────────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-6 py-20 md:flex-row md:items-center md:justify-between md:px-10 md:py-24">
        <h2 className="hl-h2 hl-inview max-w-xl text-balance">Voyez Esneo sur vos propres CVs.</h2>
        <Show when="signed-out">
          <Button
            className="h-12 shrink-0 rounded-full px-7 text-[0.95rem] font-semibold"
            nativeButton={false}
            render={<Link href="/sign-up" />}
          >
            Réserver une démo
            <ArrowRight className="size-4" />
          </Button>
        </Show>
        <Show when="signed-in">
          <Button
            className="h-12 shrink-0 rounded-full px-7 text-[0.95rem] font-semibold"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Accéder au dashboard
            <ArrowRight className="size-4" />
          </Button>
        </Show>
      </div>
    </section>
  );
}

/* ─── Footer · minimal ──────────────────────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-6 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground">e</span>
            Esneo
          </span>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Pied de page">
            <a href="#capacites" className="text-muted-foreground transition-colors hover:text-foreground">Capacités</a>
            <a href="#securite" className="text-muted-foreground transition-colors hover:text-foreground">Sécurité</a>
            <Show when="signed-out">
              <Link href="/sign-in" className="text-muted-foreground transition-colors hover:text-foreground">Se connecter</Link>
              <Link href="/sign-up" className="text-muted-foreground transition-colors hover:text-foreground">Créer un compte</Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">Mon dashboard</Link>
            </Show>
          </nav>
        </div>

        <p className="mt-6 max-w-2xl text-pretty text-xs leading-relaxed text-muted-foreground">
          Esneo assiste l’extraction, l’analyse et le positionnement. L’IA propose,
          vous validez : chaque organisation dispose d’un espace isolé et d’un accès
          géré par rôle.
        </p>
        <p className="mt-4 text-xs text-muted-foreground/60">© 2026 Esneo</p>
      </div>
    </footer>
  );
}
