import { SignIn } from '@clerk/nextjs';
import { AuthScreen, borderlessAppearance } from '@/components/auth/auth-screen';
import { PHOTOS } from '@/components/site/images';

export default function SignInPage() {
  return (
    <AuthScreen
      title="Reprenez le fil de vos positionnements."
      lede="Retrouvez les CV de vos consultants, vos analyses de missions et vos positionnements, chacun avec son statut."
      photo={PHOTOS.connexion}
    >
      <SignIn appearance={borderlessAppearance} />
    </AuthScreen>
  );
}
