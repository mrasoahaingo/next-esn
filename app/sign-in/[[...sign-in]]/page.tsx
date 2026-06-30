import { SignIn } from '@clerk/nextjs';
import { AuthScreen, borderlessAppearance } from '@/components/auth/auth-screen';

export default function SignInPage() {
  return (
    <AuthScreen
      kicker="Plateforme IA pour les ESN"
      title="Reprenez le fil de vos"
      accent="positionnements."
      lede="Connectez-vous pour retrouver vos CVs de consultants, vos analyses de missions et vos positionnements assistés par l’IA."
    >
      <SignIn appearance={borderlessAppearance} />
    </AuthScreen>
  );
}
