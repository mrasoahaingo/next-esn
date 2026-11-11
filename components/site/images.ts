/**
 * Photos des pages publiques — source unique des chemins, dimensions et textes
 * de remplacement. Toutes sont générées par IA (GPT Image 2.6 via l'AI Gateway,
 * prompts dans `docs/media/esneo/prompts/`) : scènes d'illustration du monde des
 * ESN, personnes anonymes, jamais présentées comme des clients ni comme l'équipe.
 */
export type SitePhoto = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

export const PHOTOS = {
  hero: {
    src: '/media/esneo/hero-droite.webp',
    width: 2000,
    height: 1125,
    alt: 'À l’heure bleue, dans un bureau en étage à La Défense, une ingénieure d’affaires au téléphone se tient près de la baie vitrée, face aux tours éclairées ; des CV imprimés attendent sur la table.',
  },
  staffing: {
    src: '/media/esneo/staffing.webp',
    width: 1536,
    height: 1024,
    alt: 'Point staffing du lundi matin : quatre collègues autour d’une table en chêne, l’un montre un écran mural, CV imprimés et cafés sur la table, toits de Paris derrière les fenêtres.',
  },
  esplanade: {
    src: '/media/esneo/esplanade-hd.webp',
    width: 2000,
    height: 1500,
    alt: 'Un ingénieur d’affaires en manteau traverse l’esplanade de La Défense au petit matin, téléphone à l’oreille, une pochette à la main.',
  },
  consultant: {
    src: '/media/esneo/consultant-hd.webp',
    width: 2000,
    height: 1500,
    alt: 'Un consultant, sac sur l’épaule et badge visiteur à la main, traverse le hall vitré d’un siège bancaire pour son premier jour chez le client.',
  },
  dossier: {
    src: '/media/esneo/dossier-anonyme.webp',
    width: 1536,
    height: 1024,
    alt: 'Une chargée de recrutement relit, stylo en main, un dossier de compétences anonymisé imprimé sur deux pages, à côté de son ordinateur et d’un café.',
  },
  connexion: {
    src: '/media/esneo/connexion-cour.webp',
    width: 1024,
    height: 1536,
    alt: 'Tôt le matin, une ingénieure d’affaires relit un CV imprimé à son bureau, face à une cour haussmannienne en automne.',
  },
  inscription: {
    src: '/media/esneo/inscription.webp',
    width: 1024,
    height: 1536,
    alt: 'Une chargée de recrutement et un développeur passent en revue un profil de candidat, debout autour d’une table haute.',
  },
  fin: {
    src: '/media/esneo/fin-ecran.webp',
    width: 1024,
    height: 1536,
    alt: 'En fin d’après-midi, les mains d’une ingénieure d’affaires sur son ordinateur, un dossier de compétences imprimé à côté ; derrière, un consultant, veste sur le bras, prêt à partir en mission.',
  },
  bureau: {
    src: '/media/esneo/bureau-hd.webp',
    width: 2000,
    height: 2000,
    alt: 'Vu de dessus, un bureau en chêne dans la lumière du matin : ordinateur fermé, CV imprimé, stylo et café, façade haussmannienne derrière la vitre.',
  },
  couloir: {
    src: '/media/esneo/couloir.webp',
    width: 2000,
    height: 1125,
    alt: 'Un long couloir de bureaux le soir, bordé de salles de réunion vitrées, le sol de béton ciré reflète la lumière bleue.',
  },
} satisfies Record<string, SitePhoto>;

export const PHOTO_CREDIT = 'Photographies générées par IA : scènes d’illustration, personnes fictives.';
