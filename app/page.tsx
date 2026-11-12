import { Landing } from '@/components/landing/landing';

const TITLE = 'Esneo — Moins de paperasse. Plus de face-à-face.';
const DESCRIPTION =
  'Pour les ESN et les cabinets : Esneo lit les CV, décortique les fiches de poste ou de mission et prépare les positionnements. Vous relisez, vous validez, et le temps gagné va à vos candidats, consultants et clients.';

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
