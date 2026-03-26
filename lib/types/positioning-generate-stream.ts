export type PositioningGenerateBranch =
  | 'tailoredCv'
  | 'email'
  | 'emailFirstContact'
  | 'emailBulletPoints'
  | 'candidateEmail'
  | 'expertiseConfirmations';

export type PositioningGenerateStreamMeta = {
  phase?: 'generating';
  activeBranches?: PositioningGenerateBranch[];
};
