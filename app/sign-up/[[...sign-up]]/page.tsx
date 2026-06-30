import { SignUp } from '@clerk/nextjs';
import { AuthScreen, borderlessAppearance } from '@/components/auth/auth-screen';

export default function SignUpPage() {
  return (
    <AuthScreen
      kicker="Plateforme IA pour les ESN"
      title="Du CV au positionnement,"
      accent="piloté par l’IA."
      lede="Créez votre espace ESN : extraction des CVs, analyse des missions et matching expliqué, avec une relecture humaine par défaut."
    >
      <SignUp appearance={borderlessAppearance} />
    </AuthScreen>
  );
}
