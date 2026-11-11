import { SignUp } from '@clerk/nextjs';
import { AuthScreen, borderlessAppearance } from '@/components/auth/auth-screen';
import { PHOTOS } from '@/components/site/images';

export default function SignUpPage() {
  return (
    <AuthScreen
      title="Créez l’espace de votre ESN."
      lede="Extraction des CV, analyse des missions et score expliqué, avec une relecture humaine systématique."
      photo={PHOTOS.inscription}
    >
      <SignUp appearance={borderlessAppearance} />
    </AuthScreen>
  );
}
