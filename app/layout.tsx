import type { Metadata } from "next";
import { Geist, Geist_Mono, Hanken_Grotesk } from "next/font/google";
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

// Pages publiques (landing, connexion, inscription, 404 — `.es`, app/esneo-site.css) :
// Hanken Grotesk 400/500 porte la voix ; les fragments d'interface gardent Geist,
// la police du produit. Voir DESIGN.md.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Champs Clerk sans texte indicatif (le libellé suffit) ; « Create a password »
// venait d'une clé absente de frFR.
const clerkLocalization = {
  ...frFR,
  formFieldInputPlaceholder__signUpPassword: '',
  formFieldInputPlaceholder__password: '',
  formFieldInputPlaceholder__emailAddress: '',
} as typeof frFR;

export const metadata: Metadata = {
  title: "Esneo",
  description: "Automatisation de CVs et positionnement",
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
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hanken.variable} app-surface antialiased`}
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
