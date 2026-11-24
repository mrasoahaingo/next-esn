import type { Metadata } from 'next';
import { SignUp } from '@clerk/nextjs';
import { AuthScreen, authAppearance } from '@/components/auth/auth-screen';
import { PHOTOS } from '@/components/site/images';

export const metadata: Metadata = {
  title: 'Créer votre compte · Esneo',
  description:
    'Créez l’espace de votre ESN ou de votre cabinet sur Esneo : CV structurés, fiches de poste ou de mission décortiquées, positionnements préparés. Sans carte bancaire.',
};

export default function SignUpPage() {
  return (
    <AuthScreen
      title="Créez l’espace de votre équipe."
      lede="ESN ou cabinet : CV structurés, fiches de poste ou de mission décortiquées, positionnements préparés. Vous relisez, vous validez. Sans carte bancaire."
      photo={PHOTOS.inscription}
      photoPosition={{ band: '50% 16%', panel: '50% 18%' }}
      credit="Photographie générée par IA, personnes fictives"
      formTitle="Créer votre compte"
      formLabel="Inscription"
      formMinHeight="32.25rem"
      formNote="Sans carte bancaire."
    >
      <SignUp appearance={authAppearance} />
    </AuthScreen>
  );
}
