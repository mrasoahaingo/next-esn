import { Landing } from '@/components/landing/landing';

const TITLE = 'Esneo — Vous choisissez le profil. Esneo fait le dossier.';
const DESCRIPTION =
  'Pour les chasseurs de têtes, ingénieurs d’affaires et chargés de recrutement : Esneo lit le CV et la fiche de poste ou de mission, prépare le positionnement, le CV adapté et les e-mails. Vous relisez, vous validez.';

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
