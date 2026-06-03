/** Métadonnées NDJSON pour le flux d’extraction CV (optionnel sur chaque ligne). */
export type CvExtractionBranch = 'identity' | 'experiences' | 'education' | 'skills';

export type CvExtractionStreamMeta = {
  phase?: 'transcription' | 'reading' | 'extracting';
  /** Branches parallèles encore en cours de streaming */
  activeBranches?: CvExtractionBranch[];
  /** Branches dont le stream LLM est terminé (avec ou sans donnée produite) */
  completedBranches?: CvExtractionBranch[];
  /** Progression transcription PDF (caractères accumulés) */
  transcriptionChars?: number;
};
