export type PositioningGenerateBranch =
  | 'tailoredCv'
  | 'email'
  | 'emailFirstContact'
  | 'emailBulletPoints'
  | 'candidateEmail';

/** `all` : flux historique / compat ; le client utilise `cv` ou `emails`. */
export type PositioningGenerateMode = 'cv' | 'emails' | 'all';

export type PositioningGenerateStreamMeta = {
  phase?: 'generating';
  activeBranches?: PositioningGenerateBranch[];
  generateMode?: PositioningGenerateMode;
};
