'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/lib/hooks/use-onboarding';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Inline SVG illustrations — small scenes for each onboarding step  */
/* ------------------------------------------------------------------ */

function IllustrationWelcome({ accent }: { accent: string }) {
  const neon = accent === 'neon';
  const main = neon ? 'var(--neon)' : 'var(--violet)';
  const soft = neon ? 'var(--neon)' : 'var(--violet)';
  return (
    <svg viewBox="0 0 280 140" fill="none" className="w-full h-auto">
      {/* Background grid */}
      <defs>
        <pattern id="grid-w" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={main} strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="280" height="140" fill="url(#grid-w)" rx="12" />
      {/* Central card */}
      <rect x="80" y="20" width="120" height="100" rx="12" fill={main} fillOpacity="0.08" stroke={main} strokeOpacity="0.2" strokeWidth="1" />
      {/* Sparkle elements */}
      <circle cx="140" cy="58" r="18" fill={main} fillOpacity="0.15" />
      <path d="M140 44 l3 10 10 3-10 3-3 10-3-10-10-3 10-3z" fill={soft} fillOpacity="0.7" />
      {/* Text lines */}
      <rect x="108" y="84" width="64" height="5" rx="2.5" fill={main} fillOpacity="0.2" />
      <rect x="116" y="94" width="48" height="4" rx="2" fill={main} fillOpacity="0.12" />
      {/* Floating dots */}
      <circle cx="48" cy="36" r="4" fill={main} fillOpacity="0.25" />
      <circle cx="36" cy="100" r="6" fill={soft} fillOpacity="0.15" />
      <circle cx="240" cy="44" r="5" fill={main} fillOpacity="0.2" />
      <circle cx="248" cy="108" r="3" fill={soft} fillOpacity="0.3" />
      {/* Connection lines */}
      <line x1="52" y1="38" x2="80" y2="50" stroke={main} strokeOpacity="0.1" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="200" y1="60" x2="236" y2="46" stroke={main} strokeOpacity="0.1" strokeWidth="0.8" strokeDasharray="3 3" />
    </svg>
  );
}

function IllustrationUpload({ accent }: { accent: string }) {
  const neon = accent === 'neon';
  const main = neon ? 'var(--neon)' : 'var(--violet)';
  return (
    <svg viewBox="0 0 280 140" fill="none" className="w-full h-auto">
      <defs>
        <pattern id="grid-u" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={main} strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="280" height="140" fill="url(#grid-u)" rx="12" />
      {/* Drop zone */}
      <rect x="70" y="16" width="140" height="108" rx="14" fill={main} fillOpacity="0.06" stroke={main} strokeOpacity="0.2" strokeWidth="1.2" strokeDasharray="6 4" />
      {/* Document icon */}
      <rect x="112" y="32" width="40" height="52" rx="4" fill={main} fillOpacity="0.12" stroke={main} strokeOpacity="0.25" strokeWidth="0.8" />
      <path d="M138 32 l14 14h-10a4 4 0 01-4-4z" fill={main} fillOpacity="0.18" />
      {/* Text lines on doc */}
      <rect x="120" y="54" width="24" height="3" rx="1.5" fill={main} fillOpacity="0.2" />
      <rect x="120" y="60" width="18" height="3" rx="1.5" fill={main} fillOpacity="0.14" />
      <rect x="120" y="66" width="22" height="3" rx="1.5" fill={main} fillOpacity="0.14" />
      {/* Upload arrow */}
      <path d="M140 100 l0-10m-6 4 l6-6 6 6" stroke={main} strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Format badges */}
      <rect x="100" y="112" width="32" height="14" rx="4" fill={main} fillOpacity="0.12" />
      <text x="116" y="122" textAnchor="middle" fill={main} fillOpacity="0.5" fontSize="8" fontWeight="600">PDF</text>
      <rect x="140" y="112" width="40" height="14" rx="4" fill={main} fillOpacity="0.12" />
      <text x="160" y="122" textAnchor="middle" fill={main} fillOpacity="0.5" fontSize="8" fontWeight="600">DOCX</text>
      {/* Floating elements */}
      <circle cx="42" cy="50" r="4" fill={main} fillOpacity="0.2" />
      <circle cx="244" cy="90" r="5" fill={main} fillOpacity="0.15" />
    </svg>
  );
}

function IllustrationEdit({ accent }: { accent: string }) {
  const neon = accent === 'neon';
  const main = neon ? 'var(--neon)' : 'var(--violet)';
  return (
    <svg viewBox="0 0 280 140" fill="none" className="w-full h-auto">
      <defs>
        <pattern id="grid-e" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={main} strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="280" height="140" fill="url(#grid-e)" rx="12" />
      {/* Left panel — form */}
      <rect x="24" y="18" width="108" height="104" rx="8" fill={main} fillOpacity="0.06" stroke={main} strokeOpacity="0.15" strokeWidth="0.8" />
      <rect x="34" y="30" width="50" height="5" rx="2.5" fill={main} fillOpacity="0.25" />
      <rect x="34" y="42" width="88" height="8" rx="3" fill={main} fillOpacity="0.08" stroke={main} strokeOpacity="0.12" strokeWidth="0.6" />
      <rect x="34" y="56" width="40" height="5" rx="2.5" fill={main} fillOpacity="0.25" />
      <rect x="34" y="68" width="88" height="8" rx="3" fill={main} fillOpacity="0.08" stroke={main} strokeOpacity="0.12" strokeWidth="0.6" />
      <rect x="34" y="82" width="56" height="5" rx="2.5" fill={main} fillOpacity="0.25" />
      <rect x="34" y="94" width="88" height="8" rx="3" fill={main} fillOpacity="0.08" stroke={main} strokeOpacity="0.12" strokeWidth="0.6" />
      {/* Divider */}
      <line x1="140" y1="24" x2="140" y2="116" stroke={main} strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 3" />
      {/* Right panel — PDF preview */}
      <rect x="148" y="18" width="108" height="104" rx="8" fill={main} fillOpacity="0.06" stroke={main} strokeOpacity="0.15" strokeWidth="0.8" />
      {/* PDF header bar */}
      <rect x="156" y="26" width="92" height="14" rx="3" fill={main} fillOpacity="0.12" />
      <rect x="162" y="31" width="40" height="4" rx="2" fill={main} fillOpacity="0.3" />
      {/* PDF content lines */}
      <rect x="156" y="48" width="70" height="3" rx="1.5" fill={main} fillOpacity="0.15" />
      <rect x="156" y="56" width="86" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      <rect x="156" y="64" width="60" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      <rect x="156" y="76" width="50" height="3" rx="1.5" fill={main} fillOpacity="0.15" />
      <rect x="156" y="84" width="80" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      <rect x="156" y="92" width="72" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      <rect x="156" y="100" width="55" height="3" rx="1.5" fill={main} fillOpacity="0.08" />
      {/* Sync arrows */}
      <path d="M136 62 l-6-4 0 8z" fill={main} fillOpacity="0.3" />
      <path d="M144 72 l6 4 0-8z" fill={main} fillOpacity="0.3" />
    </svg>
  );
}

function IllustrationPositioning({ accent }: { accent: string }) {
  const neon = accent === 'neon';
  const main = neon ? 'var(--neon)' : 'var(--violet)';
  return (
    <svg viewBox="0 0 280 140" fill="none" className="w-full h-auto">
      <defs>
        <pattern id="grid-p" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={main} strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="280" height="140" fill="url(#grid-p)" rx="12" />
      {/* Left — Candidate card */}
      <rect x="24" y="30" width="80" height="80" rx="10" fill={main} fillOpacity="0.08" stroke={main} strokeOpacity="0.18" strokeWidth="0.8" />
      <circle cx="64" cy="54" r="10" fill={main} fillOpacity="0.15" />
      <rect x="44" y="70" width="40" height="4" rx="2" fill={main} fillOpacity="0.2" />
      <rect x="38" y="80" width="52" height="3" rx="1.5" fill={main} fillOpacity="0.12" />
      <rect x="42" y="88" width="44" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      {/* Right — Mission card */}
      <rect x="176" y="30" width="80" height="80" rx="10" fill={main} fillOpacity="0.08" stroke={main} strokeOpacity="0.18" strokeWidth="0.8" />
      <rect x="192" y="44" width="48" height="5" rx="2.5" fill={main} fillOpacity="0.2" />
      <rect x="188" y="56" width="56" height="3" rx="1.5" fill={main} fillOpacity="0.12" />
      <rect x="190" y="64" width="50" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      <rect x="192" y="72" width="44" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      <rect x="188" y="84" width="30" height="10" rx="5" fill={main} fillOpacity="0.15" />
      <text x="203" y="92" textAnchor="middle" fill={main} fillOpacity="0.5" fontSize="7" fontWeight="600">87%</text>
      {/* Center — matching link */}
      <circle cx="140" cy="70" r="20" fill={main} fillOpacity="0.1" stroke={main} strokeOpacity="0.2" strokeWidth="1" />
      <path d="M133 70 l4 4 8-10" stroke={main} strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Connection lines */}
      <line x1="104" y1="70" x2="120" y2="70" stroke={main} strokeOpacity="0.2" strokeWidth="1.2" />
      <line x1="160" y1="70" x2="176" y2="70" stroke={main} strokeOpacity="0.2" strokeWidth="1.2" />
      {/* Skill dots */}
      <circle cx="130" cy="46" r="3" fill={main} fillOpacity="0.3" />
      <circle cx="152" cy="42" r="2.5" fill={main} fillOpacity="0.2" />
      <circle cx="126" cy="96" r="2.5" fill={main} fillOpacity="0.2" />
      <circle cx="156" cy="94" r="3" fill={main} fillOpacity="0.25" />
    </svg>
  );
}

function IllustrationExport({ accent }: { accent: string }) {
  const neon = accent === 'neon';
  const main = neon ? 'var(--neon)' : 'var(--violet)';
  return (
    <svg viewBox="0 0 280 140" fill="none" className="w-full h-auto">
      <defs>
        <pattern id="grid-x" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={main} strokeOpacity="0.06" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="280" height="140" fill="url(#grid-x)" rx="12" />
      {/* PDF document */}
      <rect x="90" y="14" width="72" height="92" rx="6" fill={main} fillOpacity="0.08" stroke={main} strokeOpacity="0.2" strokeWidth="0.8" />
      {/* PDF header with brand bar */}
      <rect x="96" y="20" width="60" height="16" rx="3" fill={main} fillOpacity="0.18" />
      <circle cx="106" cy="28" r="4" fill={main} fillOpacity="0.3" />
      <rect x="114" y="25" width="34" height="4" rx="2" fill={main} fillOpacity="0.25" />
      {/* PDF content */}
      <rect x="96" y="42" width="50" height="3" rx="1.5" fill={main} fillOpacity="0.15" />
      <rect x="96" y="50" width="56" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      <rect x="96" y="58" width="40" height="3" rx="1.5" fill={main} fillOpacity="0.1" />
      <rect x="96" y="70" width="44" height="3" rx="1.5" fill={main} fillOpacity="0.12" />
      <rect x="96" y="78" width="52" height="3" rx="1.5" fill={main} fillOpacity="0.08" />
      <rect x="96" y="86" width="36" height="3" rx="1.5" fill={main} fillOpacity="0.08" />
      {/* Email envelope */}
      <rect x="174" y="36" width="64" height="44" rx="6" fill={main} fillOpacity="0.08" stroke={main} strokeOpacity="0.18" strokeWidth="0.8" />
      <path d="M180 42 l26 18 26-18" stroke={main} strokeOpacity="0.25" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="190" y="60" width="32" height="3" rx="1.5" fill={main} fillOpacity="0.12" />
      <rect x="194" y="67" width="24" height="3" rx="1.5" fill={main} fillOpacity="0.08" />
      {/* Arrow from PDF to email */}
      <path d="M162 58 l6 0m-2-3 l4 3-4 3" stroke={main} strokeOpacity="0.3" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Download arrow below PDF */}
      <path d="M126 114 l0-6m-5 2 l5 5 5-5" stroke={main} strokeOpacity="0.5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Checkmark badge */}
      <circle cx="166" y="22" r="10" fill={main} fillOpacity="0.15" />
      <path d="M162 22 l3 3 6-7" stroke={main} strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Floating elements */}
      <circle cx="46" cy="40" r="4" fill={main} fillOpacity="0.2" />
      <circle cx="54" cy="110" r="3" fill={main} fillOpacity="0.15" />
      <circle cx="252" cy="100" r="5" fill={main} fillOpacity="0.12" />
    </svg>
  );
}

const ILLUSTRATIONS = [
  IllustrationWelcome,
  IllustrationUpload,
  IllustrationEdit,
  IllustrationPositioning,
  IllustrationExport,
];

/* ------------------------------------------------------------------ */
/*  Steps data                                                         */
/* ------------------------------------------------------------------ */

interface Step {
  title: string;
  description: string;
  details: string[];
  accent: 'neon' | 'violet';
}

const STEPS: Step[] = [
  {
    title: 'Bienvenue sur Esneo',
    description:
      'Automatisez la mise en forme de vos CV et le positionnement de vos candidats en quelques clics.',
    details: [
      'Extraction intelligente des données de CV par IA',
      'Positionnement automatisé sur vos missions clients',
      'Export PDF aux couleurs de votre cabinet',
      'Emails de présentation générés et prêts à envoyer',
    ],
    accent: 'violet',
  },
  {
    title: 'Importez vos CV',
    description:
      'Glissez-déposez un CV au format PDF ou DOCX depuis le tableau de bord ou la barre latérale.',
    details: [
      'Formats supportés : PDF et DOCX',
      "L'IA extrait automatiquement les expériences, compétences et formations",
      'Suivi de la progression en temps réel avec streaming',
      'Retrouvez tous vos candidats dans la barre latérale',
    ],
    accent: 'neon',
  },
  {
    title: 'Éditez & prévisualisez',
    description:
      'Relisez les données extraites, corrigez si besoin, et visualisez le rendu PDF en direct.',
    details: [
      'Vue splitée : formulaire éditable à gauche, aperçu PDF à droite',
      'Compétences, expériences, formations et résumé modifiables',
      'Le PDF se met à jour instantanément à chaque modification',
      'Mettez en avant les compétences clés avec les étoiles',
    ],
    accent: 'violet',
  },
  {
    title: 'Positionnez vos candidats',
    description:
      "Créez une mission, lancez l'analyse IA et obtenez un CV taillé sur mesure avec des emails prêts à envoyer.",
    details: [
      'Décrivez la mission et laissez l\'IA analyser le matching',
      'Score de compatibilité automatique (compétences, expériences, gaps)',
      'CV adapté à la mission généré automatiquement',
      'Emails de présentation client et candidat prêts à copier',
    ],
    accent: 'neon',
  },
  {
    title: 'Exportez & envoyez',
    description:
      'Téléchargez le PDF formaté aux couleurs de votre organisation et partagez-le avec vos clients.',
    details: [
      'Template personnalisable : logo, couleurs, pied de page, sections',
      'Export PDF en un clic depuis la fiche candidat ou le positionnement',
      'Historique complet de tous vos positionnements et exports',
      'Statistiques de temps gagné et de score moyen sur le dashboard',
    ],
    accent: 'violet',
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OnboardingModal() {
  const { completed, markCompleted } = useOnboarding();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!completed) {
      const timer = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(timer);
    }
  }, [completed]);

  function handleClose() {
    setOpen(false);
    markCompleted();
    setStep(0);
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleClose();
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  const current = STEPS[step];
  const Illustration = ILLUSTRATIONS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent
        className="sm:max-w-lg bg-panel border-overlay/10 overflow-hidden p-0"
        showCloseButton
      >
        {/* Accent glow */}
        <div
          className={cn(
            'pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-48 rounded-full opacity-25 blur-3xl',
            current.accent === 'neon' ? 'bg-neon' : 'bg-violet'
          )}
        />

        {/* Illustration */}
        <div className="relative px-6 pt-5">
          <div className="rounded-xl overflow-hidden border border-overlay/5 bg-background/40">
            <Illustration accent={current.accent} />
          </div>
        </div>

        {/* Content */}
        <div className="relative px-6 pt-3 pb-2">
          <DialogHeader className="items-center text-center">
            <DialogTitle className="text-lg">{current.title}</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm leading-relaxed max-w-sm mx-auto">
              {current.description}
            </DialogDescription>
          </DialogHeader>

          {/* Details */}
          <ul className="mt-4 space-y-2">
            {current.details.map((detail) => (
              <li key={detail} className="flex items-start gap-2.5 text-sm">
                <div
                  className={cn(
                    'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md',
                    current.accent === 'neon'
                      ? 'bg-neon/10 text-neon'
                      : 'bg-violet/10 text-violet'
                  )}
                >
                  <Check className="size-3" strokeWidth={2.5} />
                </div>
                <span className="text-foreground/80">{detail}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === step
                  ? cn(
                      'w-6',
                      current.accent === 'neon' ? 'bg-neon' : 'bg-violet'
                    )
                  : 'w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40'
              )}
              aria-label={`Étape ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer — custom div instead of DialogFooter to control padding */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-6 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-muted-foreground"
          >
            Passer
          </Button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={prev}>
                <ArrowLeft className="size-3.5" data-icon="inline-start" />
                Précédent
              </Button>
            )}
            <Button
              size="sm"
              onClick={next}
              className={cn(
                isLast &&
                  'bg-neon text-neon-foreground hover:bg-neon/90 dark:text-background'
              )}
            >
              {isLast ? "C'est parti !" : 'Suivant'}
              {!isLast && (
                <ArrowRight className="size-3.5" data-icon="inline-end" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
