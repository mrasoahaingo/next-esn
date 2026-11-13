import '@/app/landing.css';

import type { CSSProperties, ReactNode } from 'react';
import { AuthBrandPanel } from '@/components/auth/auth-brand-panel';
import { AuthFormA11y } from '@/components/auth/auth-form-a11y';
import type { SitePhoto } from '@/components/site/images';
import { fr } from '@/components/site/fr';

/**
 * Apparence Clerk des pages publiques (direction « Verre de nuit », voir DESIGN.md).
 * Clerk calcule ses nuances à partir de couleurs qu'il sait lire : ce sont donc les
 * équivalents sRGB des jetons OKLCH de app/landing.css (même nom, même rôle).
 */
const T = {
  paper: '#07090e', // --color-paper
  paper2: '#0d1017', // --color-paper-2
  paper4: '#222630', // --color-paper-4
  ink: '#edf0f6', // --color-ink
  ink2: '#c3c7d1', // --color-ink-2
  rule2: '#3d424d', // --color-rule-2
  accent: '#3266e4', // --color-accent
  accentHover: '#2456d3', // --color-accent-hover (5,9:1 sous texte blanc)
  accentText: '#90baff', // --color-accent-text
  focus: '#8cbdff', // --color-focus
  err: '#ff8880', // --color-err
} as const;

const FONT = 'var(--font-albert), "Albert Sans", ui-sans-serif, system-ui, sans-serif';

const ARROW_MASK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12h14'/%3E%3Cpath d='m12 5 7 7-7 7'/%3E%3C/svg%3E\")";

/** Champ bordé sur ses quatre côtés, 44 px, focus visible sans décalage. */
const field = {
  border: `1px solid ${T.rule2} !important`,
  borderRadius: 12,
  boxShadow: 'none !important',
  backgroundColor: T.paper2,
  color: T.ink,
  height: 44,
  minHeight: 44,
  outline: '2px solid transparent',
  outlineOffset: 2,
  '&:hover': { borderColor: `${T.ink2} !important` },
  '&:focus, &:focus-visible': { outline: `2px solid ${T.focus}`, outlineOffset: 2, borderColor: `${T.ink2} !important` },
  '&[aria-invalid="true"]': { borderColor: `${T.err} !important` },
  /* En erreur, l'anneau de focus prend la couleur d'erreur : un seul signal, pas rouge et bleu. */
  '&[aria-invalid="true"]:focus, &[aria-invalid="true"]:focus-visible': { outline: `2px solid ${T.err}` },
};

export const authAppearance = {
  variables: {
    colorPrimary: T.accent,
    colorText: T.ink,
    colorTextSecondary: T.ink2,
    colorBackground: T.paper,
    colorInputBackground: T.paper2,
    colorInputText: T.ink,
    colorDanger: T.err,
    colorNeutral: T.ink,
    fontFamily: FONT,
    fontFamilyButtons: FONT,
    borderRadius: '12px',
  },
  elements: {
    rootBox: { width: '100%', maxWidth: 400 },
    cardBox: { width: '100%', border: 'none', boxShadow: 'none', background: 'transparent', borderRadius: 0, overflow: 'visible' },
    card: { background: 'transparent', boxShadow: 'none', border: 'none', paddingInline: 0, paddingBlock: 8, overflow: 'visible' },
    logoBox: { display: 'none' },
    header: { display: 'none' },
    /* Clerk centre ses lignes de pied : alignées à gauche, comme le reste. */
    footer: {
      background: 'transparent',
      backgroundImage: 'none',
      borderTop: 'none',
      boxShadow: 'none',
      justifyContent: 'flex-start !important',
      alignItems: 'flex-start !important',
      textAlign: 'left',
      paddingInline: '0 !important',
      marginInlineStart: 0,
      '& > *': {
        borderTop: 'none',
        justifyContent: 'flex-start !important',
        textAlign: 'left',
        paddingInline: '0 !important',
        marginInlineStart: 0,
      },
    },
    /* « Secured by Clerk » : Clerk le centre dans des boîtes flex internes ; à gauche,
     * sur l'axe du formulaire (la colonne aligne à gauche, la dernière ligne garde
     * son centrage vertical entre le texte et le logo). */
    footerItem: {
      borderTop: 'none !important',
      textAlign: 'left',
      '& div': { justifyContent: 'flex-start !important', alignItems: 'flex-start !important', textAlign: 'left' },
      '& div:has(> a)': { alignItems: 'center !important' },
    },
    formButtonPrimary: {
      backgroundColor: T.accent,
      backgroundImage: 'none',
      color: '#ffffff',
      border: 'none',
      boxShadow: 'none !important',
      '&:focus': { boxShadow: 'none !important' },
      borderRadius: 999,
      height: 44,
      fontSize: 15,
      fontWeight: 600,
      textTransform: 'none',
      '&::after, &::before': { display: 'none' },
      /* La flèche de la landing (lucide arrow-right) à la place du triangle de Clerk. */
      '& > span': { display: 'inline-flex', alignItems: 'center', gap: 8 },
      '& > span::after': {
        content: '""',
        width: 16,
        height: 16,
        backgroundColor: 'currentColor',
        WebkitMask: `${ARROW_MASK} center / contain no-repeat`,
        mask: `${ARROW_MASK} center / contain no-repeat`,
      },
      '&:hover': { backgroundColor: T.accentHover },
      '&:focus-visible': { outline: `2px solid ${T.focus}`, outlineOffset: 3 },
    },
    /* Le triangle de Clerk laisse place à la flèche de la landing (app/landing.css). */
    buttonArrowIcon: { display: 'none' },
    formFieldInputShowPasswordButton: { minWidth: 44, minHeight: 44, borderRadius: 10 },
    socialButtonsBlockButton: {
      ...field,
      backgroundColor: T.paper2,
      justifyContent: 'flex-start !important',
      textAlign: 'left',
      '& > *': { justifyContent: 'flex-start !important', textAlign: 'left' },
      paddingInline: 14,
      '&:hover': { backgroundColor: T.paper4, borderColor: `${T.ink2} !important` },
    },
    socialButtonsBlockButtonText: { color: T.ink, fontWeight: 500 },
    dividerLine: { backgroundColor: T.rule2 },
    /* « ou » centré sur ses traits, avec une marge de chaque côté. */
    dividerText: { color: T.ink2, lineHeight: 1, margin: 0 },
    dividerRow: { alignItems: 'center', gap: 12 },
    footerAction: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      columnGap: 6,
      rowGap: 0,
      justifyContent: 'flex-start !important',
      textAlign: 'left',
      paddingInline: '0 !important',
      marginInlineStart: 0,
    },
    footerActionText: { color: T.ink2 },
    formFieldInput: field,
    formFieldLabel: { color: T.ink, fontWeight: 500 },
    /* Sous l'anneau de focus (2 px, décalé de 2 px), jamais dessous. */
    formFieldErrorText: { color: T.err, fontSize: 13, lineHeight: 1.4, paddingTop: 8 },
    formFieldSuccessText: { color: T.ink2 },
    alert: { backgroundColor: T.paper2, border: `1px solid ${T.err}`, borderRadius: 12 },
    alertText: { color: T.ink },
    footerActionLink: {
      display: 'inline-flex',
      alignItems: 'center',
      minHeight: 44,
      color: T.accentText,
      fontWeight: 600,
      '&:hover': { color: T.ink },
    },
    formFieldAction: { color: T.accentText },
    identityPreviewEditButton: { color: T.accentText },
  },
};

/** @deprecated garde le nom d'export historique pour les appelants existants. */
export const borderlessAppearance = authAppearance;

/**
 * Coquille d'authentification, dans la direction de la landing : sombre d'abord,
 * une photo du métier avec la promesse posée sur une vitre (le seul verre de la
 * page, puisqu'il recouvre la photo), puis la colonne du formulaire : son titre
 * (le seul h1), le formulaire Clerk aligné à gauche sur un halo azur, et la
 * phrase sur l'usage des données. Au téléphone, la photo devient une bande de
 * 9rem pour que le premier champ et « Continuer » tiennent dès l'arrivée.
 */
export function AuthScreen({
  title,
  lede,
  photo,
  photoPosition,
  credit = 'Photographie générée par IA, personne fictive',
  formTitle,
  formLabel,
  formMinHeight,
  formNote,
  children,
}: {
  title: string;
  lede: string;
  photo: SitePhoto;
  /** Cadrage de la photo (`object-position`) : bande du téléphone, panneau du bureau. */
  photoPosition?: { band?: string; panel?: string };
  credit?: string;
  /** Titre de la colonne du formulaire, seul h1 de la page. */
  formTitle: string;
  /** Nom de la région principale (« Connexion », « Inscription »). */
  formLabel: string;
  /** Hauteur réservée au formulaire Clerk, monté après le chargement du script (CLS nul). */
  formMinHeight?: string;
  /** Une ligne sous le titre, au téléphone seulement (au bureau, la vitre la porte déjà). */
  formNote?: string;
  children: ReactNode;
}): React.JSX.Element {
  const style = {
    '--auth-photo-band': photoPosition?.band,
    '--auth-photo-panel': photoPosition?.panel,
    '--auth-form-min': formMinHeight,
  } as CSSProperties;
  return (
    <div className="eg eg-auth" style={style}>
      <AuthBrandPanel title={title} lede={lede} photo={photo} credit={credit} />
      <main className="eg-auth__main" aria-label={formLabel}>
        <div className="eg-auth__form">
          <h1 className="eg-auth__h1">{formTitle}</h1>
          {formNote ? <p className="eg-auth__formnote">{fr(formNote)}</p> : null}
          <AuthFormA11y>{children}</AuthFormA11y>
          <div className="eg-auth__aside">
            <p className="eg-auth__note">
              {fr('Vos CV ne sont confiés à des modèles d’IA tiers que pour l’extraction, l’analyse et la rédaction.')}
            </p>
            <p className="eg-auth__credit">{credit}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
