import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Himeo CV Automation",
  description: "Automatisation de CVs et positionnement pour Himeo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider
          afterSignOutUrl="/sign-in"
          localization={frFR}
          appearance={{
            variables: {
              colorPrimary: '#8b5cf6',
              colorBackground: '#0c0c0f',
              colorInputBackground: '#18181b',
              colorInputText: '#fafafa',
              colorText: '#fafafa',
              colorTextSecondary: '#a1a1aa',
            },
            elements: {
              card: 'bg-panel border border-white/10 shadow-xl',
              formButtonPrimary: 'bg-violet hover:bg-violet/90',
              footerActionLink: 'text-violet hover:text-violet/80',
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
