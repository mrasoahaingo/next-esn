import { Landing } from '@/components/marketing/landing';

const TITLE = 'Esneo — Du CV au positionnement, piloté par l’IA';
const DESCRIPTION =
  'La plateforme des ESN pour extraire les CVs, analyser les missions et positionner les consultants — avec un feedback clair et fiable à chaque étape.';

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
