import type { Metadata } from "next";
import { Albert_Sans, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { AuthQuerySync } from "@/components/auth-query-sync";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Pages publiques (landing, connexion, inscription, 404 — `.eg`, app/landing.css) :
// Albert Sans porte la voix ; l'interface garde Geist. Voir DESIGN.md.
const albert = Albert_Sans({
  variable: "--font-albert",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Champs Clerk sans texte indicatif (le libellé suffit) ; « Create a password »
// venait d'une clé absente de frFR. Les messages d'erreur les plus vus sont
// réécrits en français courant (frFR les calque sur l'anglais).
const clerkLocalization = {
  ...frFR,
  formFieldInputPlaceholder__signUpPassword: '',
  formFieldInputPlaceholder__password: '',
  formFieldInputPlaceholder__emailAddress: '',
  unstable__errors: {
    ...frFR.unstable__errors,
    form_identifier_not_found: 'Aucun compte n’utilise cette adresse. Vérifiez-la ou créez un compte.',
    form_identifier_exists__email_address: 'Un compte utilise déjà cette adresse. Connectez-vous ou choisissez une autre adresse.',
    form_password_incorrect: 'Mot de passe incorrect. Réessayez ou réinitialisez-le.',
    form_password_or_identifier_incorrect: 'L’adresse e-mail ou le mot de passe est incorrect. Réessayez ou utilisez une autre méthode.',
    form_password_validation_failed: 'Mot de passe incorrect.',
    form_password_pwned: 'Ce mot de passe figure dans une fuite de données connue. Choisissez-en un autre.',
    form_password_pwned__sign_in: 'Ce mot de passe figure dans une fuite de données connue. Réinitialisez-le.',
    form_param_format_invalid__email_address: 'Saisissez une adresse e-mail valide.',
    form_param_nil: 'Ce champ est obligatoire.',
    form_code_incorrect: 'Code incorrect.',
  },
} as typeof frFR;

export const metadata: Metadata = {
  title: "Esneo",
  description:
    "Esneo lit les CV, décortique les fiches de poste ou de mission et prépare les positionnements des ESN et des cabinets. L’IA propose, vous validez.",
  icons: {
    icon: "/esneo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${albert.variable} app-surface antialiased`}
      >
        <ClerkProvider
          afterSignOutUrl="/sign-in"
          localization={clerkLocalization}
          appearance={{
            elements: {
              card: 'bg-card border border-border shadow-xl',
              formButtonPrimary: 'bg-accent text-accent-foreground hover:bg-accent/90',
              footerActionLink: 'text-accent hover:text-accent/80',
              formFieldInput: 'bg-secondary text-foreground border-border',
              formFieldLabel: 'text-foreground',
              headerTitle: 'text-foreground',
              headerSubtitle: 'text-muted-foreground',
              socialButtonsBlockButton: 'bg-secondary text-foreground border-border',
              dividerLine: 'bg-border',
              dividerText: 'text-muted-foreground',
              rootBox: 'text-foreground',
              internal: 'text-foreground',
            },
          }}
        >
        <QueryProvider>
        <AuthQuerySync />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AuthenticatedShell>{children}</AuthenticatedShell>
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
        </QueryProvider>
        </ClerkProvider>
        <Analytics />
      </body>
    </html>
  );
}
