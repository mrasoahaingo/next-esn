export type CvLanguage = 'fr' | 'en';

const FR_WORDS = [
  'expérience',
  'formation',
  'compétences',
  'entreprise',
  'poste',
  'responsable',
  'développeur',
  'chef',
  'gestion',
  'équipe',
  'projet',
  'stage',
  'diplôme',
  'niveau',
  'français',
  'notre',
  'pour',
  'avec',
  'dans',
];

const EN_WORDS = [
  'experience',
  'education',
  'skills',
  'company',
  'position',
  'manager',
  'developer',
  'team',
  'project',
  'responsible',
  'degree',
  'level',
  'english',
  'our',
  'with',
  'and',
  'the',
  'for',
];

/**
 * Détecte la langue principale d'un CV à partir de son texte brut.
 * Heuristique légère : compte les mots-clés FR et EN les plus fréquents
 * dans les CVs, retourne 'fr' par défaut si aucun signal clair.
 */
export function detectCvLanguage(text: string): CvLanguage {
  if (!text.trim()) return 'fr';

  const lower = text.toLowerCase();

  let frScore = 0;
  for (const word of FR_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lower.match(regex);
    if (matches) frScore += matches.length;
  }

  let enScore = 0;
  for (const word of EN_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lower.match(regex);
    if (matches) enScore += matches.length;
  }

  return enScore > frScore * 1.2 ? 'en' : 'fr';
}
