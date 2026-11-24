import type { Metadata } from 'next';
import { SignIn } from '@clerk/nextjs';
import { AuthScreen, authAppearance } from '@/components/auth/auth-screen';
import { PHOTOS } from '@/components/site/images';

export const metadata: Metadata = {
  title: 'Se connecter · Esneo',
  description:
    'Connectez-vous à Esneo pour retrouver les CV de vos candidats et consultants, vos fiches de poste ou de mission et vos positionnements.',
};

export default function SignInPage() {
  return (
    <AuthScreen
      title="Reprenez le fil de vos positionnements."
      lede="Retrouvez les CV de vos candidats et consultants, vos fiches de poste ou de mission et vos positionnements, chacun avec son statut."
      photo={PHOTOS.connexion}
      /* Bureau : la photo remonte pour que la vitre laisse voir le CV papier qu'elle relit. */
      photoPosition={{ band: '50% 42%', panel: '50% 100%' }}
      credit="Photographie générée par IA, personne fictive"
      formTitle="Se connecter"
      formLabel="Connexion"
      formMinHeight="26.375rem"
    >
      <SignIn appearance={authAppearance} />
    </AuthScreen>
  );
}
