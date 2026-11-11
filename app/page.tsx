import { Landing } from '@/components/marketing/landing';

const TITLE = 'Esneo — Du CV au positionnement, piloté par l’IA';
const DESCRIPTION =
  'La plateforme des ESN pour structurer les CV de vos consultants, analyser les besoins clients et proposer le bon positionnement. L’IA propose, vous validez.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Esneo',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

// The landing is public — accessible whether or not the user is signed in.
export default function HomePage() {
  return <Landing />;
}
